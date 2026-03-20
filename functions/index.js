import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { createHash } from "node:crypto";

const recaptchaSecret = defineSecret("RECAPTCHA_SECRET_KEY");

const MIN_RECAPTCHA_SCORE_BY_ACTION = {
  sign_up: 0.5,
  sign_in: 0.3,
  google_sign_in: 0.3,
  one_shot_create: 0.3,
  one_shot_join: 0.3,
};
const ALLOWED_ACTIONS = new Set(["sign_up", "sign_in", "google_sign_in", "one_shot_create", "one_shot_join"]);

// In-memory rate limiters (instance-local). This is lightweight and effective
// for common bot traffic; edge/global limits should still be added upstream.
const BURST_WINDOW_MS = 30_000;
const BURST_LIMIT = 8;
const ACTION_WINDOW_MS = 10 * 60_000;
const ACTION_LIMIT = 25;
const IP_WINDOW_MS = 10 * 60_000;
const IP_LIMIT = 80;
const FAILURE_WINDOW_MS = 15 * 60_000;
const FAILURE_LIMIT = 25;
const TEMP_BLOCK_MS = 10 * 60_000;

const ipBurstHits = new Map();
const ipActionHits = new Map();
const ipHits = new Map();
const ipFailures = new Map();
const ipBlockedUntil = new Map();

let lastCleanupAt = 0;

function fingerprintIp(ip) {
  const value = String(ip || "unknown").trim() || "unknown";
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function logRecaptchaEvent(event, data = {}) {
  console.info(JSON.stringify({
    type: "recaptcha.verify",
    event,
    ts: new Date().toISOString(),
    ...data,
  }));
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return String(req.ip || "unknown").trim() || "unknown";
}

function recordHit(map, key, now, windowMs) {
  const existing = map.get(key) || [];
  const next = existing.filter((ts) => now - ts <= windowMs);
  next.push(now);
  map.set(key, next);
  return next.length;
}

function recordFailure(ip, now) {
  return recordHit(ipFailures, ip, now, FAILURE_WINDOW_MS);
}

function maybeCleanup(now) {
  if (now - lastCleanupAt < 5 * 60_000) return;
  lastCleanupAt = now;

  const cleanWindowMap = (map, windowMs) => {
    for (const [key, values] of map.entries()) {
      const kept = values.filter((ts) => now - ts <= windowMs);
      if (kept.length === 0) map.delete(key);
      else map.set(key, kept);
    }
  };

  cleanWindowMap(ipBurstHits, BURST_WINDOW_MS);
  cleanWindowMap(ipActionHits, ACTION_WINDOW_MS);
  cleanWindowMap(ipHits, IP_WINDOW_MS);
  cleanWindowMap(ipFailures, FAILURE_WINDOW_MS);

  for (const [key, blockedUntil] of ipBlockedUntil.entries()) {
    if (blockedUntil <= now) ipBlockedUntil.delete(key);
  }
}

function rejectRateLimited(res, retryAfterSeconds) {
  const retry = Math.max(1, Math.ceil(retryAfterSeconds));
  res.set("Retry-After", String(retry));
  res.status(429).json({
    success: false,
    message: "Too many attempts. Please try again later.",
  });
}

function getRequestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export const verifyRecaptcha = onRequest(
  {
    region: "us-central1",
    cors: true,
    invoker: "public",
    secrets: [recaptchaSecret],
  },
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    const now = Date.now();
    maybeCleanup(now);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ success: false, message: "Method not allowed." });
      return;
    }

    const { token, action } = getRequestBody(req);
    const clientIp = getClientIp(req);
    const clientIpFingerprint = fingerprintIp(clientIp);
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 160);

    const blockedUntil = ipBlockedUntil.get(clientIp) || 0;
    if (blockedUntil > now) {
      logRecaptchaEvent("blocked", {
        action,
        clientIpFingerprint,
        retryAfterSeconds: Math.ceil((blockedUntil - now) / 1000),
        userAgent,
      });
      rejectRateLimited(res, (blockedUntil - now) / 1000);
      return;
    }

    if (!token || typeof token !== "string") {
      logRecaptchaEvent("invalid_request", {
        action,
        clientIpFingerprint,
        reason: "missing_token",
        userAgent,
      });
      res.status(400).json({ success: false, message: "Missing reCAPTCHA token." });
      return;
    }

    if (!action || typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
      logRecaptchaEvent("invalid_request", {
        action,
        clientIpFingerprint,
        reason: "invalid_action",
        userAgent,
      });
      res.status(400).json({ success: false, message: "Invalid reCAPTCHA action." });
      return;
    }

    const burstCount = recordHit(ipBurstHits, clientIp, now, BURST_WINDOW_MS);
    if (burstCount > BURST_LIMIT) {
      logRecaptchaEvent("rate_limited", {
        action,
        clientIpFingerprint,
        limiter: "burst",
        count: burstCount,
        limit: BURST_LIMIT,
        userAgent,
      });
      rejectRateLimited(res, BURST_WINDOW_MS / 1000);
      return;
    }

    const actionCount = recordHit(ipActionHits, `${clientIp}:${action}`, now, ACTION_WINDOW_MS);
    if (actionCount > ACTION_LIMIT) {
      logRecaptchaEvent("rate_limited", {
        action,
        clientIpFingerprint,
        limiter: "action",
        count: actionCount,
        limit: ACTION_LIMIT,
        userAgent,
      });
      rejectRateLimited(res, ACTION_WINDOW_MS / 1000);
      return;
    }

    const ipCount = recordHit(ipHits, clientIp, now, IP_WINDOW_MS);
    if (ipCount > IP_LIMIT) {
      logRecaptchaEvent("rate_limited", {
        action,
        clientIpFingerprint,
        limiter: "ip",
        count: ipCount,
        limit: IP_LIMIT,
        userAgent,
      });
      rejectRateLimited(res, IP_WINDOW_MS / 1000);
      return;
    }

    const secret = recaptchaSecret.value();
    if (!secret) {
      logRecaptchaEvent("server_error", {
        action,
        clientIpFingerprint,
        reason: "missing_secret",
      });
      res.status(500).json({ success: false, message: "reCAPTCHA secret not configured." });
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.set("secret", secret);
      formData.set("response", token);
      if (clientIp && clientIp !== "unknown") formData.set("remoteip", clientIp);

      const googleRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!googleRes.ok) {
        logRecaptchaEvent("upstream_error", {
          action,
          clientIpFingerprint,
          status: googleRes.status,
          userAgent,
        });
        res.status(502).json({ success: false, message: "Unable to verify reCAPTCHA." });
        return;
      }

      const result = await googleRes.json();
      const score = typeof result.score === "number" ? result.score : 0;
      const minScore = MIN_RECAPTCHA_SCORE_BY_ACTION[action] ?? 0.3;
      const actionMatches = !result.action || result.action === action;

      const valid =
        result.success === true &&
        actionMatches &&
        score >= minScore;

      if (!valid) {
        const failures = recordFailure(clientIp, now);
        if (failures >= FAILURE_LIMIT) {
          ipBlockedUntil.set(clientIp, now + TEMP_BLOCK_MS);
        }
        logRecaptchaEvent("failed", {
          action,
          clientIpFingerprint,
          score,
          minScore,
          googleAction: result.action || null,
          actionMatches,
          googleSuccess: result.success === true,
          errors: Array.isArray(result["error-codes"]) ? result["error-codes"] : [],
          failureCount: failures,
          tempBlocked: failures >= FAILURE_LIMIT,
          userAgent,
        });
        res.status(403).json({
          success: false,
          message: "Security verification failed.",
          score,
          minScore,
        });
        return;
      }

      res.status(200).json({
        success: true,
        score,
      });
      logRecaptchaEvent("passed", {
        action,
        clientIpFingerprint,
        score,
        minScore,
        userAgent,
      });
    } catch (err) {
      console.error("verifyRecaptcha error", err);
      logRecaptchaEvent("server_error", {
        action,
        clientIpFingerprint,
        reason: "exception",
        message: err?.message || "unknown",
      });
      res.status(500).json({ success: false, message: "Security verification failed." });
    }
  }
);
