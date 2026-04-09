/*
  Runtime app logic for TomeVault.
  Private replication walkthrough and jargon glossary are intentionally kept in
  local-only notes at .private/REPLICATION_NOTES.md (gitignored).
*/ 

// ---- 1) Firebase imports (CDN ESM) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getRedirectResult,
  signInWithRedirect,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithPopup,
  linkWithRedirect,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  signOut,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";
import {
  initializeFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  getDocsFromServer,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  waitForPendingWrites,
  writeBatch,
  runTransaction,
  increment,
  deleteField,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ---- 2) Developer mode ----
// Set USE_EMULATORS = true to connect to local Firebase Emulator Suite.
// When false, the app talks directly to the live Firebase project (works
// from both localhost and production).
//
// To run emulators:  firebase emulators:start
// Default ports: Auth = 9099, Firestore = 8080, Storage = 9199
const USE_EMULATORS = false;
const IS_LOCALHOST = location.hostname === "localhost" || location.hostname === "127.0.0.1";

// ================================================================
// ZONE: APP CONSTANTS
// Purpose: shared timing, limits, collection paths, and screen keys.
// ================================================================
const UI_TIMERS = {
  // Debounce delays
  ICON_SUGGEST_DEBOUNCE_MS: 300,
  GM_SEARCH_DEBOUNCE_MS: 250,
  CREATE_DRAFT_DEBOUNCE_MS: 500,
  INVENTORY_SEARCH_DEBOUNCE_MS: 300,
  TAG_SUGGESTIONS_BLUR_MS: 200,
  // FAB timers
  FAB_HOLD_MS: 2000,
  FAB_DRAG_TOAST_MS: 1500,
  TOPBAR_REVEAL_MS: 300,
  ANIMATION_FALLBACK_MS: 500,
  // Presence thresholds (30 min online grace keeps players visible while device sleeps)
  ONLINE_THRESHOLD_MS: 1_800_000,
  AWAY_THRESHOLD_MS:   2_100_000,
  PRESENCE_MISSING_GRACE_MS: 90_000,
  // Session heartbeat
  HEARTBEAT_MS: 20_000,
  // Toast durations (ms)
  TOAST_SHORT:  3_000,
  TOAST_MED:    5_000,
  TOAST_LONG:   7_000,
  TOAST_NOTICE: 4_500,
  TOAST_BRIEF:  2_400,
  // UI feedback
  COPY_STATE_MS:   360,
  BUTTON_FLASH_MS: 1_800,
  MODAL_LEAVE_MS:  420,
  ROLL_ANIM_MS:    500,
};

// Validate limits — single source of truth for field min/max values
const LIMITS = {
  SESSION_NAME_MIN: 2,
  SESSION_NAME_MAX: 48,
  SESSION_SLUG_MAX: 32,
  PIN_MIN: 4,
  PIN_MAX: 8,
  PASSWORD_MIN: 12,
  PASSWORD_MAX: 128,
  NICKNAME_MIN: 2,
  NICKNAME_MAX: 30,
  IGN_MIN: 2,
  IGN_MAX: 30,
  CHAT_MESSAGE_MAX: 500,
};

// Firestore collection path constants
const FIREBASE_PATHS = {
  SESSIONS: "sessions",
  PLAYERS: "players",
  HANDOUTS: "handouts",
  INVENTORY: "inventory",
  WALLETS: "wallets",
  USERS: "users",
  NUGGETS: "nuggets",
  NOTIFICATIONS: "notifications",
  CHAT_MESSAGES: "chatMessages",
  TEMPLATES: "templates",
  TEMPLATE_ASSIGNMENTS: "templateAssignments",
};

const SCREEN_KEYS = {
  LANDING: "landing",
  GM_DASH: "gmDash",
  PLAYER_VIEW: "plView",
  PLAYER_INVENTORY: "plInventory",
  CHAT: "chat",
  NOTES: "notes",
  PROFILE: "profile",
  SETTINGS: "settings",
  INFO: "info",
  SETTINGS_PROFILE: "settingsProfile",
  CHARACTER_TEMPLATES: "characterTemplates",
  PL_JOIN: "plJoin",
  GM_CREATE: "gmCreate",
};

// ---- 3) Your Firebase config ----
const firebaseConfig = {
    apiKey: "AIzaSyDWMlq-M1w5-_CFdlkQcggp6GW-EBJZP-o",
    authDomain: "tomevaultapp.firebaseapp.com",
    projectId: "tomevaultapp",
    storageBucket: "tomevaultapp.firebasestorage.app",
    messagingSenderId: "851346918917",
    appId: "1:851346918917:web:bf7cdfc122516a89cf166c",
    measurementId: "G-CV46E2D0RT"
};

// ---- 3b) Random Generator Catalog ----
// This is the data source for the "Random Handout" generator feature.
//
// HOW IT WORKS � Combinatoric Template System:
// Each handout type (loot, npc, clue, letter, quest, map) has word pools
// labeled a, b, p1, p2, p3, s1, s2. The generator picks one random word/phrase
// from each pool and combines them:
//
//   Title  = random(a) + " " + random(b)     e.g. "Moon Dagger"
//   Public = random(p1) + " " + random(p2) + " " + random(p3)
//            e.g. "A relic recovered from a sealed crypt that hums around danger."
//   Secret = random(s1) + " " + random(s2)
//            e.g. "It binds to the first rightful bearer."
//
// KEY:
//   a  = adjective / first-name part (title word 1)
//   b  = noun / last-name part      (title word 2)
//   p1 = public sentence opener
//   p2 = public middle clause
//   p3 = public sentence closer
//   s1 = secret sentence opener     (GM-only info)
//   s2 = secret sentence closer
//
// WHY THIS DESIGN: With 10�10�4�4�4�4�4 = 102,400 unique combinations per type
// (and 6 types), the GM gets massive variety from a compact data structure.
// Adding new entries to any pool instantly multiplies the total combinations.
const RANDOM_GENERATOR_CATALOG = {
    loot: {
      a: ["Moon", "Ash", "Dawn", "Iron", "Whispering", "Gilded", "Raven", "Starforged", "Runed", "Ember"],
      b: ["Dagger", "Compass", "Lantern", "Crown", "Chalice", "Amulet", "Ring", "Blade", "Idol", "Key"],
      c: ["of Hollowmere", "of Cinders", "of the North Road", "of Quiet Oaths", "of Broken Kings", "of Lost Tides"],
      p1: ["A relic recovered", "An heirloom discovered", "A treasure carried", "A field-ready artifact found"],
      p2: ["from a sealed crypt", "in a ruined chapel", "after a skirmish", "inside an abandoned vault"],
      p3: ["that hums around danger.", "that glows near hidden doors.", "with runes no scholar can place.", "that responds to spoken vows."],
      s1: ["It binds to", "It secretly marks", "It quietly attracts", "It occasionally reveals"],
      s2: ["the first rightful bearer.", "agents of a rival house.", "spirits from the old road.", "a forgotten map fragment."],
    },
    npc: {
      a: ["Captain", "Brother", "Seer", "Warden", "Envoy", "Scout", "Keeper", "Mira", "Seren", "Dorrik"],
      b: ["Vale", "Ashglow", "Kell", "Marrow", "Stone", "Thorne", "Rill", "Halven", "Bran", "Morr"],
      p1: ["A seasoned", "A cautious", "A persuasive", "A weary"],
      p2: ["traveler", "officer", "scholar", "guide"],
      p3: ["seeking allies before dawn.", "offering help for a price.", "watching every answer closely.", "with ties to local rumors."],
      s1: ["Secretly", "Quietly", "Privately", "Unknowingly"],
      s2: ["serves a hidden patron.", "carries a coded dispatch.", "knows the missing heir.", "is tied to the central mystery."],
    },
    clue: {
      a: ["Ashen", "Broken", "Midnight", "Silent", "Stolen", "Faded", "Hidden", "Crimson", "Lantern", "Glass"],
      b: ["Ledger", "Seal", "Riddle", "Manifest", "Token", "Record", "Page", "Cipher", "Sketch", "Directive"],
      p1: ["A fragment", "A suspicious note", "A marked record", "A recovered scrap"],
      p2: ["linking two events", "naming unfamiliar contacts", "showing unusual dates", "from an unknown messenger"],
      p3: ["that points toward the old district.", "with ink different from the rest.", "that narrows the suspect list.", "found near the latest scene."],
      s1: ["One symbol", "One date", "One margin note", "One crossed line"],
      s2: ["reveals the true courier.", "marks a hidden chamber.", "names an unexpected ally.", "indicates deliberate forgery."],
    },
    letter: {
      a: ["Final", "Northern", "Sealed", "Captain's", "Urgent", "Midwatch", "Royal", "Private", "Border", "Council"],
      b: ["Warning", "Petition", "Orders", "Dispatch", "Appeal", "Memorandum", "Letter", "Request", "Mandate", "Notice"],
      p1: ["A formal message", "A personal plea", "An official order", "A hurried correspondence"],
      p2: ["written under pressure", "bearing multiple signatures", "sealed with old wax", "delivered after curfew"],
      p3: ["requesting immediate action.", "warning of escalation.", "redirecting trusted agents.", "asking for discreet support."],
      s1: ["Hidden ink", "An acrostic", "A folded insert", "A mirrored signature"],
      s2: ["names the traitor.", "changes the destination.", "contradicts the official story.", "reveals the true author."],
    },
    quest: {
      a: ["Silent", "Fifth", "Thornbound", "Shattered", "Forgotten", "Blackroad", "Sunken", "Lantern", "Redfen", "Dunmere"],
      b: ["Bell", "Lantern", "Road", "Vow", "Signal", "Sanctum", "Crossing", "Accord", "Hunt", "Trial"],
      p1: ["A mission", "A contract", "A desperate request", "A sanctioned operation"],
      p2: ["with narrow timing", "under political pressure", "through hostile territory", "with uncertain allies"],
      p3: ["to recover a key relic.", "to escort a dangerous witness.", "to secure a contested location.", "to stop a ritual in progress."],
      s1: ["Success", "Failure", "Interference", "Delay"],
      s2: ["awakens an old guardian.", "triggers a wider conflict.", "exposes a hidden pact.", "changes faction alignment."],
    },
    map: {
      a: ["Hollowmere", "Blackroot", "Sunken", "Red Fen", "Stoneward", "Ash Valley", "Old Coast", "North March", "Mournridge", "Whisperwood"],
      b: ["Route", "Survey", "Chart", "Overlay", "Guide", "Path", "Atlas", "Draft", "Track", "Plan"],
      p1: ["A weathered map", "A field chart", "A layered survey", "A marked route sheet"],
      p2: ["annotated by prior explorers", "copied from forbidden archives", "updated after recent patrols", "with hazard notes in red"],
      p3: ["showing shortcuts and choke points.", "highlighting disputed landmarks.", "detailing alternate routes.", "with warnings near old ruins."],
      s1: ["A hidden path", "A false marker", "A coded legend", "A redacted segment"],
      s2: ["appears under heat.", "misleads untrusted readers.", "points to a buried vault.", "reveals a protected entrance."],
    },
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let googleAuthInFlight = false;

// Auth providers - Google is live, others are placeholders for future activation.
const googleProvider = new GoogleAuthProvider();
// Placeholders (not called until Firebase Console enables them):
// const appleProvider  = new OAuthProvider('apple.com');
// const fbProvider     = new OAuthProvider('facebook.com');
// const msProvider     = new OAuthProvider('microsoft.com');

const db = initializeFirestore(app, {});
const storage = getStorage(app);

// ---- Emulator wiring (dev only) ----
if (USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    console.info("%c[DEV] Firebase Emulators connected (Auth:9099, Firestore:8080)", "color:#00e676;font-weight:bold");
  } catch (e) {
    console.warn("Could not connect to emulators - are they running?", e);
  }
} else if (IS_LOCALHOST) {
  console.info(
    "%c[DEV] Tip: set USE_EMULATORS = true at the top of index.mjs to use local emulators instead.",
    "color:#ffd740;font-weight:bold"
  );
}

// ---- WakeLock API ----
let sessionWakeLock = null;
async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    sessionWakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    console.warn("Wake Lock failed:", err);
  }
}

function releaseWakeLock() {
  if (!sessionWakeLock) return;
  sessionWakeLock.release().catch(() => {});
  sessionWakeLock = null;
}

// Re-request wake lock + heartbeat on visibility change
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (sessionWakeLock !== null) requestWakeLock();
    // After device sleep, setInterval timers may be stale — restart heartbeat
    // so the player immediately appears "Online" again.
    if (state.sessionId && state.uid) {
      sendHeartbeatNow();
      startHeartbeat();
    }
  }
});

// ---- 4) DOM helpers ----
// Tiny helper to reduce repetition:
// Instead of writing document.getElementById("someId") every time,
// we can write $("someId") and keep the code cleaner.
const $ = (id) => document.getElementById(id);

// Profile avatar diagnostics (opt-in):
// - ?profileAvatarDiag=1 enables verbose logs
// - ?profileAvatarStrict=1 enables strict CSS fallback class on <body>
const URL_PARAMS = new URLSearchParams(location.search);
const PROFILE_AVATAR_DIAG = URL_PARAMS.get("profileAvatarDiag") === "1" || localStorage.getItem("tv.profileAvatarDiag") === "1";
const PROFILE_AVATAR_STRICT = URL_PARAMS.get("profileAvatarStrict") === "1" || localStorage.getItem("tv.profileAvatarStrict") === "1";

if (PROFILE_AVATAR_DIAG) {
  console.info("[profile-avatar-diag] enabled", {
    href: location.href,
    ua: navigator.userAgent,
    standalone: window.matchMedia?.("(display-mode: standalone)")?.matches || false,
    cssVersion: document.querySelector('link[href*="style.css"]')?.getAttribute("href") || "",
  });
}

if (PROFILE_AVATAR_STRICT) {
  document.body.classList.add("tv-avatar-strict");
  if (PROFILE_AVATAR_DIAG) console.info("[profile-avatar-diag] strict mode enabled");
}

function logAvatarDiagnostics(label, el) {
  if (!PROFILE_AVATAR_DIAG || !el) return;
  try {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const parent = el.parentElement;
    const pRect = parent?.getBoundingClientRect?.();
    const pCs = parent ? getComputedStyle(parent) : null;
    const entry = {
      label,
      id: el.id || "",
      className: el.className || "",
      hiddenClass: el.classList.contains("hidden"),
      src: (el instanceof HTMLImageElement ? el.currentSrc || el.src : "") || "",
      natural: el instanceof HTMLImageElement ? `${el.naturalWidth}x${el.naturalHeight}` : "",
      rect: `${Math.round(rect.width)}x${Math.round(rect.height)}@${Math.round(rect.left)},${Math.round(rect.top)}`,
      position: cs.position,
      width: cs.width,
      height: cs.height,
      transform: cs.transform,
      objectFit: cs.objectFit,
      pointerEvents: cs.pointerEvents,
      parent: parent?.id || parent?.className || "",
      parentRect: pRect ? `${Math.round(pRect.width)}x${Math.round(pRect.height)}@${Math.round(pRect.left)},${Math.round(pRect.top)}` : "",
      parentOverflow: pCs?.overflow || "",
      parentRadius: pCs?.borderRadius || "",
      screen: document.body.dataset.screen || "",
    };
    console.table(entry);
  } catch (err) {
    console.warn("[profile-avatar-diag] failed", err);
  }
}

function enforceProfileAvatarContainment() {
  const ringIds = ["profileHeroAvatar", "profileGMAvatar"];
  const imageIds = ["profileHeroImg", "profileGMImg"];

  for (const id of ringIds) {
    const el = $(id);
    if (!el) continue;
    el.style.position = "relative";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.overflow = "hidden";
    el.style.borderRadius = "inherit";
    el.style.clipPath = "circle(50% at 50% 50%)";
  }

  for (const id of imageIds) {
    const el = $(id);
    if (!(el instanceof HTMLImageElement)) continue;
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.maxWidth = "100%";
    el.style.maxHeight = "100%";
    el.style.objectFit = "cover";
    el.style.objectPosition = "center";
    el.style.transform = "scale(var(--tv-image-zoom))";
    el.style.transformOrigin = "center";
    el.style.borderRadius = "inherit";
    el.style.pointerEvents = "none";
    el.style.userSelect = "none";
    if (PROFILE_AVATAR_DIAG) logAvatarDiagnostics(`enforce:${id}`, el);
  }
}

function setProfileHeroAvatarVisual(avatarEl, imageEl, src) {
  if (!avatarEl) return;
  const hasSrc = !!String(src || "").trim();
  avatarEl.classList.toggle("has-photo", hasSrc);

  if (hasSrc) {
    const safeSrc = String(src).replace(/'/g, "\\'");
    avatarEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.12)), url('${safeSrc}')`;
    avatarEl.style.backgroundSize = "cover";
    avatarEl.style.backgroundPosition = "center";
    avatarEl.style.backgroundRepeat = "no-repeat";
  } else {
    avatarEl.style.removeProperty("background-image");
    avatarEl.style.removeProperty("background-size");
    avatarEl.style.removeProperty("background-position");
    avatarEl.style.removeProperty("background-repeat");
  }

  // Keep img nodes disabled on profile screen to avoid Samsung renderer bug.
  if (imageEl) {
    imageEl.classList.add("hidden");
    imageEl.removeAttribute("src");
  }
}

// `screens` maps logical screen names to actual section elements.
// `showOnly()` uses this map to swap visible screens like app routes.
const screens = {
  landing: $("screenLanding"),
  gmCreate: $("screenGMCreate"),
  gmDash: $("screenGMDash"),
  plJoin: $("screenPlayerJoin"),
  plView: $("screenPlayerView"),
  plInventory: $("screenPlayerInventory"),
  chat: $("screenChat"),
  notes: $("screenNotes"),
  settings: $("screenSettings"),
  info: $("screenInfo"),
  settingsProfile: $("screenSettingsProfile"),
  characterTemplates: $("screenCharacterTemplates"),
  profile: $("screenProfile"),
};

// ---- Top-level app chrome (always visible once in a session) ----
const topBar = $("topBar");
const bottomBar = $("bottomBar");
const btnBrandHome = $("btnBrandHome");
const btnHamburger = $("btnHamburger");
const hamburgerSpeedDial = $("hamburgerSpeedDial");
const btnDialHandouts = $("btnDialHandouts");
const btnDialSocial = $("btnDialSocial");
const btnDialAtmosphere = $("btnDialAtmosphere");
const btnDialInventory = $("btnDialInventory");
const btnDialNotes = $("btnDialNotes");
const btnDialSettings = $("btnDialSettings");
const btnTopBarSocial = $("btnTopBarSocial");
const btnShareInviteSocial = $("btnShareInviteSocial");
const nicknameModal = $("nicknameModal");
const nicknameInput = $("nicknameInput");
const btnNicknameConfirm = $("btnNicknameConfirm");
const spellModal = $("spellModal");
const spellNameInput = $("spellNameInput");
const spellSchoolInput = $("spellSchoolInput");
const spellLevelInput = $("spellLevelInput");
const spellDescInput = $("spellDescInput");
const btnSpellCancel = $("btnSpellCancel");
const btnSpellSave = $("btnSpellSave");
const btnMessagePlayer = $("btnMessagePlayer");
const pcMessageWrap = $("pcMessageWrap");
const pcMessageInput = $("pcMessageInput");
const btnSendPlayerMessage = $("btnSendPlayerMessage");
const btnKickPlayer = $("btnKickPlayer");
const settingsDrawer = $("settingsDrawer");
const settingsDrawerBackdrop = $("settingsDrawerBackdrop");
const btnOpenProfile = $("btnOpenProfile");
const bottomBarAvatarImg = $("bottomBarAvatarImg");
const gmFab = $("gmFab");

if (PROFILE_AVATAR_DIAG && bottomBarAvatarImg) {
  bottomBarAvatarImg.addEventListener("load", () => logAvatarDiagnostics("bottomBarAvatarImg:load", bottomBarAvatarImg));
  bottomBarAvatarImg.addEventListener("error", () => logAvatarDiagnostics("bottomBarAvatarImg:error", bottomBarAvatarImg));
}

// ---- Nugget counter + session status indicators ----
const nuggetCounter = $("nuggetCounter");
const nuggetBalanceEl = $("nuggetBalance");
const liveStatus = $("liveStatus");
const liveStatusPanel = $("liveStatusPanel");
const liveStatusTag = $("liveStatusTag");
const liveStatusId = $("liveStatusId");
const btnToggleLiveAdvanced = $("btnToggleLiveAdvanced");
const liveAdvancedDetails = $("liveAdvancedDetails");
const btnCopyLiveStatus = $("btnCopyLiveStatus");


const playerListDropdown = $("playerListDropdown");
const playerListContent = $("playerListContent");
const playerListEmpty = $("playerListEmpty");

// ---- Landing screen ----
// The first screen users see. Choose GM or Player role, or log in.
const btnGoGM = $("btnGoGM");
const btnGoPlayer = $("btnGoPlayer");
const landingSessionList = $("landingSessionList");
const landingSessionEmpty = $("landingSessionEmpty");
const landingSessionCount = $("landingSessionCount");

// ---- Auth card (sign-in / sign-up / guest) ----
// Shown on the landing screen. Handles email + Google login,
// account creation, and anonymous "guest" one-shot mode.
const authCard = $("authCard");
const authGuestCta = $("authGuestCta");
const landingHome = $("landingHome");
const landingDisplayName = $("landingDisplayName");
// Screen-level containers
const authMethodScreen = $("authMethodScreen");
const authEmailScreen = $("authEmailScreen");
// Mode selector (Screen 1)
const authModeSignIn = $("authModeSignIn");
const authModeSignUp = $("authModeSignUp");
const authBtnEmail = $("authBtnEmail");
const authMethodErr = $("authMethodErr");
// Tab bar (Screen 2)
const authTabSignIn = $("authTabSignIn");
const authTabSignUp = $("authTabSignUp");
const btnAuthBack = $("btnAuthBack");
const authSignIn = $("authSignIn");
const authSignUp = $("authSignUp");
const formSignIn = $("formSignIn");
const formSignUp = $("formSignUp");
const signInEmail = $("signInEmail");
const signInPassword = $("signInPassword");
const signInEmailErr = $("signInEmailErr");
const signInPasswordErr = $("signInPasswordErr");
const signInFormErr = $("signInFormErr");
const btnSignIn = $("btnSignIn");
const btnForgotPassword = $("btnForgotPassword");
const btnGoogleContinue = $("btnGoogleContinue");
const signUpIGN = $("signUpIGN");
const signUpEmail = $("signUpEmail");
const signUpPassword = $("signUpPassword");
const signUpConfirm = $("signUpConfirm");
const signUpIGNErr = $("signUpIGNErr");
const signUpEmailErr = $("signUpEmailErr");
const signUpPasswordErr = $("signUpPasswordErr");
const signUpConfirmErr = $("signUpConfirmErr");
const signUpFormErr = $("signUpFormErr");
const btnSignUp = $("btnSignUp");
const btnSignOut = $("btnSignOut");
const btnGuestOneShotCreate = $("btnGuestOneShotCreate");
const btnGuestOneShotJoin = $("btnGuestOneShotJoin");
const oneShotBanner = $("oneShotBanner");
const oneShotTimeLeft = $("oneShotTimeLeft");
const btnOneShotUpgrade = $("btnOneShotUpgrade");

// ---- GM: session creation form ----
// Screen where the Game Master names the session, sets a PIN,
// and clicks "Create" to generate a new Firestore session document.
const gmCreateHeading = $("gmCreateHeading");
const gmCreateGuestNotice = $("gmCreateGuestNotice");
const gmSessionName = $("gmSessionName");
const gmPin = $("gmPin");
const btnCreateSession = $("btnCreateSession");
const btnGMBack = $("btnGMBack");
const gmCreateMsg = $("gmCreateMsg");
const btnCreateClaimable = $("btnCreateClaimable");

// ---- GM: main dashboard ----
// Live session management: QR invite, handout list, ambience, social panel.
const gmDashTitle = $("gmDashTitle");
const gmSessionIdText = $("gmSessionIdText");
const gmPinShown = $("gmPinShown");
const btnChangePin = $("btnChangePin");
const gmTransferPinShown = $("gmTransferPinShown");
const btnChangeTransferPin = $("btnChangeTransferPin");
const qrBox = $("qrBox");
const btnCopyJoinLinkSocial = $("btnCopyJoinLinkSocial");
const btnCopyJoinLinkModal = $("btnCopyJoinLinkModal");
const btnCopyPin = $("btnCopyPin");
const btnEndSession = $("btnEndSession");

// ---- GM: ambience (background music) controls ----
// The GM selects a track and volume; changes are synced to Firestore,
// which triggers all connected players' <audio> to update in realtime.
const gmAmbience = $("gmAmbience");
const gmVolume = $("gmVolume");
const btnGMPlay = $("btnGMPlay");
const btnGMPause = $("btnGMPause");
const btnOpenAmbienceBar = $("btnOpenAmbienceBar");
const btnCloseAmbienceBar = $("btnCloseAmbienceBar");
const btnAmbienceInfo = $("btnAmbienceInfo");
const btnOpenAtmospherePanel = $("btnOpenAtmospherePanel");
const ambienceBar = $("ambienceBar");
const gmAtmosphereTrack = $("gmAtmosphereTrack");
const gmAtmosphereStatus = $("gmAtmosphereStatus");
const gmAtmosphereVolume = $("gmAtmosphereVolume");
const creditsModal = $("creditsModal");
const btnCloseCredits = $("btnCloseCredits");
const externalLinkModal = $("externalLinkModal");
const externalLinkHost = $("externalLinkHost");
const btnExternalLinkConfirm = $("btnExternalLinkConfirm");
const btnExternalLinkCancel = $("btnExternalLinkCancel");
const btnToggleSocial = $("btnToggleSocial");
const btnCloseSocial = $("btnCloseSocial");
const btnOpenCreateHandout = $("btnOpenCreateHandout") || $("btnCreateHandoutInline") || $("gmFab");
const btnOpenHandouts = $("btnOpenHandouts");
const btnOpenInventory = $("btnOpenInventory");
const btnOpenNotes = $("btnOpenNotes");
const btnOpenSettings = $("btnOpenSettings") || $("btnDialSettings") || $("btnHamburger");
const gmSocialPanel = $("gmSocialPanel");
const gmHandoutsPanel = $("gmHandoutsPanel");
const gmPartyPanel = $("gmPartyPanel");
const btnCollapseParty = $("btnCollapseParty");
const playerPartyPanel = $("playerPartyPanel");
const btnCollapsePlayerParty = $("btnCollapsePlayerParty");

// ---- GM: handout authoring form + list ----
// Handouts are the core content unit (loot, NPC, clue, quest, etc.).
// The GM fills out fields and clicks Add; the card appears for players in realtime.
const gmType = $("gmType");
const gmTitle = $("gmTitle");
const gmPublic = $("gmPublic");
const gmSecret = $("gmSecret");
const btnCreateRevealToggle = $("btnCreateRevealToggle");
const createRevealEyeOpen = $("createRevealEyeOpen");
const createRevealEyeClosed = $("createRevealEyeClosed");
const gmIconGrid = $("gmIconGrid");
const iconSuggestRow = $("iconSuggestRow");
const iconSuggestTiles = $("iconSuggestTiles");
const emojiPreview = $("emojiPreview");
const emojiInput = $("emojiInput");
const gmColorRow = $("gmColorRow");
const gmImagePreview = $("gmImagePreview");
const portraitPlaceholder = $("portraitPlaceholder");
const gmImageStatus = $("gmImageStatus");
const btnImagePrev = $("btnImagePrev");
const btnImageNext = $("btnImageNext");
const btnImageRandom = $("btnImageRandom");
const btnImageSelect = $("btnImageSelect");
const btnImageUpload = $("btnImageUpload");
const imagePickerPanel = $("imagePickerPanel");
const imagePickerList = $("imagePickerList");
const createMapUploadWrap = $("createMapUploadWrap");
const createMapDisplayFrame = $("createMapDisplayFrame");
const createMapPreviewImg = $("createMapPreviewImg");
const createMapEmptyState = $("createMapEmptyState");
const createMapLoadingOverlay = $("createMapLoadingOverlay");
const btnCreateMapAIGenerate = $("btnCreateMapAIGenerate");
const handoutImageUpload = $("handoutImageUpload");
const btnHandoutUploadImage = $("btnHandoutUploadImage");
const handoutImageStatus = $("handoutImageStatus");
const btnRandomHandout = $("btnRandomHandout");
const npcDispositionWrap = $("npcDispositionWrap");
const npcDispositionRow = $("npcDispositionRow");
const btnAddHandout = $("btnAddHandout");
const gmHandoutList = $("gmHandoutList");
const gmHandoutEmpty = $("gmHandoutEmpty");
const gmSearch = $("gmSearch");
const btnOpenGMHandoutDeck = $("btnOpenGMHandoutDeck");
const gmFilterRow = $("gmFilterRow");
const btnToggleFilters = $("btnToggleFilters");
const filterActiveBadge = $("filterActiveBadge");
const btnOpenCreateModal = $("btnOpenCreateModal") || $("btnCreateHandoutInline") || $("gmFab");
const btnCloseCreateModal = $("btnCloseCreateModal");
const createHandoutModal = $("createHandoutModal");

// ---- GM: connected players sidebar ----

const gmRailTabs = $("gmRailTabs");
const gmTabParty = $("gmTabParty");
const gmTabChat = $("gmTabChat");
const gmPartyBadge = $("gmPartyBadge");
const gmChatBadge = $("gmChatBadge");

const gmSplit = $("gmSplit");
const gmPartyInlineList = $("gmPartyInlineList");
const gmPartyInlineEmpty = $("gmPartyInlineEmpty");
const btnRollInitiative = $("btnRollInitiative");
const btnResetInitiative = $("btnResetInitiative");
const btnPartyBattle = $("btnPartyBattle");
const btnAddNpc = $("btnAddNpc");
const gmPartyRollOverlay = $("gmPartyRollOverlay");
const btnOpenSocialFromParty = $("btnOpenSocialFromParty");
const gmTurnNav = $("gmTurnNav");
const gmTurnLabel = $("gmTurnLabel");
const btnTurnPrev = $("btnTurnPrev");
const btnTurnNext = $("btnTurnNext");

// ---- Player: join screen ----
// Where a player enters Session ID + PIN (or scans QR) to join a game.
const plJoinGuestNotice = $("plJoinGuestNotice");
const plJoinSignedNotice = $("plJoinSignedNotice");
const plSessionId = $("plSessionId");
const plNick = $("plNick");
const plPin = $("plPin");
const btnJoin = $("btnJoin");
const btnPlayerBack = $("btnPlayerBack");
const plJoinMsg = $("plJoinMsg");
const plRecentWrap = $("plRecentWrap");
const plRecentList = $("plRecentList");
const plRecentMeta = $("plRecentMeta");

// ---- Player: QR camera scanner ----
// Uses Html5Qrcode library to open the device camera and decode a QR invite.
const btnScanInApp = $("btnScanInApp");
const qrReaderWrap = $("qrReaderWrap");
const btnStopScan = $("btnStopScan");

// ---- Player: main handout view ----
// Displays the live list of handouts the GM has shared with the session.
const plTitle = $("plTitle");
const btnLeave = $("btnLeave");
const btnEnableSound = $("btnEnableSound");
const btnTogglePlayerHandouts = $("btnTogglePlayerHandouts");
const playerHandoutsPanel = $("playerHandoutsPanel");
const playerHandoutsMain = $("playerHandoutsMain");
const plHandoutSearch = $("plHandoutSearch");
const plHandoutList = $("plHandoutList");
const plHandoutEmpty = $("plHandoutEmpty");
const playerPartyInlineList = $("playerPartyInlineList");
const playerPartyInlineEmpty = $("playerPartyInlineEmpty");
const plRailTabs = $("plRailTabs");
const plTabParty = $("plTabParty");
const plTabChat = $("plTabChat");
const plPartyBadge = $("plPartyBadge");
const plChatBadge = $("plChatBadge");
const playerTurnNav = $("playerTurnNav");
const playerTurnLabel = $("playerTurnLabel");
const btnPlayerInitiativeEdit = $("btnPlayerInitiativeEdit");
const btnPlayerInitiativeRoll = $("btnPlayerInitiativeRoll");
const btnPlayerOpenChatFromParty = $("btnPlayerOpenChatFromParty");
const playerSessionRef = $("playerSessionRef");
const plSessionBadge = $("plSessionBadge");
const plSessionBadgeText = $("plSessionBadgeText");
const plSessionDetails = $("plSessionDetails");
const plSessionTag = $("plSessionTag");
const plSessionIdText = $("plSessionIdText");
const btnTogglePlayerAdvanced = $("btnTogglePlayerAdvanced");
const playerAdvancedDetails = $("playerAdvancedDetails");
const btnCopyPlayerSession = $("btnCopyPlayerSession");
const btnInventoryBack = $("btnInventoryBack");

// ---- Inventory & wallet screen ----
// Per-player item lists + coin pouches. GM also sees the Party Treasury.
const inventoryPlayersContainer = $("inventoryPlayersContainer");
const inventoryEmptyMsg = $("inventoryEmptyMsg");
const partyTreasuryCoins = $("partyTreasuryCoins");
const partyTreasurySection = $("partyTreasurySection");
const createInventoryModal = $("createInventoryModal");
const btnCloseInventoryModal = $("btnCloseInventoryModal");
const inventoryModalTitle = $("inventoryModalTitle");
const inventoryItemAvatarPreview = $("inventoryItemAvatarPreview");
const inventoryItemAvatarPlaceholder = $("inventoryItemAvatarPlaceholder");
const btnInvAvatarPrev = $("btnInvAvatarPrev");
const btnInvAvatarNext = $("btnInvAvatarNext");
const btnInvAvatarRandom = $("btnInvAvatarRandom");
const btnInvAvatarGallery = $("btnInvAvatarGallery");
const invGalleryPanel = $("invGalleryPanel");
const invGalleryGrid = $("invGalleryGrid");
const inventoryItemName = $("inventoryItemName");
const inventoryItemDesc = $("inventoryItemDesc");
const inventoryItemAmount = $("inventoryItemAmount");
const inventoryItemId = $("inventoryItemId");
const inventoryItemOwner = $("inventoryItemOwner");
const inventoryImageUpload = $("inventoryImageUpload");
const btnInvUploadImage = $("btnInvUploadImage");
const inventoryImageStatus = $("inventoryImageStatus");
const btnSaveInventoryItem = $("btnSaveInventoryItem");

// ---- Settings & player profile ----
// Theme switcher, role switching (player?GM), profile editing,
// character sheet OCR scanner, and character stat fields.
const btnSettingsBack = $("btnSettingsBack");
const settingsSessionInfo = $("settingsSessionInfo");
const settingsRoleSection = $("settingsRoleSection");
const settingsIdentityHint = $("settingsIdentityHint");
const btnSwitchToPlayer = $("btnSwitchToPlayer");
const btnSwitchToGM = $("btnSwitchToGM");
const gmPinPrompt = $("gmPinPrompt");
const switchGMPinInput = $("switchGMPinInput");
const btnConfirmSwitchGM = $("btnConfirmSwitchGM");
const btnCancelSwitchGM = $("btnCancelSwitchGM");
const btnDeleteSession = $("btnDeleteSession");
const btnDiscardSession = $("btnDiscardSession");
const btnSwitchSession = $("btnSwitchSession");
const handoutReviewModal = $("handoutReviewModal");
const handoutReviewSummary = $("handoutReviewSummary");
const handoutReviewProgress = $("handoutReviewProgress");
const handoutReviewStack = $("handoutReviewStack");
const btnHandoutReviewClose = $("btnHandoutReviewClose");
const btnHandoutReviewKeep = $("btnHandoutReviewKeep");
const btnHandoutReviewDelete = $("btnHandoutReviewDelete");
const gmHandoutDeckModal = $("gmHandoutDeckModal");
const gmHandoutDeckSummary = $("gmHandoutDeckSummary");
const gmHandoutDeckProgress = $("gmHandoutDeckProgress");
const gmHandoutDeckFilterRow = $("gmHandoutDeckFilterRow");
const btnGMDeckKeepClaims = $("btnGMDeckKeepClaims");
const gmHandoutDeckPlayer = $("gmHandoutDeckPlayer");
const gmHandoutDeckStack = $("gmHandoutDeckStack");
const btnGMHandoutDeckClose = $("btnGMHandoutDeckClose");
const btnGMHandoutDeckSkip = $("btnGMHandoutDeckSkip");
const btnGMHandoutDeckAssign = $("btnGMHandoutDeckAssign");
const btnGMHandoutDeckDelete = $("btnGMHandoutDeckDelete");
const deleteSessionModal = $("deleteSessionModal");
const deleteSessionConfirmInput = $("deleteSessionConfirmInput");
const btnConfirmDeleteSession = $("btnConfirmDeleteSession");
const btnCancelDeleteSession = $("btnCancelDeleteSession");
const discardSessionModal = $("discardSessionModal");
const discardSessionConfirmInput = $("discardSessionConfirmInput");
const btnConfirmDiscardSession = $("btnConfirmDiscardSession");
const btnCancelDiscardSession = $("btnCancelDiscardSession");
const sessionDeletedModal = $("sessionDeletedModal");
const btnSessionDeletedOk = $("btnSessionDeletedOk");
const settingsSoundSection = $("settingsSoundSection");
const btnOpenProfileSettings = $("btnOpenProfileSettings");
const btnReplayTutorial = $("btnReplayTutorial");
const btnThemeSystem = $("btnThemeSystem");
const btnThemeDark = $("btnThemeDark");
const btnThemeLight = $("btnThemeLight");
const btnProfileBack = $("btnProfileBack");
const profileContextMsg = $("profileContextMsg");
const profileAvatarPreview = $("profileAvatarPreview");
const profileAvatarPlaceholder = $("profileAvatarPlaceholder");
const profileAvatarFile = $("profileAvatarFile");
const profileAvatarStatus = $("profileAvatarStatus");
const profileDisplayName = $("profileDisplayName");

// ---- Session notes ----
const btnChatBack = $("btnChatBack");
const btnChatClear = $("btnChatClear");
const btnChatExport = $("btnChatExport");
const chatRetentionNote = $("chatRetentionNote");
const chatStatus = $("chatStatus");
const chatList = $("chatList");
const chatEmpty = $("chatEmpty");
const chatInput = $("chatInput");
const btnChatJumpLatest = $("btnChatJumpLatest");
const btnChatSend = $("btnChatSend");
const gmMiniChatPanel = $("gmMiniChatPanel");
const gmMiniChatStatus = $("gmMiniChatStatus");
const gmMiniChatList = $("gmMiniChatList");
const gmMiniChatEmpty = $("gmMiniChatEmpty");
const btnOpenChatFromMini = $("btnOpenChatFromMini");
const playerMiniChatPanel = $("playerMiniChatPanel");
const playerMiniChatStatus = $("playerMiniChatStatus");
const playerMiniChatList = $("playerMiniChatList");
const playerMiniChatEmpty = $("playerMiniChatEmpty");
const btnPlayerOpenChatFromMini = $("btnPlayerOpenChatFromMini");
const notesList = $("notesList");
const notesEmpty = $("notesEmpty");
const notesEmptyTitle = $("notesEmptyTitle");
const notesEmptyHint = $("notesEmptyHint");
const btnNotesEmptyCreate = $("btnNotesEmptyCreate");
const btnNotesEmptyEditorCreate = $("btnNotesEmptyEditorCreate");
const notesStatActive = $("notesStatActive");
const notesStatArchived = $("notesStatArchived");
const notesSearch = $("notesSearch");
const notesWorkspace = $("notesWorkspace");
const btnNotesScopeActive = $("btnNotesScopeActive");
const btnNotesScopeBin = $("btnNotesScopeBin");
const notesTagFilterWrap = $("notesTagFilterWrap");
const btnNotesTagFilter = $("btnNotesTagFilter");
const btnNotesClearTagFilter = $("btnNotesClearTagFilter");
const btnNotesNew = $("btnNotesNew");
const btnNotesAutoSave = $("btnNotesAutoSave");
const btnNotesEditorBack = $("btnNotesEditorBack");
const notesEditorHeading = $("notesEditorHeading");
const notesEditorEmptyState = $("notesEditorEmptyState");
const notesEditorActions = $("notesEditorActions");
const notesEditorFields = $("notesEditorFields");
const noteTitleInput = $("noteTitleInput");
const noteSessionDateInput = $("noteSessionDateInput");
const noteTagsInput = $("noteTagsInput");
const notesTagSuggestions = $("notesTagSuggestions");
const notesTagPreview = $("notesTagPreview");
const btnNotesMore = $("btnNotesMore");
const notesMorePopover = $("notesMorePopover");
const btnNotesCopyAll = $("btnNotesCopyAll");
const btnNotesExportTxt = $("btnNotesExportTxt");
const btnNotesExportMd = $("btnNotesExportMd");
const btnNotesArchive = $("btnNotesArchive");
const btnNotesRestore = $("btnNotesRestore");
const notesEditor = $("notesEditor");
const notesStatus = $("notesStatus");
const btnNotesBack = $("btnNotesBack");
const notesConfirmModal = $("notesConfirmModal");
const notesConfirmTitle = $("notesConfirmTitle");
const notesConfirmBody = $("notesConfirmBody");
const btnNotesConfirmCancel = $("btnNotesConfirmCancel");
const btnNotesConfirmSecondary = $("btnNotesConfirmSecondary");
const btnNotesConfirmOk = $("btnNotesConfirmOk");
const btnInfoBack = $("btnInfoBack");
const profileBio = $("profileBio");
const profileStatLevel = $("profileStatLevel");
const profileStatArmorRating = $("profileStatArmorRating");
const profileStatHitPoints = $("profileStatHitPoints");
const profileStatInitiative = $("profileStatInitiative");
// Ability score inputs are now dynamic — managed by renderCommonStats()
const btnScanCharacterSheet = $("btnScanCharacterSheet");
const characterSheetPhoto = $("characterSheetPhoto");
const characterSheetCameraPanel = $("characterSheetCameraPanel");
const characterSheetVideo = $("characterSheetVideo");
const btnCaptureCharacterSheet = $("btnCaptureCharacterSheet");
const btnCloseCharacterSheetCamera = $("btnCloseCharacterSheetCamera");
const profileScanStatus = $("profileScanStatus");
const btnSaveProfile = $("btnSaveProfile");
const profileSaveMsg = $("profileSaveMsg");

// ---- Shared detail modal ----
// Full-screen modal used to view/edit a single handout.
// GM gets edit fields + save/delete; players get read-only + claim button.
const modal = $("modal");
const modalClose = $("modalClose");
const modalTag = $("modalTag");
const modalTitle = $("modalTitle");
const modalImage = $("modalImage");
const modalImageWrap = $("modalImageWrap");
const modalPublic = $("modalPublic");
const modalSecretWrap = $("modalSecretWrap");
const modalSecret = $("modalSecret");
const modalIconWrap = $("modalIconWrap");
const modalIconPreview = $("modalIconPreview");
const modalIconInput = $("modalIconInput");
const modalGMControls = $("modalGMControls");
const btnToggleReveal = $("btnToggleReveal");
const btnToggleRevealSecret = $("btnToggleRevealSecret");
const btnSaveHandout = $("btnSaveHandout");
const btnEditHandout = $("btnEditHandout");
const modalMapUploadWrap = $("modalMapUploadWrap");
const modalMapDisplayFrame = $("modalMapDisplayFrame");
const modalMapPreviewImg = $("modalMapPreviewImg");
const modalMapEmptyState = $("modalMapEmptyState");
const modalMapLoadingOverlay = $("modalMapLoadingOverlay");
const btnModalMapAIGenerate = $("btnModalMapAIGenerate");
const modalMapImageUpload = $("modalMapImageUpload");
const modalHandoutImageUpload = $("modalHandoutImageUpload");
const btnModalMapUpload = $("btnModalMapUpload");
const modalMapUploadStatus = $("modalMapUploadStatus");
const btnAddHandoutToInitiativeModal = $("btnAddHandoutToInitiativeModal");
const btnDeleteHandout = $("btnDeleteHandout");
const modalClaimWrap = $("modalClaimWrap");
const claimStatus = $("claimStatus");
const btnClaim = $("btnClaim");
const btnUnclaim = $("btnUnclaim");
const modalGMClaimControls = $("modalGMClaimControls");
const btnToggleClaimable = $("btnToggleClaimable");
const btnResetClaim = $("btnResetClaim");
const gmAssignPlayer = $("gmAssignPlayer");
const btnAssignClaim = $("btnAssignClaim");
const modalSaveState = $("modalSaveState");
const modalCard = modal?.querySelector(".modal__card") || null;
const toastStack = $("toastStack");

// ---- Map AI generate modal ----
const mapGenerateModal = $("mapGenerateModal");
const mapGenDescription = $("mapGenDescription");
const mapGenStyle = $("mapGenStyle");
const mapGenStatus = $("mapGenStatus");
const mapGenPreviewWrap = $("mapGenPreviewWrap");
const mapGenPreviewImg = $("mapGenPreviewImg");
const mapGenLoadingOverlay = $("mapGenLoadingOverlay");
const btnCloseMapGenerate = $("btnCloseMapGenerate");
const btnMapGenGenerate = $("btnMapGenGenerate");
const btnMapGenUse = $("btnMapGenUse");
const btnMapGenCancel = $("btnMapGenCancel");
// ---- Create modal appearance accordion ----
const btnCreateAppearanceToggle = $("btnCreateAppearanceToggle");
const createAppearanceBody = $("createAppearanceBody");
// Profile ability scores accordion removed — replaced by dynamic stat system

// -- Notification bell + panel --
const btnNotifBell = $("btnNotifBell");
const notifBadge = $("notifBadge");
const notifPanel = $("notifPanel");
const notifList = $("notifList");
const notifEmpty = $("notifEmpty");
const btnNotifMarkAll = $("btnNotifMarkAll");

// -- GM transfer modal + character profile offer modal --
const transferModal = $("transferModal");
const transferModalMsg = $("transferModalMsg");
const transferPinInput = $("transferPinInput");
const btnAcceptTransfer = $("btnAcceptTransfer");
const btnDeclineTransfer = $("btnDeclineTransfer");
const profileOfferModal = $("profileOfferModal");
const profileOfferMsg = $("profileOfferMsg");
const profileOfferPreview = $("profileOfferPreview");
const btnAcceptProfile = $("btnAcceptProfile");
const btnRejectProfile = $("btnRejectProfile");

// -- Settings menu extra buttons --
const btnCharacterProfiles = $("btnCharacterProfiles");
const btnTransferGMRole = $("btnTransferGMRole");
const btnShowShortcuts = $("btnShowShortcuts");
const btnShowCredits = $("btnShowCredits");
const shortcutOverlay = $("shortcutOverlay");
const btnCloseShortcuts = $("btnCloseShortcuts");

// -- Character templates screen --
const templateList = $("templateList");
const templateEmpty = $("templateEmpty");
const btnCreateTemplate = $("btnCreateTemplate");
const btnBackFromTemplates = $("btnBackFromTemplates");
const createTemplateModal = $("createTemplateModal");
const btnCloseTemplateModal = $("btnCloseTemplateModal");
const templateModalTitle = $("templateModalTitle");
const templateName = $("templateName");
const templateBio = $("templateBio");
const templateImage = $("templateImage");
const templateImagePreview = $("templateImagePreview");
const btnPickTemplateImage = $("btnPickTemplateImage");
const templateImageStatus = $("templateImageStatus");
const btnSaveTemplate = $("btnSaveTemplate");
const btnCancelTemplate = $("btnCancelTemplate");
const playerPickerModal = $("playerPickerModal");
const playerPickerTitle = $("playerPickerTitle");
const playerPickerList = $("playerPickerList");
const playerPickerPinWrap = $("playerPickerPinWrap");
const playerPickerPin = $("playerPickerPin");
const btnPlayerPickerCancel = $("btnPlayerPickerCancel");
const btnPlayerPickerConfirm = $("btnPlayerPickerConfirm");

// -- Inventory search --
const inventorySearch = $("inventorySearch");

// BEGINNER NOTE � Temporary draft state:
// `createClaimableDraft` holds the toggle value for "Claimable" in the create
// handout form. It lives in JS memory (not Firestore) until the GM clicks Add.
// Once saved, it becomes the `claimable` field on the Firestore document.
let createClaimableDraft = false;
let createRevealDraft = false;
const PROFILE_STAT_KEYS = ["level", "armorRating", "hitPoints", "initiative"];
const profileInputByKey = {
  level: profileStatLevel,
  armorRating: profileStatArmorRating,
  hitPoints: profileStatHitPoints,
  initiative: profileStatInitiative,
};

// === Dynamic stats system ===
const COMMON_STAT_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const COMMON_STAT_LABELS = {
  strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
};
let dynamicStats = {
  commonStats: { strength: null, dexterity: null, constitution: null, intelligence: null, wisdom: null, charisma: null },
  customStats: [],  // [{ id, name, value }]
  bonuses: [],      // [{ id, name, value, appliesTo: string[] }]
};
let profileEditorIsEditable = true;
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function escHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// BEGINNER NOTE � profileCache:
// A Map() works like an object but with better performance for frequent
// add/delete. We cache fetched player profiles so repeated renders
// don't re-fetch from Firestore every time.
const profileCache = new Map();

// Navigation breadcrumb variables:
// Because this SPA has nested "screens" (e.g., Settings ? Profile),
// we track which screen to return to when the user clicks "Back".
let currentScreenKey = "landing";
let settingsReturnScreenKey = "landing";
let settingsProfileReturnScreenKey = "settings";
let pendingHandoutImageUrl = null; // custom uploaded image URL for create handout modal
let createImageScale = 1.14;
let createImageOffsetX = 0;
let createImageOffsetY = 0;
let createImageDragState = null;
const MAP_HANDOUT_AVATAR_URL = "placeholders/itemsPrompt3image1_3.png";
let pickerSelectionUid = "";
let pickerResolver = null;

// Profile editor state � tracked outside `state` because it's
// transient UI state, not session-level data.
let profileEditingUid = null;
let profileEditingRole = "player";
let profileEditorData = null;
let ocrInProgress = false;
let characterSheetStream = null;

// Sound preference persisted across browser sessions.
let soundEnabled = localStorage.getItem("tv_soundEnabled") === "1";
var _lastAmbienceState = null; // non-TDZ cache used by audio resume paths

/** Simple trailing-edge debounce used for search inputs. */
function debounce(fn, ms) {
  let id;
  return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
}

// One-shot sessions expire after 24 hours. These constants control
// the "recent one-shot" quick-rejoin list stored in localStorage.
const ONE_SHOT_TTL_MS = 24 * 60 * 60 * 1000;
const CHAT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CHAT_INITIAL_LIMIT = 50;
const RECENT_ONE_SHOT_KEY = "tv_recentOneShotJoins";
const RECENT_ONE_SHOT_MAX = 8;
const JOINED_SESSION_LIST_KEY = "tv_joinedSessions";
const JOINED_SESSION_LIST_MAX = 40;

// Theme system: "system" follows OS preference, "dark"/"light" are manual.
// matchMedia detects the user's OS color scheme preference.
const THEME_PREF_KEY = "tv_theme_pref";
const THEME_PREF_VALUES = new Set(["system", "dark", "light"]);
const themeMediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
let themeMediaListenerAttached = false;

// ---- 5) State ----
// Central in-memory app state.
// Think of this object as "the truth right now" for session context.
//
// BEGINNER NOTE � Why one big state object?
// Centralizing state makes debugging easier: you can inspect `state` in
// the browser console to see everything at once. It also prevents scattered
// global variables from colliding. The unsubscriber functions (unsub*) are
// stored here so we can clean them up when leaving a session � if you
// forget to unsubscribe, Firestore keeps sending data and wastes bandwidth.
const state = {
  uid: null,
  role: null, // "dm" | "player"
  gmUid: null,
  sessionId: null,
  joinTag: null,
  joinLink: null,
  gmPinPlain: null,
  scan: null,
  activePlayers: [], // track active players for GM display
  partyRoster: [],
  battleActive: false,
  currentTurnUid: null, // UID of the combatant whose turn is active
  turnRound: 1,         // current combat round
  gmFilter: "all",
  gmSearchQuery: "",
  playerHandoutSearchQuery: "",
  playerVisibleHandoutsCache: null,
  gmActiveRailTab: "party",
  plActiveRailTab: "party",
  gmHandoutsRaw: [],
  playerInventoryRaw: [],
  playerNick: "",
  sessionName: "",
  inventoryItems: [],
  wallets: {},   // { uid: {platinum,gold,silver,bronze}, party: {...} }
  trialDaysLeft: null, // number of days left in free trial (null = unchecked)
  // Auth state
  isGuest: true,
  isSignedIn: false,
  displayName: null,
  email: null,
  chat: {
    messages: [],
    isLoading: false,
    isSending: false,
    isClearing: false,
    hasServerSnapshot: false,
    fromCache: false,
    error: "",
    sessionId: null,
    shouldAutoScroll: true,
  },
  notes: {
    items: [],
    activeId: null,
    pinnedNoteId: null,
    scope: "active",
    searchQuery: "",
    tagFilter: "",
    autoSave: false,
    isLoading: false,
    dirty: false,
    saveTimer: null,
    didAttemptLegacyMigration: false,
  },

  // unsubscribers
  unsubSession: null,
  unsubHandouts: null,
  unsubPlayers: null,
  unsubInventory: null,
  unsubWallets: null,
  unsubNotifications: null,
  unsubTransfer: null,
  unsubNuggets: null,
  unsubTemplateAssignments: null,
  unsubChat: null,
  unsubNotes: null,
};

// ---- 6) Utilities ----
// Utility functions are small reusable helpers used by multiple features.
// BEGINNER NOTE � Why extract these into functions?
// Each utility does ONE thing. This makes them testable in isolation and
// keeps the main feature code readable. If you see a pattern repeated
// 3+ times, it's a good candidate for a utility function.

// --- Theme utilities ---
// The theme system has three layers:
// 1. normalizeThemePreference: sanitize any string ? valid preference
// 2. resolveThemeMode: preference ? actual "dark" or "light"
// 3. applyThemePreference: writes to DOM + syncs button UI
function normalizeThemePreference(value) {
  const pref = String(value || "").trim().toLowerCase();
  return THEME_PREF_VALUES.has(pref) ? pref : "system";
}

function getThemePreference() {
  return normalizeThemePreference(localStorage.getItem(THEME_PREF_KEY));
}

function resolveThemeMode(pref) {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return themeMediaQuery?.matches ? "light" : "dark";
}

function syncThemeButtonState(pref) {
  const map = [
    [btnThemeSystem, "system"],
    [btnThemeDark, "dark"],
    [btnThemeLight, "light"],
  ];
  map.forEach(([button, value]) => {
    if (!button) return;
    const active = pref === value;
    button.classList.toggle("btn--active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function applyThemePreference(pref = getThemePreference()) {
  const normalized = normalizeThemePreference(pref);
  const resolved = resolveThemeMode(normalized);
  document.body.dataset.theme = resolved;
  syncThemeButtonState(normalized);
  // Keep mobile browser chrome in sync with the active theme.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "light" ? "#f0ead8" : "#1f1a16");
}

function setThemePreference(pref) {
  const normalized = normalizeThemePreference(pref);
  localStorage.setItem(THEME_PREF_KEY, normalized);
  applyThemePreference(normalized);
}

function onSystemThemeChange() {
  if (getThemePreference() !== "system") return;
  applyThemePreference("system");
}

function initializeTheme() {
  applyThemePreference(getThemePreference());
  if (!themeMediaQuery || themeMediaListenerAttached) return;
  if (typeof themeMediaQuery.addEventListener === "function") {
    themeMediaQuery.addEventListener("change", onSystemThemeChange);
  } else if (typeof themeMediaQuery.addListener === "function") {
    themeMediaQuery.addListener(onSystemThemeChange);
  }
  themeMediaListenerAttached = true;
}

// --- Time and date utilities ---
// Firestore timestamps are NOT plain JS Dates � they're Firestore Timestamp
// objects with a `.toMillis()` method. This helper safely converts any
// timestamp-like value (Firestore Timestamp, JS Date, number, string) to
// milliseconds since epoch, returning 0 for anything unparseable.
function toMillisSafe(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOneShotExpiryMs(sessionData) {
  // TTL reminder: "Time To Live" means how long one-shot data stays valid.
  const explicit = toMillisSafe(sessionData?.expiresAt);
  if (explicit > 0) return explicit;
  const createdMs = toMillisSafe(sessionData?.createdAt);
  if (createdMs > 0) return createdMs + ONE_SHOT_TTL_MS;
  return 0;
}

function isExpiredOneShotSession(sessionData) {
  if (!sessionData?.isOneShot) return false;
  const expiresMs = getOneShotExpiryMs(sessionData);
  if (!expiresMs) return false;
  return Date.now() >= expiresMs;
}

async function tryDeleteExpiredOneShotSession(sessionId, sessionData = null) {
  if (!sessionId) return false;
  const data = sessionData || {};
  if (!isExpiredOneShotSession(data)) return false;
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
    return true;
  } catch (err) {
    // Expected for non-owners when rules block delete.
    return false;
  }
}

// --- One-shot session persistence ---
// "One-shot" sessions auto-expire after 24h. We remember them in
// localStorage so a player can quickly rejoin without re-entering
// the session ID, nickname, and PIN every time.
function getRecentOneShotEntries() {
  try {
    // localStorage only stores strings. We parse JSON defensively so any
    // malformed value does not break app startup.
    const raw = localStorage.getItem(RECENT_ONE_SHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate every field so stale or tampered entries are dropped early.
    // This keeps downstream UI rendering logic simple and safe.
    return parsed.filter((entry) => {
      const sessionId = String(entry?.sessionId || "").trim();
      const joinTag = String(entry?.joinTag || "").trim();
      const nickname = String(entry?.nickname || "").trim();
      const pin = String(entry?.pin || "").trim();
      return !!sessionId && !!joinTag && !!nickname && /^\d{4,8}$/.test(pin);
    });
  } catch {
    return [];
  }
}

function saveRecentOneShotEntries(entries) {
  // Keep the list bounded so localStorage does not grow indefinitely.
  // Most-recent entries are stored first by callers.
  localStorage.setItem(RECENT_ONE_SHOT_KEY, JSON.stringify(entries.slice(0, RECENT_ONE_SHOT_MAX)));
}

function getJoinedSessionEntries() {
  try {
    const raw = localStorage.getItem(JOINED_SESSION_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => {
      const sessionId = String(entry?.sessionId || "").trim();
      if (!sessionId) return false;
      const joinTag = String(entry?.joinTag || "").trim();
      const sessionName = String(entry?.sessionName || "").trim();
      const lastSeenAtMs = Number(entry?.lastSeenAtMs || 0);
      const pin = String(entry?.pin || "").trim();
      entry.sessionId = sessionId;
      entry.joinTag = joinTag || sessionId;
      entry.sessionName = sessionName;
      entry.lastSeenAtMs = Number.isFinite(lastSeenAtMs) ? lastSeenAtMs : 0;
      entry.pin = /^\d{4,8}$/.test(pin) ? pin : "";
      return true;
    });
  } catch {
    return [];
  }
}

function saveJoinedSessionEntries(entries) {
  localStorage.setItem(JOINED_SESSION_LIST_KEY, JSON.stringify(entries.slice(0, JOINED_SESSION_LIST_MAX)));
}

function rememberJoinedSession(entry) {
  const sessionId = String(entry?.sessionId || "").trim();
  if (!sessionId) return;

  const joinTag = String(entry?.joinTag || "").trim() || sessionId;
  const sessionName = String(entry?.sessionName || "").trim();
  const nextPin = String(entry?.pin || "").trim();
  const existingAll = getJoinedSessionEntries();
  const existingMatch = existingAll.find((item) => item.sessionId === sessionId) || null;
  const existing = existingAll.filter((item) => item.sessionId !== sessionId);
  const pin = /^\d{4,8}$/.test(nextPin)
    ? nextPin
    : String(existingMatch?.pin || "").trim();

  saveJoinedSessionEntries([
    {
      sessionId,
      joinTag,
      sessionName,
      pin: /^\d{4,8}$/.test(pin) ? pin : "",
      lastSeenAtMs: Date.now(),
    },
    ...existing,
  ]);
}

function getRememberedJoinedSessionPin(sessionIdRaw) {
  const sessionId = String(sessionIdRaw || "").trim();
  if (!sessionId) return "";
  const entry = getJoinedSessionEntries().find((item) => item.sessionId === sessionId);
  const pin = String(entry?.pin || "").trim();
  return /^\d{4,8}$/.test(pin) ? pin : "";
}

function forgetJoinedSession(sessionIdRaw) {
  const sessionId = String(sessionIdRaw || "").trim();
  if (!sessionId) return;
  const next = getJoinedSessionEntries().filter((item) => item.sessionId !== sessionId);
  saveJoinedSessionEntries(next);
}

function rememberCurrentPlayerSessionForList() {
  if (state.role !== "player" || !state.sessionId) return;
  rememberJoinedSession({
    sessionId: state.sessionId,
    joinTag: state.joinTag || state.sessionId,
    sessionName: state.sessionName || "",
    pin: getRememberedJoinedSessionPin(state.sessionId),
  });
}

function rememberRecentOneShotJoin(entry) {
  // Normalize + validate input before merging into recent history.
  const sessionId = String(entry?.sessionId || "").trim();
  const joinTag = String(entry?.joinTag || "").trim();
  const nickname = String(entry?.nickname || "").trim();
  const pin = String(entry?.pin || "").trim();
  if (!sessionId || !joinTag || !nickname || !/^\d{4,8}$/.test(pin)) return;

  // De-duplicate by sessionId so one session appears once in quick-join list.
  const existing = getRecentOneShotEntries().filter((item) => item.sessionId !== sessionId);
  const payload = {
    sessionId,
    joinTag,
    nickname,
    pin,
    sessionName: String(entry?.sessionName || "").trim(),
    expiresAtMs: Number(entry?.expiresAtMs) || 0,
    lastJoinedAtMs: Date.now(),
  };
  saveRecentOneShotEntries([payload, ...existing]);
}

function formatRelativeTime(ms) {
  if (!ms) return "";
  const delta = Math.max(0, ms - Date.now());
  const mins = Math.ceil(delta / (60 * 1000));
  if (mins < 60) return `${mins}m left`;
  const hours = Math.ceil(mins / 60);
  if (hours < 48) return `${hours}h left`;
  const days = Math.ceil(hours / 24);
  return `${days}d left`;
}

async function renderRecentOneShotJoins() {
  if (!plRecentWrap || !plRecentList) return;
  plRecentWrap.classList.remove("hidden");

  // Hydration reminder: we "hydrate" UI by filling visible elements from stored/remote data.

  // Step 1: read cached entries first for instant UI feedback.
  const entries = getRecentOneShotEntries();
  if (entries.length === 0) {
    plRecentList.innerHTML = `<p class="muted small">No recent one-shots yet. Join one once, and it will appear here for quick rejoin.</p>`;
    if (plRecentMeta) plRecentMeta.textContent = "0 active";
    return;
  }

  // Step 2: validate each cached entry against Firestore in parallel.
  // Promise.all keeps this fast even when there are several recent sessions.
  const checks = await Promise.all(entries.map(async (entry) => {
    try {
      const snap = await getDoc(doc(db, "sessions", entry.sessionId));
      if (!snap.exists()) return null;
      const data = snap.data() || {};
      if (!data.isOneShot) return null;
      if (isExpiredOneShotSession(data)) {
        // Cleanup best-effort: owners can delete, non-owners are ignored.
        await tryDeleteExpiredOneShotSession(entry.sessionId, data);
        return null;
      }
      return {
        ...entry,
        joinTag: String(data.joinTag || entry.joinTag || entry.sessionId),
        sessionName: String(data.name || entry.sessionName || "Untitled One-Shot"),
        expiresAtMs: getOneShotExpiryMs(data),
      };
    } catch {
      return null;
    }
  }));

  // Step 3: persist only active entries so local cache self-heals over time.
  const active = checks.filter(Boolean);
  saveRecentOneShotEntries(active);

  if (active.length === 0) {
    plRecentList.innerHTML = `<p class="muted small">No active one-shots found. Expired sessions are removed after 24 hours.</p>`;
    if (plRecentMeta) plRecentMeta.textContent = "0 active";
    return;
  }

  if (plRecentMeta) plRecentMeta.textContent = `${active.length} active`;

  // Step 4: render quick-join buttons with TTL indicators.
  plRecentList.innerHTML = active.map((entry) => {
    const ttl = formatRelativeTime(entry.expiresAtMs);
    return `
      <button type="button" class="joinRecentItem" data-recent-session="${escapeHtml(entry.sessionId)}">
        <span>
          <span class="joinRecentItem__title">${escapeHtml(entry.sessionName || entry.joinTag)}</span>
          <span class="muted small">${escapeHtml(entry.joinTag)} � ${escapeHtml(entry.nickname)}</span>
        </span>
        <span class="muted small">${escapeHtml(ttl || "active")}</span>
      </button>
    `;
  }).join("");
}

function showOnly(screenKey) {
  // This function creates "app navigation" without page reloads.
  // We hide every screen first, then unhide only the selected one.
  //
  // BEGINNER NOTE � Single-Page App (SPA) navigation:
  // Traditional websites load a new HTML page for each view.
  // An SPA keeps ONE page loaded and toggles CSS visibility instead.
  // This is faster because there's no network round-trip to the server.
  // The tradeoff: all screen HTML lives in the DOM at once, and this
  // function manages which section the user actually sees.
  Object.values(screens).forEach((el) => el && el.classList.add("hidden"));
  screens[screenKey]?.classList.remove("hidden");

  // Trigger fade-in animation on the newly visible screen.
  const entering = screens[screenKey];
  if (entering) {
    entering.classList.remove("screen-enter");
    void entering.offsetWidth; // force reflow so animation replays
    entering.classList.add("screen-enter");
  }

  // Scroll to top so every screen starts at a clean position.
  window.scrollTo({ top: 0 });

  // body[data-screen] lets CSS target screen-specific styles like
  // showing/hiding elements that only make sense on certain screens.
  document.body.dataset.screen = screenKey;
  document.body.dataset.role = state.role || "";

  // Stop QR scanner camera if navigating away from the join screen.
  if (currentScreenKey === SCREEN_KEYS.PL_JOIN && screenKey !== SCREEN_KEYS.PL_JOIN) {
    try { stopScan(); } catch {}
  }

  currentScreenKey = screenKey;
  if (isWideGMDashboard()) {
    if (screenKey === SCREEN_KEYS.GM_DASH && gmRailTabs) {
      switchRailTab(gmRailTabs, state.gmActiveRailTab || "party", "gmActiveRailTab");
    }
    if (screenKey === SCREEN_KEYS.PLAYER_VIEW && plRailTabs) {
      switchRailTab(plRailTabs, state.plActiveRailTab || "party", "plActiveRailTab");
    }
  }
  // Clear lingering toasts on screen transition so they don't persist across views.
  if (toastStack) toastStack.innerHTML = "";
  const isSessionScreen = screenKey === SCREEN_KEYS.GM_DASH || screenKey === SCREEN_KEYS.PLAYER_VIEW || screenKey === SCREEN_KEYS.PLAYER_INVENTORY || screenKey === SCREEN_KEYS.CHAT || screenKey === SCREEN_KEYS.NOTES || screenKey === SCREEN_KEYS.SETTINGS || screenKey === SCREEN_KEYS.INFO || screenKey === SCREEN_KEYS.SETTINGS_PROFILE || screenKey === SCREEN_KEYS.CHARACTER_TEMPLATES || screenKey === SCREEN_KEYS.PROFILE;
  const hasSession = !!state.sessionId;

  // Keep top shell UI minimal until a session is active.
  try {
    if (topBar) {
      const _wasHidden = topBar.classList.contains("hidden");
      topBar.classList.toggle("hidden", !(hasSession && isSessionScreen));
      if (_wasHidden && !topBar.classList.contains("hidden")) {
        requestAnimationFrame(() => {
          topBar.classList.add("topbar--entering");
          setTimeout(() => topBar.classList.remove("topbar--entering"), UI_TIMERS.TOPBAR_REVEAL_MS);
        });
      }
    }
    if (nuggetCounter) {
      nuggetCounter.classList.toggle("hidden", !hasSession);
    }
    if (liveStatus) {
      liveStatus.classList.add("hidden");
    }
    if (bottomBar) {
      bottomBar.classList.toggle("hidden", !(hasSession && isSessionScreen));
    }
    if (btnHamburger) {
      btnHamburger.classList.toggle("hidden", !(hasSession && isSessionScreen));
    }
    if (btnNotifBell) {
      btnNotifBell.classList.toggle("hidden", !(hasSession && isSessionScreen));
    }
    // One-shot banner visible on session screens when in a one-shot session
    if (oneShotBanner) {
      oneShotBanner.classList.toggle("hidden", !(state._isOneShotSession && hasSession && isSessionScreen));
    }
    // Guest / signed-in notices on create & join screens
    if (gmCreateGuestNotice) {
      gmCreateGuestNotice.classList.toggle("hidden", !state._isOneShotIntent);
    }
    if (gmCreateHeading) {
      gmCreateHeading.textContent = state._isOneShotIntent ? "New One-Shot Session" : "New Session";
    }
    if (plJoinGuestNotice) {
      plJoinGuestNotice.classList.add("hidden");
    }
    if (plJoinSignedNotice) {
      plJoinSignedNotice.classList.toggle("hidden", !state.isSignedIn);
    }
    if (screenKey === SCREEN_KEYS.PL_JOIN) {
      renderRecentOneShotJoins().catch(() => {});
    }
  } catch (e) {}

  // Hide GM-only create button when in player role
  if (btnOpenCreateModal) btnOpenCreateModal.classList.toggle("hidden", state.role !== "dm");

  // GM FAB: replaced by inline button � keep hidden permanently
  if (gmFab) gmFab.classList.add("hidden");

  // Show inline create handout button on GM dash only
  const cInline = document.getElementById("btnCreateHandoutInline");
  if (cInline) cInline.style.display = (state.role === "dm" && screenKey === SCREEN_KEYS.GM_DASH && hasSession) ? "" : "none";

  // Close settings drawer on any screen navigation
  closeHamburgerSpeedDial();
  closeSettingsDrawer();

  try {
    if (ambienceBar) {
      // Keep ambience controls hidden by default on screen transitions.
      ambienceBar.classList.add("hidden");
      ambienceBar.setAttribute("aria-hidden", "true");
      btnOpenAmbienceBar?.classList.remove("is-active");
    }
  } catch (e) {}

  try {
    syncBottomBarActiveState(screenKey);
  } catch (e) {}

  // Show session name in Settings header when available
  try {
    if (settingsSessionInfo) {
      if (state.sessionName && state.sessionId) {
        settingsSessionInfo.textContent = `Session: ${state.sessionName}`;
        settingsSessionInfo.classList.remove("hidden");
      } else {
        settingsSessionInfo.classList.add("hidden");
      }
    }
    // Sync role switching buttons in Settings
    if (settingsRoleSection) {
      if (state.sessionId) {
        settingsRoleSection.classList.remove("hidden");
        if (btnSwitchToPlayer) btnSwitchToPlayer.classList.toggle("hidden", state.role !== "dm");
        if (btnSwitchToGM) btnSwitchToGM.classList.toggle("hidden", state.role !== "player");
        if (settingsIdentityHint) settingsIdentityHint.classList.toggle("hidden", state.role !== "dm");
        if (gmPinPrompt) gmPinPrompt.classList.add("hidden");
      } else {
        settingsRoleSection.classList.add("hidden");
      }
    }
    if (btnSwitchSession) {
      btnSwitchSession.classList.toggle("hidden", !state.sessionId);
    }
    if (btnDeleteSession) {
      btnDeleteSession.classList.toggle("hidden", !(state.sessionId && state.role === "dm"));
    }
    if (btnDiscardSession) {
      btnDiscardSession.classList.toggle("hidden", !(state.sessionId && state.role === "player"));
    }
    if (settingsSoundSection) {
      settingsSoundSection.classList.toggle("hidden", !state.sessionId);
      if (typeof syncSoundToggleUI === "function") syncSoundToggleUI();
    }
  } catch (e) {}

  if (screenKey !== SCREEN_KEYS.GM_DASH) {
    setGMSocialMode(false);
  }

  if (screenKey !== SCREEN_KEYS.SETTINGS) {
    stopCharacterSheetCamera();
  }

  if (screenKey === SCREEN_KEYS.NOTES) {
    loadNotesForCurrentSession();
  }
  if (screenKey === SCREEN_KEYS.CHAT || screenKey === SCREEN_KEYS.GM_DASH || screenKey === SCREEN_KEYS.PLAYER_VIEW) {
    subscribePartyChat();
  }
}

function getDefaultRoleScreen() {
  return state.role === "dm" ? "gmDash" : "plView";
}

function resolveScreenKey(screenKey) {
  const key = String(screenKey || "").trim();
  if (key && screens[key]) return key;
  return getDefaultRoleScreen();
}

function syncBottomBarActiveState(screenKey) {
  // Compute a small "screen-state matrix" first.
  // This makes each button toggle below easy to reason about.
  const isGMView = screenKey === SCREEN_KEYS.GM_DASH;
  const isPlayerView = screenKey === SCREEN_KEYS.PLAYER_VIEW;
  const isInventoryView = screenKey === SCREEN_KEYS.PLAYER_INVENTORY;
  const isProfileView = screenKey === SCREEN_KEYS.PROFILE || screenKey === SCREEN_KEYS.SETTINGS_PROFILE;
  const hasSession = !!state.sessionId;

  // Handouts tab is active on gmDash (without social mode) or plView
  if (btnOpenHandouts) {
    btnOpenHandouts.classList.toggle("hidden", !hasSession);
    const socialOpen = gmSplit?.classList.contains("social-mode");
    btnOpenHandouts.classList.toggle("is-active", (isGMView && !socialOpen) || isPlayerView);
  }

  // Music tab: always available when session active
  if (btnOpenAmbienceBar) {
    btnOpenAmbienceBar.classList.toggle("hidden", !hasSession);
  }

  // Profile tab
  if (btnOpenProfile) {
    btnOpenProfile.classList.toggle("is-active", isProfileView);
  }

  // Inventory tab
  if (btnOpenInventory) {
    btnOpenInventory.classList.toggle("hidden", !hasSession);
    btnOpenInventory.classList.toggle("is-active", isInventoryView);
  }

  // Notes tab
  const isNotesView = screenKey === SCREEN_KEYS.NOTES;
  if (btnOpenNotes) {
    btnOpenNotes.classList.toggle("hidden", !hasSession);
    btnOpenNotes.classList.toggle("is-active", isNotesView);
  }

  // Social button in top bar � GM-only
  if (btnTopBarSocial) {
    btnTopBarSocial.classList.toggle("hidden", state.role !== "dm" || !hasSession);
  }

  syncHamburgerQuickActions();
}

function setGMSocialMode(isOpen) {
  if (!gmSocialPanel || !gmHandoutsPanel || !gmSplit) return;
  if (isWideGMDashboard()) {
    syncGMDashboardLayout();
    syncHamburgerQuickActions();
    if (isOpen) {
      gmSocialPanel.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
    return;
  }
  const open = !!isOpen;

  gmSplit.classList.toggle("social-mode", open);
  gmSocialPanel.classList.toggle("hidden", !open);
  gmHandoutsPanel.classList.toggle("hidden", open);
  if (gmDashTitle) gmDashTitle.textContent = open ? "Social" : "Handouts";

  // Hide inline create handout button when social panel is open
  const cInline = document.getElementById("btnCreateHandoutInline");
  if (cInline) cInline.style.display = (open || state.role !== "dm") ? "none" : "";

  if (btnToggleSocial) {
    btnToggleSocial.classList.toggle("is-active", open);
    btnToggleSocial.setAttribute("aria-pressed", String(open));
    btnToggleSocial.title = open ? "Hide social" : "Show social";
    // Clear notification dot when opening social panel.
    if (open) btnToggleSocial.querySelector(".notif-dot")?.remove();
  }

  if (open) {
    ambienceBar?.classList.add("hidden");
    ambienceBar?.setAttribute("aria-hidden", "true");
    btnOpenAmbienceBar?.classList.remove("is-active");
  }

  syncHamburgerQuickActions();
}

// ---- Settings drawer open/close ----
let settingsDrawerCloseTimer = 0;

function openSettingsDrawer() {
  if (!settingsDrawer) return;
  closeHamburgerSpeedDial();
  if (settingsDrawerCloseTimer) {
    clearTimeout(settingsDrawerCloseTimer);
    settingsDrawerCloseTimer = 0;
  }
  settingsDrawer.classList.remove("is-closing");
  settingsDrawer.classList.add("is-open");
  settingsDrawer.setAttribute("aria-hidden", "false");
  updateSettingsButtons();
}

function closeSettingsDrawer() {
  if (!settingsDrawer) return;
  settingsDrawer.classList.remove("is-open");
  settingsDrawer.classList.add("is-closing");
  if (settingsDrawerCloseTimer) clearTimeout(settingsDrawerCloseTimer);
  settingsDrawerCloseTimer = setTimeout(() => {
    settingsDrawer.classList.remove("is-closing");
    settingsDrawer.setAttribute("aria-hidden", "true");
    settingsDrawerCloseTimer = 0;
  }, 360);
}

let speedDialHideTimer = 0;
const HAMBURGER_POS_STORAGE_KEY = "tv_fabPos";
const HAMBURGER_DEFAULT_POS = Object.freeze({ right: 20, bottom: 60 });
const HAMBURGER_EDGE_MARGIN = 12;
const HAMBURGER_MOUSE_DRAG_THRESHOLD = 4;
const HAMBURGER_TOUCH_CANCEL_THRESHOLD = 8;
const HAMBURGER_DIAL_GAP = 12;
let hamburgerDragState = null;
let hamburgerDragEnabled = true;

function getHamburgerCurrentPosition() {
  if (!btnHamburger) return { ...HAMBURGER_DEFAULT_POS };
  const rect = btnHamburger.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) {
    return { ...HAMBURGER_DEFAULT_POS };
  }
  return {
    right: Math.max(HAMBURGER_EDGE_MARGIN, Math.round(window.innerWidth - rect.right)),
    bottom: Math.max(HAMBURGER_EDGE_MARGIN, Math.round(window.innerHeight - rect.bottom)),
  };
}

function getHamburgerViewportBounds() {
  const topInset = HAMBURGER_EDGE_MARGIN + (topBar && !topBar.classList.contains("hidden") ? topBar.offsetHeight : 0);
  const bottomInset = HAMBURGER_EDGE_MARGIN + (bottomBar && !bottomBar.classList.contains("hidden") ? bottomBar.offsetHeight : 0);
  return {
    minLeft: HAMBURGER_EDGE_MARGIN,
    maxRight: window.innerWidth - HAMBURGER_EDGE_MARGIN,
    minTop: topInset,
    maxBottom: window.innerHeight - bottomInset,
  };
}

function clampHamburgerPosition(position = {}) {
  if (!btnHamburger) return { ...HAMBURGER_DEFAULT_POS };
  const width = btnHamburger.offsetWidth || 96;
  const height = btnHamburger.offsetHeight || 48;
  const bounds = getHamburgerViewportBounds();
  const requestedRight = Number.isFinite(Number(position.right)) ? Number(position.right) : HAMBURGER_DEFAULT_POS.right;
  const requestedBottom = Number.isFinite(Number(position.bottom)) ? Number(position.bottom) : HAMBURGER_DEFAULT_POS.bottom;
  const nextLeft = Math.min(
    Math.max(bounds.minLeft, window.innerWidth - requestedRight - width),
    Math.max(bounds.minLeft, bounds.maxRight - width)
  );
  const nextTop = Math.min(
    Math.max(bounds.minTop, window.innerHeight - requestedBottom - height),
    Math.max(bounds.minTop, bounds.maxBottom - height)
  );
  return {
    right: Math.round(window.innerWidth - nextLeft - width),
    bottom: Math.round(window.innerHeight - nextTop - height),
  };
}

function syncHamburgerSpeedDialPosition() {
  if (!btnHamburger || !hamburgerSpeedDial) return;
  const rect = btnHamburger.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return;
  hamburgerSpeedDial.style.right = `${Math.max(HAMBURGER_EDGE_MARGIN, Math.round(window.innerWidth - rect.right))}px`;
  hamburgerSpeedDial.style.bottom = `${Math.max(HAMBURGER_EDGE_MARGIN, Math.round(window.innerHeight - rect.top + HAMBURGER_DIAL_GAP))}px`;
}

function persistHamburgerPosition(position) {
  try {
    localStorage.setItem(HAMBURGER_POS_STORAGE_KEY, JSON.stringify(position));
  } catch (_) {}
}

function applyHamburgerPosition(position = {}, options = {}) {
  if (!btnHamburger) return { ...HAMBURGER_DEFAULT_POS };
  const next = clampHamburgerPosition(position);
  btnHamburger.style.right = `${next.right}px`;
  btnHamburger.style.bottom = `${next.bottom}px`;
  syncHamburgerSpeedDialPosition();
  if (options.persist) persistHamburgerPosition(next);
  return next;
}

function loadHamburgerPosition() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(HAMBURGER_POS_STORAGE_KEY) || "null");
  } catch (_) {
    saved = null;
  }
  return applyHamburgerPosition(saved || HAMBURGER_DEFAULT_POS);
}

function setHamburgerTutorialLock(isLocked) {
  hamburgerDragEnabled = !isLocked;
  if (!btnHamburger) return;
  btnHamburger.classList.toggle("is-tutorial-locked", !!isLocked);
  if (isLocked) {
    btnHamburger.classList.remove("is-dragging");
    applyHamburgerPosition(getHamburgerCurrentPosition());
    closeHamburgerSpeedDial();
  }
}

function setHamburgerDialButtonState(button, options = {}) {
  if (!button) return;
  const visible = !!options.visible;
  button.classList.toggle("hidden", !visible);
  button.setAttribute("aria-hidden", visible ? "false" : "true");
  button.disabled = !visible || !!options.disabled;
  button.classList.toggle("is-active", visible && !!options.active);
  if (options.label) {
    const textNode = button.querySelector(".speed-dial-btn__text");
    if (textNode) textNode.textContent = options.label;
    button.setAttribute("aria-label", options.label);
    button.title = options.label;
  }
}

function syncHamburgerQuickActions() {
  if (!hamburgerSpeedDial) return;

  const hasSession = !!state.sessionId;
  const isGM = state.role === "dm";
  const socialOpen = !!gmSplit?.classList.contains("social-mode");
  const ambienceOpen = ambienceBar ? !ambienceBar.classList.contains("hidden") : false;
  const onHandouts = currentScreenKey === SCREEN_KEYS.PLAYER_VIEW || (currentScreenKey === SCREEN_KEYS.GM_DASH && !socialOpen);
  const onInventory = currentScreenKey === SCREEN_KEYS.PLAYER_INVENTORY;
  const onNotes = currentScreenKey === SCREEN_KEYS.NOTES;

  setHamburgerDialButtonState(btnDialHandouts, {
    visible: hasSession,
    active: onHandouts,
    label: "Handouts",
  });

  setHamburgerDialButtonState(btnDialSocial, {
    visible: hasSession && isGM,
    active: currentScreenKey === SCREEN_KEYS.GM_DASH && socialOpen,
    label: "Session",
  });

  setHamburgerDialButtonState(btnDialAtmosphere, {
    visible: hasSession,
    active: isGM ? ambienceOpen : !!soundEnabled,
    label: isGM ? "Atmosphere" : soundEnabled ? "Sound On" : "Sound Off",
  });

  setHamburgerDialButtonState(btnDialInventory, {
    visible: hasSession && !isGM,
    active: onInventory,
    label: "Inventory",
  });

  setHamburgerDialButtonState(btnDialNotes, {
    visible: hasSession,
    active: onNotes,
    label: "Notes",
  });

  setHamburgerDialButtonState(btnDialSettings, {
    visible: hasSession,
    active: false,
    label: "Settings",
  });
}

function setModalVisibility(el, isOpen) {
  if (!el) return;
  // Before hiding, move focus away from any child element that might have focus
  if (!isOpen && document.activeElement && el.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  el.classList.toggle("hidden", !isOpen);
  el.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

// Pair with the CSS @keyframes modalBgIn/Out + modalCardIn/Out.
// Calling these instead of direct .hidden toggles gives all overlay families
// the same entrance/exit choreography.
function animateModalIn(el) {
  if (!el) return;
  if (el._modalLeaveTimer) {
    clearTimeout(el._modalLeaveTimer);
    el._modalLeaveTimer = 0;
  }
  setModalVisibility(el, true);
  el.classList.remove("modal--leaving");
  el.classList.add("modal--entering");
  el.addEventListener("animationend", () => el.classList.remove("modal--entering"), { once: true });
}

function animateModalOut(el) {
  if (!el) return;
  el.classList.remove("modal--entering");
  el.classList.add("modal--leaving");
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    setModalVisibility(el, false);
    el.classList.remove("modal--leaving");
    el._modalLeaveTimer = 0;
  };
  el.addEventListener("animationend", finish, { once: true });
  if (el._modalLeaveTimer) clearTimeout(el._modalLeaveTimer);
  el._modalLeaveTimer = setTimeout(finish, UI_TIMERS.MODAL_LEAVE_MS);
}

function isWideGMDashboard() {
  return window.matchMedia("(min-width: 1100px)").matches;
}

// ---- Rail tab switching (desktop tabbed sidebar) ----
function switchRailTab(containerEl, tabKey, stateKey) {
  if (!containerEl) return;
  const bar = containerEl.querySelector(".railTabs__bar");
  if (!bar) return;
  state[stateKey] = tabKey;
  bar.querySelectorAll(".railTabs__tab").forEach(btn => {
    const isActive = btn.dataset.tab === tabKey;
    btn.classList.toggle("railTabs__tab--active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
    if (isActive) btn.classList.remove("railTabs__tab--notify");
  });
  containerEl.querySelectorAll(":scope > [role='tabpanel']").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== btn_panelId(containerEl, tabKey));
  });
}

function btn_panelId(container, tabKey) {
  const tab = container.querySelector(`.railTabs__tab[data-tab="${tabKey}"]`);
  return tab ? tab.getAttribute("aria-controls") : "";
}

function updateRailBadge(badgeEl, count) {
  if (!badgeEl) return;
  badgeEl.textContent = count > 0 ? String(count) : "";
  badgeEl.classList.toggle("hidden", count < 1);
}

function getAmbienceTrackLabel(track) {
  const labels = {
    tavern: "Tavern",
    forest: "Forest",
    dungeon: "Dungeon",
    battle: "Battle",
    ocean: "Ocean",
    mysterious: "Mysterious",
  };
  return labels[String(track || "tavern").trim()] || "Tavern";
}

function renderAtmospherePanel(ambience = null) {
  const track = ambience?.track ?? gmAmbience?.value ?? "tavern";
  const volume = Number(ambience?.volume ?? gmVolume?.value ?? 0.6);
  const isPlaying = !!ambience?.isPlaying;
  if (gmAtmosphereTrack) gmAtmosphereTrack.textContent = getAmbienceTrackLabel(track);
  if (gmAtmosphereStatus) gmAtmosphereStatus.textContent = isPlaying ? "Playing" : "Paused";
  if (gmAtmosphereVolume) gmAtmosphereVolume.textContent = `${Math.round(volume * 100)}%`;
}

function syncGMDashboardLayout() {
  const wide = isWideGMDashboard();
  if (btnCloseSocial) btnCloseSocial.classList.toggle("hidden", wide);
  if (!wide) return;

  gmSplit?.classList.remove("social-mode");
  gmSocialPanel?.classList.remove("hidden");
  gmHandoutsPanel?.classList.remove("hidden");
  gmPartyPanel?.classList.remove("hidden");
  if (gmDashTitle) gmDashTitle.textContent = "Handouts";

  const cInline = document.getElementById("btnCreateHandoutInline");
  if (cInline) cInline.style.display = state.role === "dm" ? "" : "none";

  if (btnToggleSocial) {
    btnToggleSocial.classList.remove("is-active");
    btnToggleSocial.setAttribute("aria-pressed", "false");
    btnToggleSocial.title = "Session info";
  }
}

function openHamburgerSpeedDial() {
  if (!hamburgerSpeedDial) return;
  syncHamburgerQuickActions();
  syncHamburgerSpeedDialPosition();
  if (speedDialHideTimer) {
    clearTimeout(speedDialHideTimer);
    speedDialHideTimer = 0;
  }
  hamburgerSpeedDial.classList.remove("hidden");
  requestAnimationFrame(() => {
    hamburgerSpeedDial.classList.add("is-open");
  });
  hamburgerSpeedDial.setAttribute("aria-hidden", "false");
  btnHamburger?.setAttribute("aria-expanded", "true");
  btnHamburger?.classList.add("is-open");
}

function closeHamburgerSpeedDial() {
  if (!hamburgerSpeedDial) return;
  // Before hiding, move focus away from any child element that might have focus
  if (document.activeElement && hamburgerSpeedDial.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  hamburgerSpeedDial.classList.remove("is-open");
  if (speedDialHideTimer) clearTimeout(speedDialHideTimer);
  speedDialHideTimer = setTimeout(() => {
    hamburgerSpeedDial.classList.add("hidden");
    speedDialHideTimer = 0;
  }, 180);
  hamburgerSpeedDial.setAttribute("aria-hidden", "true");
  btnHamburger?.setAttribute("aria-expanded", "false");
  btnHamburger?.classList.remove("is-open");
}

function toggleHamburgerSpeedDial() {
  if (!hamburgerSpeedDial) return;
  const willOpen = hamburgerSpeedDial.classList.contains("hidden") || !hamburgerSpeedDial.classList.contains("is-open");
  if (willOpen) openHamburgerSpeedDial();
  else closeHamburgerSpeedDial();
}

function getDefaultQuickStats() {
  return {
    level: "",
    armorRating: "",
    hitPoints: "",
    initiative: "",
    customStats: [],
    bonuses: [],
  };
}

function isPermissionDenied(err) {
  const code = String(err?.code || "");
  return code === "permission-denied" || code === "firestore/permission-denied";
}

function normalizeSpellEntry(entry) {
  if (typeof entry === "string") {
    const name = String(entry || "").trim().slice(0, 80);
    if (!name) return null;
    return { name, school: "", level: "", description: "" };
  }

  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name || "").trim().slice(0, 80);
  if (!name) return null;

  return {
    name,
    school: String(entry.school || "").trim().slice(0, 40),
    level: String(entry.level || "").trim().slice(0, 24),
    description: String(entry.description || "").trim().slice(0, 280),
  };
}

function normalizeSpellList(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => normalizeSpellEntry(entry))
    .filter(Boolean)
    .slice(0, 40);
}

function sanitizeProfileRecord(data, uid) {
  const quickStats = getDefaultQuickStats();
  PROFILE_STAT_KEYS.forEach((key) => {
    quickStats[key] = String(data?.quickStats?.[key] ?? "").trim().slice(0, 24);
  });
  // Preserve active common stats (opt-in ability scores)
  COMMON_STAT_KEYS.forEach((key) => {
    if (data?.quickStats?.[key] != null && data.quickStats[key] !== "") {
      quickStats[key] = String(data.quickStats[key]).trim().slice(0, 24);
    }
  });
  // Sanitize custom stats
  quickStats.customStats = Array.isArray(data?.quickStats?.customStats)
    ? data.quickStats.customStats
        .filter((e) => e && typeof e === "object" && String(e.name || "").trim())
        .map((e) => ({
          id: String(e.id || "").trim().slice(0, 40) || genId(),
          name: String(e.name || "").trim().slice(0, 40),
          value: String(e.value || "").trim().slice(0, 24),
        }))
        .slice(0, 30)
    : [];
  // Sanitize bonuses
  quickStats.bonuses = Array.isArray(data?.quickStats?.bonuses)
    ? data.quickStats.bonuses
        .filter((e) => e && typeof e === "object" && String(e.name || "").trim())
        .map((e) => ({
          id: String(e.id || "").trim().slice(0, 40) || genId(),
          name: String(e.name || "").trim().slice(0, 40),
          value: String(e.value || "").trim().slice(0, 24),
          appliesTo: Array.isArray(e.appliesTo)
            ? e.appliesTo.map((s) => String(s).trim().slice(0, 40)).filter(Boolean).slice(0, 20)
            : [],
        }))
        .slice(0, 20)
    : [];

  const spells = normalizeSpellList(data?.spells);

  return {
    uid,
    displayName: String(data?.displayName ?? "").trim().slice(0, 60),
    bio: String(data?.bio ?? "").trim().slice(0, 600),
    avatarUrl: String(data?.avatarUrl ?? "").trim(),
    avatarStoragePath: String(data?.avatarStoragePath ?? "").trim(),
    quickStats,
    spells,
  };
}

function normalizeProfileRole(role) {
  return role === "dm" ? "dm" : "player";
}

function profileCacheKey(uid, role = "player") {
  return `${uid}::${normalizeProfileRole(role)}`;
}

const PROFILE_CACHE_TTL = 120_000; // 2 minutes

function getCachedProfile(uid, role = "player") {
  const entry = profileCache.get(profileCacheKey(uid, role));
  if (!entry) return undefined;
  if (Date.now() - entry.ts > PROFILE_CACHE_TTL) return undefined;
  return entry.profile;
}

function setCachedProfile(uid, role, profile) {
  profileCache.set(profileCacheKey(uid, role), { profile, ts: Date.now() });
}

function pickRoleProfileData(userData, role) {
  const normalizedRole = normalizeProfileRole(role);
  const roleData = userData?.roleProfiles?.[normalizedRole];
  if (roleData && typeof roleData === "object") return roleData;

  // Backward compatibility with legacy single-profile documents.
  return {
    displayName: userData?.displayName,
    bio: userData?.bio,
    avatarUrl: userData?.avatarUrl,
    avatarStoragePath: userData?.avatarStoragePath,
    quickStats: userData?.quickStats,
    spells: userData?.spells,
  };
}

function getUserProfileRef(uid) {
  return doc(db, "users", uid);
}

async function loadUserProfile(uid, { role = "player", force = false } = {}) {
  const normalizedRole = normalizeProfileRole(role);
  if (!uid) return sanitizeProfileRecord({}, "");
  if (!force) {
    const cached = getCachedProfile(uid, normalizedRole);
    if (cached) return cached;
  }

  try {
    const snap = await getDoc(getUserProfileRef(uid));
    const rawData = snap.exists() ? snap.data() : {};
    const profile = sanitizeProfileRecord(pickRoleProfileData(rawData, normalizedRole), uid);
    setCachedProfile(uid, normalizedRole, profile);
    return profile;
  } catch (err) {
    if (isPermissionDenied(err)) {
      const fallback = sanitizeProfileRecord({}, uid);
      setCachedProfile(uid, normalizedRole, fallback);
      return fallback;
    }
    throw err;
  }
}

// Returns `url` if truthy, otherwise picks a stable deterministic placeholder
// image from EMPTY_PROFILE_PLACEHOLDER_URLS based on a hash of the uid.
// This ensures a placeholder PNG is always shown, never a blank avatar slot.
function resolveDisplayAvatar(url, uid) {
  const trimmed = String(url || "").trim();
  if (trimmed) return trimmed;
  if (!EMPTY_PROFILE_PLACEHOLDER_URLS || !EMPTY_PROFILE_PLACEHOLDER_URLS.length) return "";
  const hash = String(uid || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return EMPTY_PROFILE_PLACEHOLDER_URLS[hash % EMPTY_PROFILE_PLACEHOLDER_URLS.length];
}

// ─── Dominant colour extraction ──────────────────────────────────────────────
// Draws an image onto a tiny canvas and picks the most-frequent vivid pixel
// colour. Used to tint party-row left borders and player-card banners with a
// hue derived from the player's or NPC's portrait.
const _dominantColorCache = new Map();
const AVATAR_COLOR_VIVID_MULTIPLIER = 1.2;

function brightenRgbColorString(rgbString, mix = 0.28) {
  const match = String(rgbString || "").match(/^rgb\((\d+),(\d+),(\d+)\)$/);
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const brighten = (v) => Math.max(108, Math.min(255, Math.round(v + (255 - v) * mix)));
  return `rgb(${brighten(r)},${brighten(g)},${brighten(b)})`;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
    case gn: h = (bn - rn) / d + 2; break;
    default: h = (rn - gn) / d + 4; break;
  }
  h /= 6;
  return { h, s, l };
}

function hue2rgb(p, q, t) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return { r, g, b };
}

function makeRgbString(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

function scaleWithVividMode(value, cap = 1) {
  return Math.min(cap, Number(value) * AVATAR_COLOR_VIVID_MULTIPLIER);
}

function vibrantizeRgbColorString(rgbString, options = {}) {
  const match = String(rgbString || "").match(/^rgb\((\d+),(\d+),(\d+)\)$/);
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const { h, s, l } = rgbToHsl(r, g, b);
  const minSat = scaleWithVividMode(Number(options.minSat ?? 0.62), 0.95);
  const satBoost = scaleWithVividMode(Number(options.satBoost ?? 0.28), 0.45);
  const minLight = scaleWithVividMode(Number(options.minLight ?? 0.5), 0.82);
  const lightBoost = scaleWithVividMode(Number(options.lightBoost ?? 0.2), 0.34);
  const nextS = Math.min(0.96, Math.max(minSat, s + satBoost));
  const nextL = Math.min(0.84, Math.max(minLight, l + lightBoost));
  const next = hslToRgb(h, nextS, nextL);
  return makeRgbString(next.r, next.g, next.b);
}

function extractDominantColor(imgSrc) {
  if (!imgSrc) return Promise.resolve(null);
  if (_dominantColorCache.has(imgSrc)) return Promise.resolve(_dominantColorCache.get(imgSrc));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const SIZE = 24;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const brightness = max / 255;
          const saturation = max === 0 ? 0 : (max - min) / max;
          if (brightness < 0.2 || brightness > 0.98) continue;
          if (saturation < 0.2) continue;
          const qr = Math.round(r / 20) * 20;
          const qg = Math.round(g / 20) * 20;
          const qb = Math.round(b / 20) * 20;
          const key = `${qr},${qg},${qb}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        let bestKey = null, bestScore = 0;
        for (const [key, count] of Object.entries(buckets)) {
          if (count > bestScore) { bestScore = count; bestKey = key; }
        }
        const baseColor = bestKey ? `rgb(${bestKey})` : null;
        const color = baseColor
          ? (vibrantizeRgbColorString(baseColor) || brightenRgbColorString(baseColor, 0.18) || baseColor)
          : null;
        _dominantColorCache.set(imgSrc, color);
        resolve(color);
      } catch {
        _dominantColorCache.set(imgSrc, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      _dominantColorCache.set(imgSrc, null);
      resolve(null);
    };
    img.src = imgSrc;
  });
}

// For live surfaces (bottom bar + profile hero), avoid image placeholder files
// and use the built-in SVG fallback instead. This sidesteps mobile renderer
// bugs where large placeholder PNGs can escape clipping during screen swaps.
function resolveLiveAvatar(url) {
  return String(url || "").trim();
}

function setProfileAvatarPreview(url) {
  const resolved = resolveDisplayAvatar(url, state.uid);
  if (profileAvatarPreview) {
    profileAvatarPreview.classList.toggle("hidden", !resolved);
    if (resolved) profileAvatarPreview.src = resolved;
    else profileAvatarPreview.removeAttribute("src");
  }
  profileAvatarPlaceholder?.classList.toggle("hidden", !!resolved);
}

function updateTopBarAvatar(url) {
  if (!bottomBarAvatarImg) return;
  const src = resolveLiveAvatar(url);
  bottomBarAvatarImg.classList.toggle("hidden", !src);
  if (src) bottomBarAvatarImg.src = src;
  else bottomBarAvatarImg.removeAttribute("src");
  if (PROFILE_AVATAR_DIAG) {
    requestAnimationFrame(() => logAvatarDiagnostics("updateTopBarAvatar:raf1", bottomBarAvatarImg));
    requestAnimationFrame(() => requestAnimationFrame(() => logAvatarDiagnostics("updateTopBarAvatar:raf2", bottomBarAvatarImg)));
  }
}

function applyProfileToEditor(profile, canEdit) {
  profileEditorIsEditable = canEdit;
  profileDisplayName && (profileDisplayName.value = profile.displayName || "");
  profileBio && (profileBio.value = profile.bio || "");
  PROFILE_STAT_KEYS.forEach((key) => {
    const input = profileInputByKey[key];
    if (input) input.value = profile.quickStats?.[key] ?? "";
  });
  setProfileAvatarPreview(profile.avatarUrl || "");

  // Reset and hydrate dynamic stats from profile data
  dynamicStats = {
    commonStats: { strength: null, dexterity: null, constitution: null, intelligence: null, wisdom: null, charisma: null },
    customStats: [],
    bonuses: [],
  };
  COMMON_STAT_KEYS.forEach((key) => {
    const val = profile.quickStats?.[key];
    if (val != null && val !== "") dynamicStats.commonStats[key] = String(val);
  });
  if (Array.isArray(profile.quickStats?.customStats)) {
    dynamicStats.customStats = profile.quickStats.customStats.map((e) => ({
      id: e.id || genId(),
      name: String(e.name || ""),
      value: String(e.value || ""),
    }));
  }
  if (Array.isArray(profile.quickStats?.bonuses)) {
    dynamicStats.bonuses = profile.quickStats.bonuses.map((e) => ({
      id: e.id || genId(),
      name: String(e.name || ""),
      value: String(e.value || ""),
      appliesTo: Array.isArray(e.appliesTo) ? [...e.appliesTo] : [],
    }));
  }
  renderAllDynamic();

  const disabled = !canEdit;
  profileDisplayName && (profileDisplayName.disabled = disabled);
  profileBio && (profileBio.disabled = disabled);
  profileAvatarFile && (profileAvatarFile.disabled = disabled);
  btnScanCharacterSheet && (btnScanCharacterSheet.disabled = disabled || ocrInProgress);
  btnCaptureCharacterSheet && (btnCaptureCharacterSheet.disabled = disabled || ocrInProgress);
  btnCloseCharacterSheetCamera && (btnCloseCharacterSheetCamera.disabled = disabled || ocrInProgress);
  btnSaveProfile && (btnSaveProfile.disabled = disabled);
  PROFILE_STAT_KEYS.forEach((key) => {
    const input = profileInputByKey[key];
    if (input) input.disabled = disabled;
  });
  // Disable/enable stat action buttons
  const _btnAddCommonStats = document.getElementById("btnAddCommonStats");
  const _btnAddCustomStat = document.getElementById("btnAddCustomStat");
  const _btnAddBonus = document.getElementById("btnAddBonus");
  if (_btnAddCommonStats) _btnAddCommonStats.disabled = disabled;
  if (_btnAddCustomStat) _btnAddCustomStat.disabled = disabled;
  if (_btnAddBonus) _btnAddBonus.disabled = disabled;

  if (profileContextMsg) {
    profileContextMsg.classList.toggle("hidden", canEdit);
    if (!canEdit) {
      const name = profile.displayName || "This player";
      profileContextMsg.textContent = `${name} profile is view-only. You can edit your own profile from Settings.`;
    } else {
      profileContextMsg.textContent = "";
    }
  }
}

function stopCharacterSheetCamera() {
  if (characterSheetVideo) {
    characterSheetVideo.pause();
    characterSheetVideo.srcObject = null;
  }
  if (characterSheetStream) {
    characterSheetStream.getTracks().forEach((track) => track.stop());
    characterSheetStream = null;
  }
  characterSheetCameraPanel?.classList.add("hidden");
}

async function openCharacterSheetCamera() {
  if (!state.uid || profileEditingUid !== state.uid) {
    profileScanStatus && (profileScanStatus.textContent = "Only your own profile can be scanned.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    profileScanStatus && (profileScanStatus.textContent = "Camera API unavailable. Choose a photo instead.");
    characterSheetPhoto?.click();
    return;
  }

  stopCharacterSheetCamera();
  profileScanStatus && (profileScanStatus.textContent = "Opening camera...");

  try {
    characterSheetStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
      },
      audio: false,
    });

    if (!characterSheetVideo) {
      throw new Error("Camera preview element missing");
    }

    characterSheetVideo.srcObject = characterSheetStream;
    await characterSheetVideo.play();
    characterSheetCameraPanel?.classList.remove("hidden");
    profileScanStatus && (profileScanStatus.textContent = "Frame the sheet and press Capture.");
  } catch (err) {
    console.error("Open character sheet camera failed:", err);
    stopCharacterSheetCamera();
    profileScanStatus && (profileScanStatus.textContent = "Camera access denied/unavailable. Choose a photo instead.");
    characterSheetPhoto?.click();
  }
}

async function captureCharacterSheetFromCamera() {
  if (!characterSheetVideo || !characterSheetVideo.videoWidth || !characterSheetVideo.videoHeight) {
    profileScanStatus && (profileScanStatus.textContent = "Camera is not ready yet.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = characterSheetVideo.videoWidth;
  canvas.height = characterSheetVideo.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    profileScanStatus && (profileScanStatus.textContent = "Could not capture frame.");
    return;
  }

  ctx.drawImage(characterSheetVideo, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
  stopCharacterSheetCamera();
  if (!blob) {
    profileScanStatus && (profileScanStatus.textContent = "Capture failed. Try again.");
    return;
  }
  await scanCharacterSheetAndFill(blob);
}

function normalizeOcrText(rawText) {
  // OCR reminder: Optical Character Recognition converts text in images into machine-readable text.
  // OCR output often includes smart quotes, non-breaking spaces, and
  // repeated newlines. This canonicalization improves regex reliability.
  return String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[��]/g, '"')
    .replace(/[�]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseCharacterSheetText(rawText) {
  // Regex reminder: regular expressions are text patterns used to find structured values.
  // OCR parsing strategy:
  // 1) Normalize text into a consistent format.
  // 2) Use multiple regex patterns per field (for sheet variations).
  // 3) Fill a strict output schema used by profile editor UI.
  const text = normalizeOcrText(rawText);
  const upperText = text.toUpperCase();
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  const findStat = (patterns) => {
    // Try patterns in order; first successful capture wins.
    // Ordered fallbacks let us support multiple sheet templates.
    for (const pattern of patterns) {
      const match = upperText.match(pattern);
      if (match?.[1]) return String(match[1]).trim();
    }
    return "";
  };

  const parsed = {
    displayName: "",
    bio: "",
    quickStats: getDefaultQuickStats(),
  };

  // Name extraction prefers explicit "Character Name:" style fields,
  // then falls back to reading the next line after a name anchor.
  const explicitNameMatch = text.match(/(?:CHARACTER\s*NAME|NAME)\s*[:\-]\s*([^\n]{2,60})/i);
  if (explicitNameMatch?.[1]) {
    parsed.displayName = explicitNameMatch[1].trim();
  } else {
    const nameAnchorIndex = lines.findIndex((line) => /character\s*name/i.test(line));
    if (nameAnchorIndex >= 0 && lines[nameAnchorIndex + 1]) {
      parsed.displayName = lines[nameAnchorIndex + 1].replace(/[^a-zA-Z\s'\-]/g, "").trim();
    }
  }

  // Each stat can appear with aliases (e.g. AC vs Armor Class).
  // We map many aliases into one normalized quickStats shape.
  parsed.quickStats.level = findStat([/(?:\bLEVEL\b|\bLVL\b|\bLV\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.armorRating = findStat([
    /(?:ARMOR\s*RATING|ARMOR\s*CLASS|\bAC\b)\s*[:\-]?\s*(\d{1,3})/i,
    /\bAC\b\s*(\d{1,3})/i,
  ]);
  parsed.quickStats.hitPoints = findStat([
    /(?:HIT\s*POINTS?|\bHP\b)\s*[:\-]?\s*(\d{1,4})(?:\s*\/\s*\d{1,4})?/i,
    /(?:MAX\s*HP)\s*[:\-]?\s*(\d{1,4})/i,
  ]);
  parsed.quickStats.initiative = findStat([
    /(?:INITIATIVE|\bINIT\b)\s*[:\-]?\s*([+\-]?\d{1,2})/i,
  ]);
  parsed.quickStats.strength = findStat([/(?:\bSTRENGTH\b|\bSTR\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.dexterity = findStat([/(?:\bDEXTERITY\b|\bDEX\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.constitution = findStat([/(?:\bCONSTITUTION\b|\bCON\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.intelligence = findStat([/(?:\bINTELLIGENCE\b|\bINT\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.wisdom = findStat([/(?:\bWISDOM\b|\bWIS\b)\s*[:\-]?\s*(\d{1,2})/i]);
  parsed.quickStats.charisma = findStat([/(?:\bCHARISMA\b|\bCHA\b)\s*[:\-]?\s*(\d{1,2})/i]);

  // Optional "bio" summary is synthesized from common sheet identity fields.
  // We only include fields that were actually detected.
  const race = text.match(/\bRACE\b\s*[:\-]\s*([^\n]{1,40})/i)?.[1]?.trim() || "";
  const klass = text.match(/\bCLASS\b\s*[:\-]\s*([^\n]{1,40})/i)?.[1]?.trim() || "";
  const background = text.match(/\bBACKGROUND\b\s*[:\-]\s*([^\n]{1,60})/i)?.[1]?.trim() || "";
  const bioParts = [race, klass, background].filter(Boolean);
  if (bioParts.length > 0) {
    parsed.bio = bioParts.join(" � ");
  }

  return parsed;
}

async function preprocessImageForOcr(file) {
  try {
    // createImageBitmap is faster and memory-friendlier than loading
    // through <img> tags for processing pipelines.
    if (!("createImageBitmap" in window)) return file;
    const bitmap = await createImageBitmap(file);
    // Scale down oversized photos to reduce OCR latency while preserving detail.
    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    // Hint reminder: this canvas hint asks browser engines to optimize frequent pixel reads.
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    // Per-pixel preprocessing:
    // - Convert to luminance grayscale (human-perception weighted channels)
    // - Apply simple thresholding to increase text/background contrast
    // This improves OCR hit rate on noisy photos.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const contrasted = gray > 160 ? 255 : gray < 90 ? 0 : gray;
      data[i] = contrasted;
      data[i + 1] = contrasted;
      data[i + 2] = contrasted;
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.98));
    return blob || file;
  } catch {
    return file;
  }
}

function applyParsedProfileToEditor(parsed) {
  if (parsed.displayName) profileDisplayName && (profileDisplayName.value = parsed.displayName.slice(0, 60));
  if (parsed.bio) profileBio && (profileBio.value = parsed.bio.slice(0, 600));

  PROFILE_STAT_KEYS.forEach((key) => {
    const incoming = String(parsed.quickStats?.[key] || "").trim();
    if (!incoming) return;
    const input = profileInputByKey[key];
    if (input) input.value = incoming.slice(0, 24);
  });

  // Auto-activate and fill any common stats detected by OCR
  let ocrChangedCommon = false;
  COMMON_STAT_KEYS.forEach((key) => {
    const incoming = String(parsed.quickStats?.[key] || "").trim();
    if (!incoming) return;
    dynamicStats.commonStats[key] = incoming.slice(0, 24);
    ocrChangedCommon = true;
  });
  if (ocrChangedCommon) renderAllDynamic();
}

async function scanCharacterSheetAndFill(file) {
  if (!file) return;
  if (!state.uid || profileEditingUid !== state.uid) {
    profileScanStatus && (profileScanStatus.textContent = "Only your own profile can be auto-filled.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    profileScanStatus && (profileScanStatus.textContent = "Please choose an image file.");
    return;
  }
  if (!window.Tesseract?.recognize) {
    profileScanStatus && (profileScanStatus.textContent = "OCR library not available.");
    return;
  }

  ocrInProgress = true;
  btnScanCharacterSheet && (btnScanCharacterSheet.disabled = true);
  btnCaptureCharacterSheet && (btnCaptureCharacterSheet.disabled = true);
  profileScanStatus && (profileScanStatus.textContent = "Preparing image...");

  try {
    const preparedImage = await preprocessImageForOcr(file);
    const result = await window.Tesseract.recognize(preparedImage, "eng", {
      logger: (msg) => {
        if (msg?.status === "recognizing text" && typeof msg.progress === "number" && profileScanStatus) {
          profileScanStatus.textContent = `Reading character sheet... ${Math.round(msg.progress * 100)}%`;
        }
      },
    });

    const parsed = parseCharacterSheetText(result?.data?.text || "");
    applyParsedProfileToEditor(parsed);
    profileScanStatus && (profileScanStatus.textContent = "Character sheet imported. Review and save profile.");
  } catch (err) {
    console.error("Character sheet scan failed:", err);
    profileScanStatus && (profileScanStatus.textContent = "Could not read this photo. Try a clearer, flatter image.");
  } finally {
    ocrInProgress = false;
    btnScanCharacterSheet && (btnScanCharacterSheet.disabled = profileEditingUid !== state.uid);
    btnCaptureCharacterSheet && (btnCaptureCharacterSheet.disabled = profileEditingUid !== state.uid);
  }
}

// ============================================================
// === Dynamic stats render system ============================
// ============================================================

function getAllStatLabels() {
  const labels = ["Level", "Armor Rating", "Hit Points", "Initiative"];
  COMMON_STAT_KEYS.forEach((key) => {
    if (dynamicStats.commonStats[key] !== null) labels.push(COMMON_STAT_LABELS[key]);
  });
  dynamicStats.customStats.forEach((s) => {
    const n = String(s.name || "").trim();
    if (n) labels.push(n);
  });
  return labels;
}

function updateCommonStatChips() {
  COMMON_STAT_KEYS.forEach((key) => {
    const chip = document.querySelector(`.commonStatChip[data-stat="${key}"]`);
    if (!chip) return;
    const isActive = dynamicStats.commonStats[key] !== null;
    chip.classList.toggle("is-active", isActive);
    chip.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function toggleCommonStatsPicker() {
  const picker = document.getElementById("commonStatsPicker");
  if (!picker) return;
  const isOpen = picker.classList.contains("is-open");
  picker.classList.toggle("is-open", !isOpen);
  picker.setAttribute("aria-hidden", isOpen ? "true" : "false");
  const btn = document.getElementById("btnAddCommonStats");
  if (btn) btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

function renderCommonStats() {
  const section = document.getElementById("profileCommonStatsSection");
  if (!section) return;
  const active = COMMON_STAT_KEYS.filter((key) => dynamicStats.commonStats[key] !== null);
  if (active.length === 0) { section.innerHTML = ""; return; }
  const dis = !profileEditorIsEditable ? " disabled" : "";
  section.innerHTML = `
    <div class="statDynamicSection__header">Ability Scores</div>
    <div class="profileStatsGrid profileStatsGrid--dynamic">
      ${active.map((key) => `
        <div class="profileStatItem profileStatItem--dynamic">
          <div class="profileStatItem__topRow">
            <label class="profileStatItem__label" for="dynCommonStat_${key}">${COMMON_STAT_LABELS[key]}</label>
            <button class="statRemoveBtn" type="button" data-action="remove-common" data-key="${key}" aria-label="Remove ${COMMON_STAT_LABELS[key]}"${dis}>×</button>
          </div>
          <input id="dynCommonStat_${key}" class="profileStatItem__input" inputmode="numeric" placeholder="10" value="${escHtml(dynamicStats.commonStats[key] || "")}" data-action="common-value" data-key="${key}"${dis}>
        </div>`).join("")}
    </div>`;
  updateCommonStatChips();
}

function renderCustomStats() {
  const section = document.getElementById("profileCustomStatsSection");
  if (!section) return;
  if (dynamicStats.customStats.length === 0) { section.innerHTML = ""; return; }
  const dis = !profileEditorIsEditable ? " disabled" : "";
  section.innerHTML = `
    <div class="statDynamicSection__header">Custom Stats</div>
    <div class="statDynamicList">
      ${dynamicStats.customStats.map((stat) => `
        <div class="statDynamicRow" data-stat-id="${stat.id}">
          <input class="statDynamicRow__nameInput" type="text" placeholder="Stat name\u2026" maxlength="40" value="${escHtml(stat.name)}" data-action="custom-name" data-id="${stat.id}" aria-label="Stat name"${dis}>
          <input class="statDynamicRow__valueInput" inputmode="numeric" placeholder="0" maxlength="24" value="${escHtml(stat.value)}" data-action="custom-value" data-id="${stat.id}" aria-label="Stat value"${dis}>
          <button class="statRemoveBtn" type="button" data-action="remove-custom" data-id="${stat.id}" aria-label="Remove stat"${dis}>×</button>
        </div>`).join("")}
    </div>`;
}

function renderBonuses() {
  const section = document.getElementById("profileBonusesSection");
  if (!section) return;
  if (dynamicStats.bonuses.length === 0) { section.innerHTML = ""; return; }
  const allLabels = getAllStatLabels();
  const dis = !profileEditorIsEditable ? " disabled" : "";
  section.innerHTML = `
    <div class="statDynamicSection__header">Bonuses</div>
    <div class="statDynamicList">
      ${dynamicStats.bonuses.map((bonus) => {
        const available = allLabels.filter((l) => !bonus.appliesTo.includes(l));
        return `
          <div class="statDynamicRow statDynamicRow--bonus" data-bonus-id="${bonus.id}">
            <div class="statDynamicRow__bonusMain">
              <input class="statDynamicRow__nameInput" type="text" placeholder="Bonus name\u2026" maxlength="40" value="${escHtml(bonus.name)}" data-action="bonus-name" data-id="${bonus.id}" aria-label="Bonus name"${dis}>
              <input class="statDynamicRow__valueInput statDynamicRow__valueInput--signed" type="text" inputmode="numeric" placeholder="+0" maxlength="8" value="${escHtml(bonus.value)}" data-action="bonus-value" data-id="${bonus.id}" aria-label="Bonus value"${dis}>
              <button class="statRemoveBtn" type="button" data-action="remove-bonus" data-id="${bonus.id}" aria-label="Remove bonus"${dis}>×</button>
            </div>
            <div class="statDynamicRow__bonusApplies">
              <span class="bonusAppliesLabel">Applies to:</span>
              <div class="bonusTagArea">
                ${bonus.appliesTo.map((label) => `
                  <span class="bonusTag">${escHtml(label)}<button class="bonusTag__remove" type="button" data-action="remove-applies" data-bonus-id="${bonus.id}" data-label="${escHtml(label)}" aria-label="Remove ${escHtml(label)}"${dis}>×</button></span>
                `).join("")}
                ${available.length > 0 && profileEditorIsEditable ? `
                  <select class="bonusAddDropdown" data-action="add-applies" data-bonus-id="${bonus.id}" aria-label="Add stat this bonus applies to">
                    <option value="">\uFF0B stat\u2026</option>
                    ${available.map((l) => `<option value="${escHtml(l)}">${escHtml(l)}</option>`).join("")}
                  </select>` : ""}
              </div>
            </div>
          </div>`;
      }).join("")}
    </div>`;
}

function renderAllDynamic() {
  renderCommonStats();
  renderCustomStats();
  renderBonuses();
  updateCommonStatChips();
}

function handleStatsPanelEvent(e) {
  // Common stat chip toggles (inside #commonStatsPicker)
  if (e.type === "click") {
    const chip = e.target.closest(".commonStatChip");
    if (chip) {
      if (!profileEditorIsEditable) return;
      const key = chip.dataset.stat;
      if (!key) return;
      dynamicStats.commonStats[key] = dynamicStats.commonStats[key] !== null ? null : "";
      renderAllDynamic();
      return;
    }
  }

  const actionEl = e.target.closest("[data-action]");
  const action = actionEl?.dataset?.action;
  if (!action) return;
  if (!profileEditorIsEditable) return;

  if (e.type === "click") {
    switch (action) {
      case "remove-common": {
        const key = actionEl.dataset.key;
        dynamicStats.commonStats[key] = null;
        renderAllDynamic();
        break;
      }
      case "remove-custom": {
        const id = actionEl.dataset.id;
        dynamicStats.customStats = dynamicStats.customStats.filter((s) => s.id !== id);
        renderAllDynamic();
        break;
      }
      case "remove-bonus": {
        const id = actionEl.dataset.id;
        dynamicStats.bonuses = dynamicStats.bonuses.filter((b) => b.id !== id);
        renderBonuses();
        break;
      }
      case "remove-applies": {
        const bonusId = actionEl.dataset.bonusId;
        const label = actionEl.dataset.label;
        const bonus = dynamicStats.bonuses.find((b) => b.id === bonusId);
        if (bonus) { bonus.appliesTo = bonus.appliesTo.filter((l) => l !== label); renderBonuses(); }
        break;
      }
    }
  } else if (e.type === "input") {
    switch (action) {
      case "custom-name": {
        const id = actionEl.dataset.id;
        const stat = dynamicStats.customStats.find((s) => s.id === id);
        if (stat) { stat.name = e.target.value; renderBonuses(); }
        break;
      }
      case "custom-value": {
        const id = actionEl.dataset.id;
        const stat = dynamicStats.customStats.find((s) => s.id === id);
        if (stat) stat.value = e.target.value;
        break;
      }
      case "bonus-name": {
        const id = actionEl.dataset.id;
        const bonus = dynamicStats.bonuses.find((b) => b.id === id);
        if (bonus) bonus.name = e.target.value;
        break;
      }
      case "bonus-value": {
        const id = actionEl.dataset.id;
        const bonus = dynamicStats.bonuses.find((b) => b.id === id);
        if (bonus) bonus.value = e.target.value;
        break;
      }
      case "common-value": {
        const key = actionEl.dataset.key;
        if (key && dynamicStats.commonStats[key] !== null) dynamicStats.commonStats[key] = e.target.value;
        break;
      }
    }
  } else if (e.type === "change") {
    if (action === "add-applies") {
      const bonusId = actionEl.dataset.bonusId;
      const label = e.target.value;
      e.target.value = "";
      if (!label) return;
      const bonus = dynamicStats.bonuses.find((b) => b.id === bonusId);
      if (bonus && !bonus.appliesTo.includes(label)) { bonus.appliesTo.push(label); renderBonuses(); }
    }
  }
}

// ============================================================

function collectProfileFromEditor() {
  const quickStats = getDefaultQuickStats();
  // Core 4 fixed stats
  PROFILE_STAT_KEYS.forEach((key) => {
    const input = profileInputByKey[key];
    quickStats[key] = String(input?.value || "").trim().slice(0, 24);
  });
  // Active common stats — read from rendered inputs
  COMMON_STAT_KEYS.forEach((key) => {
    if (dynamicStats.commonStats[key] !== null) {
      const input = document.getElementById(`dynCommonStat_${key}`);
      quickStats[key] = String(input?.value ?? dynamicStats.commonStats[key] ?? "").trim().slice(0, 24);
    }
  });
  // Custom stats
  quickStats.customStats = dynamicStats.customStats
    .filter((s) => String(s.name || "").trim())
    .map((s) => ({
      id: s.id,
      name: String(s.name || "").trim().slice(0, 40),
      value: String(s.value || "").trim().slice(0, 24),
    }));
  // Bonuses
  quickStats.bonuses = dynamicStats.bonuses
    .filter((b) => String(b.name || "").trim())
    .map((b) => ({
      id: b.id,
      name: String(b.name || "").trim().slice(0, 40),
      value: String(b.value || "").trim().slice(0, 24),
      appliesTo: [...(b.appliesTo || [])],
    }));

  return sanitizeProfileRecord(
    {
      displayName: String(profileDisplayName?.value || "").trim(),
      bio: String(profileBio?.value || "").trim(),
      avatarUrl: profileEditorData?.avatarUrl || "",
      avatarStoragePath: profileEditorData?.avatarStoragePath || "",
      quickStats,
      spells: Array.isArray(profileEditorData?.spells) ? profileEditorData.spells : [],
    },
    profileEditingUid || state.uid || ""
  );
}

async function openProfileEditor(targetUid, returnScreenKey = currentScreenKey) {
  if (!targetUid) return;
  pendingAvatarNugget = false;
  settingsProfileReturnScreenKey = returnScreenKey;
  profileEditingUid = targetUid;
  profileEditingRole = normalizeProfileRole(targetUid === state.uid ? state.role : "player");
  const qsWrap = document.getElementById("profileQuickStatsWrap");
  if (qsWrap) qsWrap.classList.toggle("hidden", profileEditingRole === "dm");
  profileSaveMsg && (profileSaveMsg.textContent = "Loading profile...");

  const profile = await loadUserProfile(targetUid, { role: profileEditingRole, force: true });
  profileEditorData = { ...profile, quickStats: { ...profile.quickStats } };
  const canEdit = targetUid === state.uid;
  const roleLabel = profileEditingRole === "dm" ? "GM" : "Player";
  applyProfileToEditor(profileEditorData, canEdit);

  if (profileAvatarStatus) {
    profileAvatarStatus.textContent = canEdit
      ? "Upload a profile picture to preview it before saving."
      : "Picture upload is disabled for other users.";
  }
  if (profileScanStatus) {
    profileScanStatus.textContent = canEdit
      ? ""
      : "Character sheet scan is disabled for other users.";
  }
  if (profileSaveMsg) {
    profileSaveMsg.textContent = canEdit ? `Editing ${roleLabel} profile.` : "Viewing profile.";
  }
  showOnly(SCREEN_KEYS.SETTINGS_PROFILE);
}

// ---- Profile screen rendering (new bottom-bar profile tab) ----
async function renderProfileScreen() {
  enforceProfileAvatarContainment();
  const profilePlayerContent = $("profilePlayerContent");
  const profileGMContent = $("profileGMContent");
  const profileHeroAvatar = $("profileHeroAvatar");
  const profileHeroImg = $("profileHeroImg");
  const profileHeroName = $("profileHeroName");
  const profileHeroBio = $("profileHeroBio");
  const profileGMAvatar = $("profileGMAvatar");
  const profileGMImg = $("profileGMImg");
  const profileGMName = $("profileGMName");
  const profileGMBio = $("profileGMBio");
  const profileStatsReadOnly = $("profileStatsReadOnly");
  const profileSpellsList = $("profileSpellsList");
  const profileSpellsEmpty = $("profileSpellsEmpty");
  const profileTabBar = $("profileTabBar");
  const profileStatsPane = $("profileStatsPane");
  const profileSpellsPane = $("profileSpellsPane");
  const btnAddSpell = $("btnAddSpell");

  const isGM = state.role === "dm";
  if (profilePlayerContent) profilePlayerContent.classList.toggle("hidden", isGM);
  if (profileGMContent) profileGMContent.classList.toggle("hidden", !isGM);

  try {
    const role = isGM ? "dm" : "player";
    const profile = await loadUserProfile(state.uid, { role, force: false });
    const alternateRole = role === "dm" ? "player" : "dm";
    const fallbackProfile = await loadUserProfile(state.uid, { role: alternateRole, force: false });
    const resolvedTopBarAvatar = String(profile?.avatarUrl || fallbackProfile?.avatarUrl || "").trim();
    updateTopBarAvatar(resolvedTopBarAvatar);

    // Update hero section (player + GM use separate DOM nodes).
    const src = resolveLiveAvatar(profile.avatarUrl);
    if (isGM) {
      setProfileHeroAvatarVisual(profileGMAvatar, profileGMImg, src);
      if (profileGMName) profileGMName.textContent = profile.displayName || "Dungeon Master";
      if (profileGMBio) profileGMBio.textContent = profile.bio || "";

      // Show "Clear Player Profile" only if the GM has a player-mode profile
      const btnClearPlayerProfile = $("btnClearPlayerProfile");
      if (btnClearPlayerProfile) {
        const hasPlayerProfile = fallbackProfile && (
          String(fallbackProfile.displayName || "").trim() ||
          String(fallbackProfile.bio || "").trim() ||
          String(fallbackProfile.avatarUrl || "").trim()
        );
        btnClearPlayerProfile.classList.toggle("hidden", !hasPlayerProfile);
      }
    } else {
      setProfileHeroAvatarVisual(profileHeroAvatar, profileHeroImg, src);
      if (profileHeroName) profileHeroName.textContent = profile.displayName || "Adventurer";
      if (profileHeroBio) profileHeroBio.textContent = profile.bio || "";
    }

    if (PROFILE_AVATAR_DIAG) {
      requestAnimationFrame(() => {
        logAvatarDiagnostics("renderProfileScreen:profileHeroImg:raf1", profileHeroImg);
        logAvatarDiagnostics("renderProfileScreen:profileGMImg:raf1", profileGMImg);
        logAvatarDiagnostics("renderProfileScreen:bottomBarAvatarImg:raf1", bottomBarAvatarImg);
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        logAvatarDiagnostics("renderProfileScreen:profileHeroImg:raf2", profileHeroImg);
        logAvatarDiagnostics("renderProfileScreen:profileGMImg:raf2", profileGMImg);
        logAvatarDiagnostics("renderProfileScreen:bottomBarAvatarImg:raf2", bottomBarAvatarImg);
      }));
    }

    // Re-apply after paint in case mobile renderer transiently drops containment.
    requestAnimationFrame(() => {
      enforceProfileAvatarContainment();
      requestAnimationFrame(() => enforceProfileAvatarContainment());
    });

    // Player: populate quick stats in read-only grid
    if (!isGM && profileStatsReadOnly) {
      const qs = profile.quickStats || {};
      const statLabels = { level: "Level", armorRating: "AC", hitPoints: "HP", initiative: "Init", strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };
      const coreStats = new Set(["level", "armorRating", "hitPoints", "initiative"]);
      profileStatsReadOnly.innerHTML = "";
      for (const [key, label] of Object.entries(statLabels)) {
        const val = qs[key] || "-";
        const el = document.createElement("div");
        el.className = `profileStatItem${coreStats.has(key) ? " profileStatItem--core" : ""}`;
        el.dataset.statKey = key;
        el.innerHTML = `<span class="profileStatItem__label">${label}</span><span class="profileStatItem__value">${val}</span>`;
        profileStatsReadOnly.appendChild(el);
      }
      profileStatsReadOnly.classList.remove("hidden");
    }

    // Player: render spell list from profile data
    if (!isGM && profileSpellsList && profileSpellsEmpty) {
      const spells = normalizeSpellList(profile.spells);
      profileSpellsList.innerHTML = spells
        .map((spell, idx) => {
          const schoolLevel = [spell.school, spell.level].filter(Boolean).join(" • ");
          return `<div class="profileSpellCard"><div class="profileSpellCard__top"><div><div class="profileSpellCard__name">${escapeHtml(spell.name)}</div>${schoolLevel ? `<div class="profileSpellCard__school">${escapeHtml(schoolLevel)}</div>` : ""}</div><button class="btn btn--ghost btn--small" type="button" data-remove-spell="${idx}">Remove</button></div>${spell.description ? `<div class="profileSpellCard__desc">${escapeHtml(spell.description)}</div>` : ""}</div>`;
        })
        .join("");
      profileSpellsEmpty.classList.toggle("hidden", spells.length > 0);

      profileSpellsList.querySelectorAll("[data-remove-spell]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idx = Number(btn.getAttribute("data-remove-spell"));
          if (!Number.isFinite(idx)) return;
          const nextSpells = spells.filter((_, i) => i !== idx);
          try {
            await updateDoc(getUserProfileRef(state.uid), {
              [`roleProfiles.${role}.spells`]: nextSpells,
              ...(role === "player" ? { spells: nextSpells } : {}),
              updatedAt: serverTimestamp(),
            });
            profileCache.delete(profileCacheKey(state.uid, role));
            renderProfileScreen().catch(() => {});
          } catch (err) {
            console.error("Remove spell failed:", err);
            showToast("Could not remove spell.", "error");
          }
        });
      });

      if (btnAddSpell) {
        btnAddSpell.onclick = async () => {
          const nextSpell = await openSpellModal();
          if (!nextSpell) return;
          const nextSpells = [...spells, nextSpell].slice(0, 40);
          try {
            await updateDoc(getUserProfileRef(state.uid), {
              [`roleProfiles.${role}.spells`]: nextSpells,
              ...(role === "player" ? { spells: nextSpells } : {}),
              updatedAt: serverTimestamp(),
            });
            profileCache.delete(profileCacheKey(state.uid, role));
            renderProfileScreen().catch(() => {});
          } catch (err) {
            console.error("Add spell failed:", err);
            showToast("Could not add spell.", "error");
          }
        };
      }
    }

    if (!isGM && profileTabBar) {
      profileTabBar.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("chip--active", chip.dataset.profileTab === "stats");
      });
    }
    if (profileStatsPane) profileStatsPane.classList.toggle("hidden", isGM);
    if (profileSpellsPane) profileSpellsPane.classList.add("hidden");
  } catch (err) {
    console.warn("renderProfileScreen error:", err);
  }

  // Show the Edit button so the player can edit their own profile (GM uses btnGMProfileEdit instead)
  const btnProfileEditEl = $("btnProfileEdit");
  if (btnProfileEditEl) btnProfileEditEl.classList.toggle("hidden", isGM);
}

async function saveCurrentProfile() {
  if (!state.uid || profileEditingUid !== state.uid) {
    profileSaveMsg && (profileSaveMsg.textContent = "Only your own profile can be updated.");
    return;
  }

  if (pendingAvatarNugget) {
    const ok = await spendNuggetWithFeedback("profile picture");
    if (!ok) {
      profileSaveMsg && (profileSaveMsg.textContent = "Not enough nuggets to save.");
      return;
    }
    pendingAvatarNugget = false;
  }

  const payload = collectProfileFromEditor();
  const normalizedRole = normalizeProfileRole(profileEditingRole);
  profileSaveMsg && (profileSaveMsg.textContent = "Saving profile...");

  const roleProfilePayload = {
    displayName: payload.displayName,
    bio: payload.bio,
    avatarUrl: payload.avatarUrl,
    avatarStoragePath: payload.avatarStoragePath,
    quickStats: payload.quickStats,
    spells: payload.spells,
  };

  const writePayload = {
    roleProfiles: {
      [normalizedRole]: roleProfilePayload,
    },
    updatedAt: serverTimestamp(),
  };

  // Keep legacy top-level fields in sync for broad compatibility.
  if (normalizedRole === "player") {
    writePayload.displayName = payload.displayName;
    writePayload.bio = payload.bio;
    writePayload.avatarUrl = payload.avatarUrl;
    writePayload.avatarStoragePath = payload.avatarStoragePath;
    writePayload.quickStats = payload.quickStats;
    writePayload.spells = payload.spells;
  }

  await setDoc(getUserProfileRef(state.uid), writePayload, { merge: true });

  profileEditorData = payload;
  setCachedProfile(state.uid, normalizedRole, payload);
  updateTopBarAvatar(payload.avatarUrl);
  profileSaveMsg && (profileSaveMsg.textContent = "Profile saved.");
  showToast("Profile saved.", "success");

  // Navigate back to the main handout page after a short delay
  setTimeout(() => {
    showOnly(getDefaultRoleScreen());
  }, 400);
}

async function uploadOwnAvatar(file) {
  if (!file || !state.uid || profileEditingUid !== state.uid) return;
  if (!file.type.startsWith("image/")) {
    profileAvatarStatus && (profileAvatarStatus.textContent = "Please upload an image file.");
    return;
  }
  profileAvatarStatus && (profileAvatarStatus.textContent = "Uploading profile picture...");
  try { file = await compressImageToMaxSize(file); } catch (_) { profileAvatarStatus && (profileAvatarStatus.textContent = "Could not process image."); return; }
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/avatar-${Date.now()}.${ext}`;
  const avatarRef = storageRef(storage, path);
  try {
    await uploadBytes(avatarRef, file, { contentType: file.type });
  } catch (uploadErr) {
    console.error("Storage upload failed:", uploadErr);
    const msg = String(uploadErr?.message || "");
    if (msg.includes("unauthorized") || msg.includes("403") || msg.includes("storage/unauthorized")) {
      profileAvatarStatus && (profileAvatarStatus.textContent = "Upload not allowed right now. Please try again later.");
    } else {
      profileAvatarStatus && (profileAvatarStatus.textContent = "Upload failed. Please try another image.");
    }
    throw uploadErr;
  }
  const avatarUrl = await getDownloadURL(avatarRef);

  if (!profileEditorData) {
    profileEditorData = sanitizeProfileRecord({}, state.uid);
  }
  profileEditorData.avatarUrl = avatarUrl;
  profileEditorData.avatarStoragePath = path;
  setProfileAvatarPreview(avatarUrl);
  pendingAvatarNugget = true;
  profileAvatarStatus && (profileAvatarStatus.textContent = "Profile picture uploaded. Costs 1 nugget when you save.");
}

async function ensureOwnProfileLoaded() {
  if (!state.uid) return;
  let primaryProfile;
  let fallbackProfile;
  try {
    const preferredRole = normalizeProfileRole(state.role || "player");
    const alternateRole = preferredRole === "dm" ? "player" : "dm";
    primaryProfile = await loadUserProfile(state.uid, { role: preferredRole });
    fallbackProfile = await loadUserProfile(state.uid, { role: alternateRole });
  } catch (err) {
    console.warn("Profile preload skipped:", err);
    return;
  }
  const resolvedAvatarUrl = String(primaryProfile?.avatarUrl || fallbackProfile?.avatarUrl || "").trim();
  updateTopBarAvatar(resolvedAvatarUrl);
}

async function hydrateActivePlayerProfiles(players) {
  // Hydrate reminder: this preloads player profile data into cache before it is rendered.
  const ids = players.map((p) => p.id).filter(Boolean);
  if (ids.length === 0) return;

  await Promise.all(ids.map(async (uid) => {
    try {
      await loadUserProfile(uid, { role: "player" });
    } catch (e) {}
  }));
}

function setLiveTick() {
  const joinTag = String(state.joinTag || "").trim();
  const sessionId = String(state.sessionId || "").trim();
  const fromHash = joinTag.match(/#(\d{4})$/)?.[1] || "";
  const fromLegacyDash = joinTag.match(/-(\d{4})$/)?.[1] || "";
  const fromSessionId = sessionId.slice(-4);
  const code = (fromHash || fromLegacyDash || fromSessionId || "----").toUpperCase();
  const tagText = joinTag || `session#${code}`;
  const idText = sessionId || "--------";
  const fullDisplay = `${tagText} � ${idText}`;
  const summaryDisplay = tagText;

  if (liveStatus) {
    liveStatus.title = fullDisplay;
    liveStatus.dataset.sessionText = fullDisplay;
    liveStatus.dataset.sessionSummary = summaryDisplay;
  }

  if (liveStatusTag) liveStatusTag.textContent = tagText;
  if (liveStatusId) liveStatusId.textContent = idText;

  if (plSessionBadgeText) plSessionBadgeText.textContent = `#${code}`;
  if (plSessionTag) plSessionTag.textContent = tagText;
  if (plSessionIdText) plSessionIdText.textContent = idText;

  if (playerSessionRef) {
    const hasSession = !!(joinTag || sessionId);
    playerSessionRef.classList.toggle("hidden", !hasSession);
  }
}

let liveStatusPinned = false;
let playerSessionPinned = false;

function setSessionPanelState(panel, trigger, isOpen) {
  if (!panel || !trigger) return;
  panel.classList.toggle("hidden", !isOpen);
  panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function setAdvancedState(detailsEl, toggleBtn, isOpen) {
  if (!detailsEl || !toggleBtn) return;
  detailsEl.classList.toggle("hidden", !isOpen);
  detailsEl.setAttribute("aria-hidden", isOpen ? "false" : "true");
  toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  toggleBtn.textContent = isOpen ? "Hide advanced" : "Advanced details";
}

// Close every top-bar dropdown so only one is open at a time.
function closeAllTopBarPanels() {
  closeLiveStatusPanel();
  liveStatusPinned = false;
  closePlayerSessionPanel();
  playerSessionPinned = false;
  if (playerListDropdown) { playerListDropdown.classList.add("hidden"); }
  if (notifPanel) { notifPanel.classList.add("hidden"); notifPanel.setAttribute("aria-hidden", "true"); }
}

function openLiveStatusPanel() {
  setSessionPanelState(liveStatusPanel, liveStatus, true);
}

function closeLiveStatusPanel() {
  setSessionPanelState(liveStatusPanel, liveStatus, false);
  setAdvancedState(liveAdvancedDetails, btnToggleLiveAdvanced, false);
}

function openPlayerSessionPanel() {
  setSessionPanelState(plSessionDetails, plSessionBadge, true);
}

function closePlayerSessionPanel() {
  setSessionPanelState(plSessionDetails, plSessionBadge, false);
  setAdvancedState(playerAdvancedDetails, btnTogglePlayerAdvanced, false);
}

btnToggleLiveAdvanced?.addEventListener("click", (event) => {
  event.preventDefault();
  const willOpen = liveAdvancedDetails?.classList.contains("hidden");
  setAdvancedState(liveAdvancedDetails, btnToggleLiveAdvanced, !!willOpen);
});

btnTogglePlayerAdvanced?.addEventListener("click", (event) => {
  event.preventDefault();
  const willOpen = playerAdvancedDetails?.classList.contains("hidden");
  setAdvancedState(playerAdvancedDetails, btnTogglePlayerAdvanced, !!willOpen);
});

const liveStatusWrap = liveStatus?.closest(".sessionPeekWrap");
liveStatus?.addEventListener("mouseenter", () => {
  if (!liveStatusPinned) openLiveStatusPanel();
});

liveStatus?.addEventListener("focus", () => {
  if (!liveStatusPinned) openLiveStatusPanel();
});

liveStatus?.addEventListener("click", (event) => {
  event.preventDefault();
  const wasOpen = liveStatusPinned;
  closeAllTopBarPanels();
  liveStatusPinned = !wasOpen;
  if (liveStatusPinned) openLiveStatusPanel();
  else closeLiveStatusPanel();
});

liveStatusWrap?.addEventListener("mouseleave", () => {
  if (!liveStatusPinned) closeLiveStatusPanel();
});

const playerSessionWrap = plSessionBadge?.closest(".playerSessionRef");
plSessionBadge?.addEventListener("mouseenter", () => {
  if (!playerSessionPinned) openPlayerSessionPanel();
});

plSessionBadge?.addEventListener("focus", () => {
  if (!playerSessionPinned) openPlayerSessionPanel();
});

plSessionBadge?.addEventListener("click", (event) => {
  event.preventDefault();
  playerSessionPinned = !playerSessionPinned;
  if (playerSessionPinned) openPlayerSessionPanel();
  else closePlayerSessionPanel();
});

playerSessionWrap?.addEventListener("mouseleave", () => {
  if (!playerSessionPinned) closePlayerSessionPanel();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;

  if (hamburgerSpeedDial && btnHamburger) {
    const clickedInsideDial = hamburgerSpeedDial.contains(target);
    const clickedHamburger = btnHamburger.contains(target);
    if (!clickedInsideDial && !clickedHamburger) {
      closeHamburgerSpeedDial();
    }
  }

  if (liveStatusWrap && !liveStatusWrap.contains(target)) {
    liveStatusPinned = false;
    closeLiveStatusPanel();
  }

  if (playerSessionWrap && !playerSessionWrap.contains(target)) {
    playerSessionPinned = false;
    closePlayerSessionPanel();
  }
});

document.addEventListener("keydown", (event) => {
  const key = event.key;

  // Escape: close panels
  if (key === "Escape") {
    liveStatusPinned = false;
    playerSessionPinned = false;
    closeHamburgerSpeedDial();
    closeSettingsDrawer();
    closeLiveStatusPanel();
    closePlayerSessionPanel();
    if (notifPanel && !notifPanel.classList.contains("hidden")) {
      notifPanel.classList.add("hidden");
      notifPanel.setAttribute("aria-hidden", "true");
    }
    closePlayerCard();
    return;
  }

  // Desktop-only shortcuts (Ctrl/Cmd combos)
  if (!matchMedia("(pointer: fine)").matches) return;
  const ctrl = event.ctrlKey || event.metaKey;
  if (!ctrl) return;

  // Ctrl+S � save current handout
  if (key === "s") {
    event.preventDefault();
    btnSaveHandout?.click();
    return;
  }
  // Ctrl+N � open create handout modal
  if (key === "n") {
    event.preventDefault();
    btnOpenCreateHandout?.click();
    return;
  }
  // Ctrl+F � focus handout search
  if (key === "f") {
    const search = state.role === "dm" ? $("gmSearch") : $("plHandoutSearch");
    if (search) {
      event.preventDefault();
      search.focus();
      search.select?.();
    }
    return;
  }
  // Ctrl+1-5 � bottom bar buttons
  const barBtns = [btnToggleSocial, btnOpenAmbienceBar, btnOpenHandouts, btnOpenInventory, btnOpenSettings];
  const idx = parseInt(key, 10);
  if (idx >= 1 && idx <= 5) {
    event.preventDefault();
    barBtns[idx - 1]?.click();
  }
});

btnCopyLiveStatus?.addEventListener("click", async () => {
  await shareSessionInvite();
});

btnCopyPlayerSession?.addEventListener("click", async () => {
  const includeAdvanced = !!btnTogglePlayerAdvanced?.getAttribute("aria-expanded") && btnTogglePlayerAdvanced.getAttribute("aria-expanded") === "true";
  const text = String(includeAdvanced
    ? liveStatus?.dataset.sessionText
    : liveStatus?.dataset.sessionSummary || "").trim();
  if (!text) return;
  await copyToClipboard(text);
  pulseCopiedFeedback(btnCopyPlayerSession, plSessionBadge);
  showToast(includeAdvanced ? "Session details copied." : "Session tag copied.", "success");
});

// Nugget counter is updated by subscribeNuggets() when in a session.
// No separate network indicator needed � Firebase handles reconnection.

function showToast(message, type = "info", timeoutMs = 2600) {
  // Toasts are non-blocking messages (better UX than alert popups).
  if (!toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast${type === "info" ? "" : ` toast--${type}`}`;
  toast.textContent = message;
  toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
    // Fallback: remove even if animationend never fires (e.g. reduced motion).
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }, timeoutMs);
}

// Undo toast: shows a message with an Undo button. If user doesn't click Undo
// within timeoutMs, onConfirm() executes the destructive action.
function showUndoToast(message, onConfirm, timeoutMs = 5000) {
  if (!toastStack) { onConfirm(); return; }
  let cancelled = false;
  const toast = document.createElement("div");
  toast.className = "toast toast--undo";
  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  const undoBtn = document.createElement("button");
  undoBtn.className = "toast__undoBtn";
  undoBtn.textContent = "Undo";
  undoBtn.type = "button";
  toast.appendChild(msgSpan);
  toast.appendChild(undoBtn);
  toastStack.appendChild(toast);

  undoBtn.addEventListener("click", () => {
    cancelled = true;
    toast.remove();
    showToast("Action undone.", "info", 1500);
  });

  setTimeout(() => {
    if (!cancelled) onConfirm();
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }, timeoutMs);
}

// Auth loading overlay blocks interaction during auth/resume work.
const authLoadingOverlay = $("authLoadingOverlay");
const authLoadingText = authLoadingOverlay?.querySelector(".authLoadingOverlay__text");
let authLoadingDepth = 0;
let authLoadingShownAt = 0;
function showAuthLoading(message = "Loading your adventure...") {
  if (!authLoadingOverlay) return;
  if (authLoadingText) authLoadingText.textContent = message;
  authLoadingDepth += 1;
  if (authLoadingDepth > 1) return;
  authLoadingShownAt = Date.now();
  authLoadingOverlay.classList.remove("hidden");
  authLoadingOverlay.setAttribute("aria-hidden", "false");
}

function hideAuthLoading(force = false) {
  if (!authLoadingOverlay) return;
  if (force) authLoadingDepth = 0;
  else authLoadingDepth = Math.max(0, authLoadingDepth - 1);
  if (authLoadingDepth > 0) return;

  const elapsed = Date.now() - authLoadingShownAt;
  const remaining = Math.max(0, 320 - elapsed);
  const close = () => {
    authLoadingOverlay.classList.add("hidden");
    authLoadingOverlay.setAttribute("aria-hidden", "true");
  };
  if (remaining > 0) setTimeout(close, remaining);
  else close();
}

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Haptic feedback: micro-vibrate (10ms) on any button tap.
document.body.addEventListener("click", (e) => {
  if (e.target instanceof HTMLElement && e.target.closest("button")) {
    navigator.vibrate?.(10);
  }
}, { passive: true });

// -- Notification bell (toggle panel, render, mark read) --
// The bell appears in the topbar for both GM and players once they enter a
// session. Clicking it toggles a dropdown panel listing the latest 10
// notifications. The badge shows an unread count.
let notifItems = []; // cached array of {id, type, message, payload, read, createdAt}
let handoutReviewQueue = [];
let handoutReviewPlayerName = "";
let handoutReviewBusy = false;
let gmHandoutDeckQueue = [];
let gmHandoutDeckBusy = false;
let gmHandoutDeckFilter = "all";
let gmHandoutDeckKeepExistingClaims = true;

function toggleNotifPanel() {
  if (!notifPanel) return;
  const opening = notifPanel.classList.contains("hidden");
  notifPanel.classList.toggle("hidden", !opening);
  notifPanel.setAttribute("aria-hidden", String(!opening));
}

btnNotifBell?.addEventListener("click", (e) => {
  e.stopPropagation();
  const wasOpen = notifPanel && !notifPanel.classList.contains("hidden");
  closeAllTopBarPanels();
  if (!wasOpen) {
    toggleNotifPanel();
  }
  // User explicitly opened notifications: mark everything read immediately.
  markAllNotifsRead().catch((err) => {
    console.warn("markAllNotifsRead on bell click failed:", err);
  });
});

// Close notification panel when clicking outside
document.addEventListener("click", (e) => {
  if (notifPanel && !notifPanel.classList.contains("hidden") &&
      !notifPanel.contains(e.target) && e.target !== btnNotifBell &&
      !btnNotifBell?.contains(e.target)) {
    notifPanel.classList.add("hidden");
    notifPanel.setAttribute("aria-hidden", "true");
  }
});

function updateNotifBadge() {
  const unread = notifItems.filter(n => !n.read).length;
  if (notifBadge) {
    notifBadge.textContent = "";
    notifBadge.classList.toggle("hidden", unread === 0);
  }
  // Bell turns orange when there are unread notifications.
  if (btnNotifBell) {
    btnNotifBell.classList.toggle("notifBell--unread", unread > 0);
  }
}

const NOTIF_ICONS = {
  handoutRevealed: "📜",
  itemReceived: "🎁",
  coinsReceived: "💰",
  profileOffer: "🎭",
  profileOfferResponse: "✅",
  roleTransfer: "👑",
  nuggetSpent: "🪙",
  playerJoined: "🧙",
  playerKicked: "🚫",
  playerLeft: "👋",
  playerDiscardedHandouts: "🗂️",
  sessionDeleted: "💀",
  gmMessage: "📢",
  default: "🔔"
};

function truncateHandoutPreview(text, maxLen = 120) {
  const src = String(text || "").replace(/\s+/g, " ").trim();
  if (!src) return "No description provided.";
  if (src.length <= maxLen) return src;
  return `${src.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

function setHandoutReviewButtonsDisabled(disabled) {
  if (btnHandoutReviewKeep) btnHandoutReviewKeep.disabled = !!disabled;
  if (btnHandoutReviewDelete) btnHandoutReviewDelete.disabled = !!disabled;
}

function renderHandoutReviewCard() {
  if (!handoutReviewStack || !handoutReviewProgress) return;
  handoutReviewStack.innerHTML = "";

  if (handoutReviewQueue.length === 0) {
    handoutReviewProgress.textContent = "Done";
    if (handoutReviewSummary) {
      handoutReviewSummary.textContent = handoutReviewPlayerName
        ? `${handoutReviewPlayerName}'s claimed handouts have been fully reviewed.`
        : "All claimed handouts have been reviewed.";
    }
    const done = document.createElement("div");
    done.className = "handoutReviewDone";
    done.textContent = "No more claimed handouts to review.";
    handoutReviewStack.appendChild(done);
    setHandoutReviewButtonsDisabled(true);
    showToast("Claimed handouts reviewed.", "success");
    return;
  }

  const item = handoutReviewQueue[0];
  handoutReviewProgress.textContent = `${Math.max(1, item.totalIndex)} of ${Math.max(1, item.totalCount)}`;
  if (handoutReviewSummary) {
    handoutReviewSummary.textContent = handoutReviewPlayerName
      ? `Reviewing claimed handouts from ${handoutReviewPlayerName}.`
      : "Review each claimed handout before finishing.";
  }

  const card = document.createElement("article");
  card.className = "handoutReviewCard handoutReviewCard--entering";

  const art = String(getVisibleHandoutImageUrl(item, "dm", state.uid) || getHandoutAvatarImageUrl(item) || "").trim();
  const imgHtml = art
    ? `<img class="handoutReviewCard__art" src="${escapeHtml(art)}" alt="${escapeHtml(item.title || "Handout")} preview">`
    : `<div class="handoutReviewCard__art handoutReviewCard__art--empty" aria-hidden="true">No Image</div>`;

  card.innerHTML = `
    <div class="handoutReviewCard__media">${imgHtml}</div>
    <div class="handoutReviewCard__content">
      <div class="handoutReviewCard__title">${escapeHtml(item.title || "Untitled Handout")}</div>
      <div class="handoutReviewCard__meta">${escapeHtml(String(item.type || "handout").toUpperCase())}</div>
      <p class="handoutReviewCard__desc">${escapeHtml(truncateHandoutPreview(item.publicContent || item.secretContent || ""))}</p>
    </div>
  `;

  card.addEventListener("animationend", () => {
    card.classList.remove("handoutReviewCard--entering");
  }, { once: true });

  handoutReviewStack.appendChild(card);
  setHandoutReviewButtonsDisabled(false);
}

async function openDiscardedHandoutReviewFromNotification(notif) {
  if (state.role !== "dm" || !state.sessionId || !notif?.payload) return;
  const payload = notif.payload || {};
  const handoutIds = Array.isArray(payload.handoutIds)
    ? payload.handoutIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (handoutIds.length === 0) {
    showToast("No claimed handouts were attached to this notification.", "info");
    return;
  }

  const playerUid = String(payload.playerUid || "").trim();
  handoutReviewPlayerName = String(payload.playerName || "").trim() || "the departing player";
  const loaded = [];

  for (const hid of handoutIds) {
    try {
      const hs = await getDoc(doc(db, "sessions", state.sessionId, "handouts", hid));
      if (!hs.exists()) continue;
      const data = hs.data() || {};
      const currentClaimUid = String(data.claimedByUid || "").trim();
      if (playerUid && currentClaimUid && currentClaimUid !== playerUid) continue;
      loaded.push({ id: hs.id, ...data });
    } catch (err) {
      console.warn("Handout review load failed:", err);
    }
  }

  if (loaded.length === 0) {
    showToast("No matching claimed handouts need review anymore.", "info");
    return;
  }

  handoutReviewQueue = loaded.map((h, idx) => ({
    ...h,
    totalIndex: idx + 1,
    totalCount: loaded.length,
  }));
  handoutReviewBusy = false;
  renderHandoutReviewCard();
  animateModalIn(handoutReviewModal);
}

async function handleNotificationClick(item) {
  if (!item?.id) return;
  if (item.type === "playerDiscardedHandouts" && state.role === "dm") {
    await markNotifRead(item.id);
    await openDiscardedHandoutReviewFromNotification(item);
    return;
  }
  await markNotifRead(item.id);
}

function closeHandoutReviewModal() {
  if (handoutReviewBusy) return;
  handoutReviewQueue = [];
  handoutReviewPlayerName = "";
  handoutReviewBusy = false;
  animateModalOut(handoutReviewModal);
}

async function resolveCurrentHandoutReview(action) {
  if (handoutReviewBusy || !state.sessionId || handoutReviewQueue.length === 0) return;
  const current = handoutReviewQueue[0];
  if (!current?.id) return;

  handoutReviewBusy = true;
  setHandoutReviewButtonsDisabled(true);

  try {
    const ref = doc(db, "sessions", state.sessionId, "handouts", current.id);
    if (action === "delete") {
      await deleteDoc(ref);
    } else {
      await updateDoc(ref, {
        claimedByUid: null,
        claimedByNick: null,
        claimedAt: null,
      });
    }

    const card = handoutReviewStack?.querySelector(".handoutReviewCard");
    if (card) {
      await new Promise((resolve) => {
        card.classList.add("handoutReviewCard--leaving");
        card.addEventListener("animationend", resolve, { once: true });
      });
    }

    handoutReviewQueue.shift();
    renderHandoutReviewCard();
  } catch (err) {
    console.error("Handout review action failed:", err);
    showToast("Could not update this handout right now.", "error");
    setHandoutReviewButtonsDisabled(false);
  } finally {
    handoutReviewBusy = false;
    if (handoutReviewQueue.length > 0) setHandoutReviewButtonsDisabled(false);
  }
}

btnHandoutReviewClose && (btnHandoutReviewClose.onclick = () => closeHandoutReviewModal());
btnHandoutReviewKeep && (btnHandoutReviewKeep.onclick = () => {
  resolveCurrentHandoutReview("keep").catch((err) => {
    console.warn("Handout keep failed:", err);
  });
});
btnHandoutReviewDelete && (btnHandoutReviewDelete.onclick = () => {
  resolveCurrentHandoutReview("delete").catch((err) => {
    console.warn("Handout delete failed:", err);
  });
});

function getGMDeckAssignablePlayers() {
  return (state.activePlayers || []).filter((player) => {
    if (!player?.id) return false;
    if (player?.isNpc === true) return false;
    return true;
  });
}

function populateGMDeckAssignablePlayers(selectedUid = "") {
  if (!gmHandoutDeckPlayer) return;
  const players = getGMDeckAssignablePlayers();
  gmHandoutDeckPlayer.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = players.length > 0 ? "Select player..." : "No players available";
  gmHandoutDeckPlayer.appendChild(defaultOption);

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = String(player.id || "");
    option.textContent = String(player.nickname || "Adventurer");
    gmHandoutDeckPlayer.appendChild(option);
  });

  if (selectedUid && players.some((p) => String(p.id) === selectedUid)) {
    gmHandoutDeckPlayer.value = selectedUid;
  }
}

function sortGMDeckItems(items) {
  return (items || []).slice().sort((a, b) => {
    const sa = Number.isFinite(Number(a?.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
    const sb = Number.isFinite(Number(b?.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return toMillisSafe(b?.updatedAt || b?.createdAt) - toMillisSafe(a?.updatedAt || a?.createdAt);
  });
}

function getGMDeckFilteredItems() {
  const typeFilter = String(gmHandoutDeckFilter || "all").toLowerCase();
  return sortGMDeckItems(state.gmHandoutsRaw || []).filter((item) => {
    const handoutType = String(item?.type || "").toLowerCase();
    if (typeFilter !== "all" && handoutType !== typeFilter) return false;
    if (gmHandoutDeckKeepExistingClaims && String(item?.claimedByUid || "").trim()) return false;
    return true;
  });
}

function setGMDeckQueueFromItems(items) {
  const source = Array.isArray(items) ? items : [];
  gmHandoutDeckQueue = source.map((item, idx) => ({
    ...item,
    totalIndex: idx + 1,
    totalCount: source.length,
  }));
}

function syncGMDeckFilterUI() {
  gmHandoutDeckFilterRow?.querySelectorAll("[data-deck-filter]").forEach((button) => {
    const value = String(button.getAttribute("data-deck-filter") || "all").toLowerCase();
    button.classList.toggle("chip--active", value === gmHandoutDeckFilter);
    button.setAttribute("aria-pressed", String(value === gmHandoutDeckFilter));
  });
  if (btnGMDeckKeepClaims) {
    btnGMDeckKeepClaims.classList.toggle("chip--active", gmHandoutDeckKeepExistingClaims);
    btnGMDeckKeepClaims.setAttribute("aria-pressed", String(gmHandoutDeckKeepExistingClaims));
  }
}

function rebuildGMHandoutDeck(options = {}) {
  const preserveCurrentId = String(options.currentId || "").trim();
  const items = getGMDeckFilteredItems();
  if (!preserveCurrentId) {
    setGMDeckQueueFromItems(items);
    renderGMHandoutDeckCard();
    return;
  }

  const currentIndex = items.findIndex((item) => String(item?.id || "") === preserveCurrentId);
  if (currentIndex <= 0) {
    setGMDeckQueueFromItems(items);
    renderGMHandoutDeckCard();
    return;
  }

  const rotated = items.slice(currentIndex).concat(items.slice(0, currentIndex));
  setGMDeckQueueFromItems(rotated);
  renderGMHandoutDeckCard();
}

function setGMHandoutDeckButtonsDisabled(disabled) {
  const hasPlayers = getGMDeckAssignablePlayers().length > 0;
  if (btnGMHandoutDeckSkip) btnGMHandoutDeckSkip.disabled = !!disabled || gmHandoutDeckQueue.length <= 1;
  if (btnGMHandoutDeckAssign) btnGMHandoutDeckAssign.disabled = !!disabled || !hasPlayers;
  if (btnGMHandoutDeckDelete) btnGMHandoutDeckDelete.disabled = !!disabled;
  if (btnGMHandoutDeckClose) btnGMHandoutDeckClose.disabled = !!disabled && gmHandoutDeckBusy;
  if (gmHandoutDeckPlayer) gmHandoutDeckPlayer.disabled = !!disabled || !hasPlayers;
}

function renderGMHandoutDeckCard() {
  if (!gmHandoutDeckStack || !gmHandoutDeckProgress) return;
  gmHandoutDeckStack.innerHTML = "";
  syncGMDeckFilterUI();

  if (gmHandoutDeckQueue.length === 0) {
    gmHandoutDeckProgress.textContent = "Done";
    if (gmHandoutDeckSummary) {
      gmHandoutDeckSummary.textContent = "Your handout deck is complete for the current filter settings.";
    }
    const done = document.createElement("div");
    done.className = "handoutReviewDone";
    done.textContent = "No more handouts to review.";
    gmHandoutDeckStack.appendChild(done);
    setGMHandoutDeckButtonsDisabled(true);
    showToast("Handout deck complete.", "success");
    return;
  }

  const item = gmHandoutDeckQueue[0];
  gmHandoutDeckProgress.textContent = `${Math.max(1, item.totalIndex)} of ${Math.max(1, item.totalCount)}`;
  if (gmHandoutDeckSummary) {
    gmHandoutDeckSummary.textContent = gmHandoutDeckKeepExistingClaims
      ? "Assign ownership quickly or delete handouts while preserving existing claims."
      : "Assign ownership quickly or delete handouts while preparing your session.";
  }

  const card = document.createElement("article");
  card.className = "handoutReviewCard handoutReviewCard--entering";
  const art = String(getVisibleHandoutImageUrl(item, "dm", state.uid) || getHandoutAvatarImageUrl(item) || "").trim();
  const claimMeta = String(item.claimedByNick || "").trim();
  const claimLine = claimMeta ? ` · Claimed by ${claimMeta}` : "";
  const imgHtml = art
    ? `<img class="handoutReviewCard__art" src="${escapeHtml(art)}" alt="${escapeHtml(item.title || "Handout")} preview">`
    : `<div class="handoutReviewCard__art handoutReviewCard__art--empty" aria-hidden="true">No Image</div>`;

  card.innerHTML = `
    <div class="handoutReviewCard__media">${imgHtml}</div>
    <div class="handoutReviewCard__content">
      <div class="handoutReviewCard__title">${escapeHtml(item.title || "Untitled Handout")}</div>
      <div class="handoutReviewCard__meta">${escapeHtml(String(item.type || "handout").toUpperCase())}${escapeHtml(claimLine)}</div>
      <p class="handoutReviewCard__desc">${escapeHtml(truncateHandoutPreview(item.publicContent || item.secretContent || ""))}</p>
    </div>
  `;

  card.addEventListener("animationend", () => {
    card.classList.remove("handoutReviewCard--entering");
  }, { once: true });

  gmHandoutDeckStack.appendChild(card);
  setGMHandoutDeckButtonsDisabled(false);
}

function openGMHandoutDeckModal() {
  if (state.role !== "dm" || !state.sessionId) return;
  const all = getGMDeckFilteredItems();
  if (all.length === 0) {
    showToast("No handouts available yet.", "info");
    return;
  }

  setGMDeckQueueFromItems(all);
  gmHandoutDeckBusy = false;
  populateGMDeckAssignablePlayers();
  renderGMHandoutDeckCard();
  animateModalIn(gmHandoutDeckModal);
}

function closeGMHandoutDeckModal() {
  if (gmHandoutDeckBusy) return;
  gmHandoutDeckQueue = [];
  gmHandoutDeckBusy = false;
  animateModalOut(gmHandoutDeckModal);
}

async function resolveCurrentGMHandoutDeck(action) {
  if (gmHandoutDeckBusy || !state.sessionId || gmHandoutDeckQueue.length === 0) return;
  const current = gmHandoutDeckQueue[0];
  if (!current?.id) return;

  gmHandoutDeckBusy = true;
  setGMHandoutDeckButtonsDisabled(true);

  try {
    const ref = doc(db, "sessions", state.sessionId, "handouts", current.id);

    if (action === "delete") {
      await deleteDoc(ref);
    } else {
      const targetUid = String(gmHandoutDeckPlayer?.value || "").trim();
      if (!targetUid) {
        showToast("Select a player before assigning.", "error");
        setGMHandoutDeckButtonsDisabled(false);
        gmHandoutDeckBusy = false;
        return;
      }

      const target = getGMDeckAssignablePlayers().find((p) => String(p.id || "") === targetUid);
      if (!target) {
        showToast("Selected player is not available.", "error");
        setGMHandoutDeckButtonsDisabled(false);
        gmHandoutDeckBusy = false;
        return;
      }

      const isMap = isMapHandoutType(current?.type);
      await updateDoc(ref, {
        claimable: true,
        claimedByUid: targetUid,
        claimedByNick: String(target.nickname || "Adventurer"),
        mapVisibleToUid: isMap ? targetUid : null,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const card = gmHandoutDeckStack?.querySelector(".handoutReviewCard");
    if (card) {
      await new Promise((resolve) => {
        card.classList.add("handoutReviewCard--leaving");
        card.addEventListener("animationend", resolve, { once: true });
      });
    }

    gmHandoutDeckQueue.shift();
    if (action === "assign" && gmHandoutDeckQueue.length === 0) {
      closeGMHandoutDeckModal();
      showToast("Handout assigned. Deck complete.", "success");
      return;
    }
    renderGMHandoutDeckCard();
  } catch (err) {
    console.error("GM handout deck action failed:", err);
    showToast("Could not update this handout right now.", "error");
    setGMHandoutDeckButtonsDisabled(false);
  } finally {
    gmHandoutDeckBusy = false;
    if (gmHandoutDeckQueue.length > 0) setGMHandoutDeckButtonsDisabled(false);
  }
}

function skipCurrentGMHandoutDeckCard() {
  if (gmHandoutDeckBusy || gmHandoutDeckQueue.length <= 1) return;
  const current = gmHandoutDeckQueue.shift();
  if (!current) return;
  gmHandoutDeckQueue.push(current);
  setGMDeckQueueFromItems(gmHandoutDeckQueue);
  renderGMHandoutDeckCard();
}

btnOpenGMHandoutDeck && (btnOpenGMHandoutDeck.onclick = () => openGMHandoutDeckModal());
btnGMHandoutDeckClose && (btnGMHandoutDeckClose.onclick = () => closeGMHandoutDeckModal());
btnGMHandoutDeckSkip && (btnGMHandoutDeckSkip.onclick = () => skipCurrentGMHandoutDeckCard());
btnGMHandoutDeckAssign && (btnGMHandoutDeckAssign.onclick = () => {
  resolveCurrentGMHandoutDeck("assign").catch((err) => {
    console.warn("GM deck assign failed:", err);
  });
});
btnGMHandoutDeckDelete && (btnGMHandoutDeckDelete.onclick = () => {
  resolveCurrentGMHandoutDeck("delete").catch((err) => {
    console.warn("GM deck delete failed:", err);
  });
});
gmHandoutDeckFilterRow?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-deck-filter]");
  if (!(button instanceof HTMLElement)) return;
  const value = String(button.getAttribute("data-deck-filter") || "all").toLowerCase();
  gmHandoutDeckFilter = value || "all";
  rebuildGMHandoutDeck({ currentId: gmHandoutDeckQueue[0]?.id || "" });
});
btnGMDeckKeepClaims?.addEventListener("click", () => {
  gmHandoutDeckKeepExistingClaims = !gmHandoutDeckKeepExistingClaims;
  rebuildGMHandoutDeck({ currentId: gmHandoutDeckQueue[0]?.id || "" });
});
gmHandoutDeckModal?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  if (gmHandoutDeckModal.classList.contains("hidden")) return;
  const target = event.target;
  if (target instanceof HTMLButtonElement && target.id === "btnGMHandoutDeckDelete") return;
  event.preventDefault();
  resolveCurrentGMHandoutDeck("assign").catch((err) => {
    console.warn("GM deck Enter shortcut failed:", err);
  });
});

function renderNotifications() {
  if (!notifList || !notifEmpty) return;
  notifList.innerHTML = "";
  if (notifItems.length === 0) {
    notifEmpty.classList.remove("hidden");
    return;
  }
  notifEmpty.classList.add("hidden");
  notifItems.forEach((n, index) => {
    const el = document.createElement("div");
    el.className = `notifItem list-stagger-item${n.read ? "" : " notifItem--unread"}`;
    el.dataset.id = n.id;
    el.style.setProperty("--stagger-index", String(index));
    const icon = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
    const iconHtml = n.type === "nuggetSpent"
      ? `<img src="placeholders/nuggetPlaceholder1Small.png" alt="" aria-hidden="true" class="nuggetIcon">`
      : escapeHtml(icon);
    const timeStr = n.createdAt?.toDate
      ? n.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    el.innerHTML = `<span class="notifItem__icon" aria-hidden="true">${iconHtml}</span>`
      + `<div class="notifItem__body">`
      + `<span class="notifItem__msg">${escapeHtml(n.message)}</span>`
      + `<span class="notifItem__time">${escapeHtml(timeStr)}</span>`
      + `</div>`;
    el.addEventListener("click", () => {
      handleNotificationClick(n).catch((err) => {
        console.warn("Notification click handler failed:", err);
      });
    });
    notifList.appendChild(el);
  });
  updateNotifBadge();
}

async function markNotifRead(notifId) {
  if (!state.sessionId) return;
  const item = notifItems.find(n => n.id === notifId);
  if (item) item.read = true;
  renderNotifications();
  try {
    await updateDoc(doc(db, "sessions", state.sessionId, "notifications", notifId), { read: true });
  } catch (e) { console.warn("markNotifRead:", e); }
}

async function markAllNotifsRead() {
  if (!state.sessionId) return;
  notifItems.forEach(n => { n.read = true; });
  renderNotifications();
  for (const n of notifItems) {
    try {
      await updateDoc(doc(db, "sessions", state.sessionId, "notifications", n.id), { read: true });
    } catch (e) { /* ignore */ }
  }
}
btnNotifMarkAll?.addEventListener("click", markAllNotifsRead);

// Subscribe to notifications � called when entering a session.
function subscribeNotifications() {
  // onSnapshot reminder: a realtime listener that re-runs callback whenever matching data changes.
  // unsub reminder: stored unsubscribe function is called later to stop the listener cleanly.
  if (!state.sessionId || !state.uid) return;
  if (state.unsubNotifications) state.unsubNotifications();
  const notifsRef = collection(db, "sessions", state.sessionId, "notifications");
  const q = query(notifsRef, where("targetUid", "==", state.uid), orderBy("createdAt", "desc"), limit(10));
  state.unsubNotifications = onSnapshot(q, (snap) => {
    notifItems = snap.docs.map((d) => {
      const data = d.data() || {};
      // Only explicit `false` counts as unread to avoid stale legacy docs keeping bell lit.
      return { id: d.id, ...data, read: data.read === false ? false : true };
    });
    renderNotifications();
    // Show bell if in a session
    btnNotifBell?.classList.remove("hidden");
    // Check for blocking modals (transfer, profile offer)
    checkBlockingNotifications();
  }, (err) => {
    console.warn("Notification listener error:", err);
  });
}

// Create a notification for a target player (used by GM actions).
async function createNotification(targetUid, type, message, payload = {}) {
  if (!state.sessionId) return;
  try {
    await addDoc(collection(db, "sessions", state.sessionId, "notifications"), {
      targetUid,
      type,
      message,
      payload,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (e) { console.warn("createNotification:", e); }
}

// Check for role-transfer or profile-offer notifications and show blocking modal.
function checkBlockingNotifications() {
  // Transfer modal
  const transferNotif = notifItems.find(n => n.type === "roleTransfer" && !n.read);
  if (transferNotif && transferModal) {
    transferModalMsg && (transferModalMsg.textContent = transferNotif.message || "The GM wants to transfer the GM role to you.");
    animateModalIn(transferModal);
  }
  // Profile offer modal
  const profileNotif = notifItems.find(n => n.type === "profileOffer" && !n.read);
  if (profileNotif && profileOfferModal) {
    profileOfferMsg && (profileOfferMsg.textContent = profileNotif.message || "The GM has created a character for you.");
    if (profileOfferPreview && profileNotif.payload) {
      const p = profileNotif.payload;
      let html = `<strong>${escapeHtml(p.name || "Character")}</strong>`;
      if (p.bio) html += `<p class="muted small">${escapeHtml(p.bio)}</p>`;
      const statKeys = ["level","armorRating","hitPoints","initiative","strength","dexterity","constitution","intelligence","wisdom","charisma"];
      const stats = statKeys.filter(k => p[k] != null).map(k => `<div class="profileOfferPreview__stat"><span>${k}</span><span>${p[k]}</span></div>`).join("");
      if (stats) html += `<div class="profileOfferPreview__stats">${stats}</div>`;
      profileOfferPreview.innerHTML = html;
    }
    animateModalIn(profileOfferModal);
  }
  // Session deleted modal � blocking overlay for players
  const deletedNotif = notifItems.find(n => n.type === "sessionDeleted" && !n.read);
  if (deletedNotif && sessionDeletedModal) {
    animateModalIn(sessionDeletedModal);
  }
}

// -- Nugget Currency System --
const NUGGET_STARTING_BALANCE = 6;
const NUGGET_RESET_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const NUGGET_RESET_KEY = "tv_lastNuggetReset";

function updateNuggetDisplay(balance) {
  if (nuggetBalanceEl) nuggetBalanceEl.textContent = String(balance ?? 0);
  const shopBal = $("nuggetShopBalance");
  if (shopBal) shopBal.textContent = String(balance ?? 0);
}

function subscribeNuggets() {
  // Realtime wallet sync uses onSnapshot so nugget counts update immediately for current session.
  if (!state.sessionId || !state.uid) return;
  if (state.unsubNuggets) state.unsubNuggets();

  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);

  state.unsubNuggets = onSnapshot(walletRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      updateNuggetDisplay(data.nuggets ?? 0);
    } else {
      // First time: create wallet with starting nuggets
      try {
        await setDoc(walletRef, { nuggets: NUGGET_STARTING_BALANCE });
        updateNuggetDisplay(NUGGET_STARTING_BALANCE);
      } catch (e) { console.warn("Init nugget wallet:", e); }
    }
  }, (err) => {
    console.warn("Nugget listener error:", err);
  });
}

// -- Nugget Shop --
const nuggetShopModal = $("nuggetShopModal");
const btnCloseNuggetShop = $("btnCloseNuggetShop");
const btnResetNuggets = $("btnResetNuggets");
const nuggetResetStatus = $("nuggetResetStatus");

function openNuggetShop() {
  if (!nuggetShopModal) return;
  const shopBal = $("nuggetShopBalance");
  if (shopBal && nuggetBalanceEl) shopBal.textContent = nuggetBalanceEl.textContent;
  updateNuggetResetStatus();
  animateModalIn(nuggetShopModal);
}

function updateNuggetResetStatus() {
  if (!nuggetResetStatus) return;
  const lastReset = parseInt(localStorage.getItem(NUGGET_RESET_KEY) || "0", 10);
  const elapsed = Date.now() - lastReset;
  if (elapsed < NUGGET_RESET_COOLDOWN_MS) {
    const minsLeft = Math.ceil((NUGGET_RESET_COOLDOWN_MS - elapsed) / 60000);
    nuggetResetStatus.textContent = `Available again in ${minsLeft} min`;
    if (btnResetNuggets) btnResetNuggets.disabled = true;
  } else {
    nuggetResetStatus.textContent = "";
    if (btnResetNuggets) btnResetNuggets.disabled = false;
  }
}

nuggetCounter?.addEventListener("click", () => openNuggetShop());
btnCloseNuggetShop?.addEventListener("click", () => { if (nuggetShopModal) animateModalOut(nuggetShopModal); });
nuggetShopModal?.addEventListener("click", (e) => { if (e.target === nuggetShopModal) animateModalOut(nuggetShopModal); });

btnResetNuggets?.addEventListener("click", async () => {
  if (!state.sessionId || !state.uid) return;
  const lastReset = parseInt(localStorage.getItem(NUGGET_RESET_KEY) || "0", 10);
  if (Date.now() - lastReset < NUGGET_RESET_COOLDOWN_MS) {
    updateNuggetResetStatus();
    showToast("Reset is on cooldown. Try again later.", "error");
    return;
  }
  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  try {
    await setDoc(walletRef, { nuggets: NUGGET_STARTING_BALANCE }, { merge: true });
    localStorage.setItem(NUGGET_RESET_KEY, String(Date.now()));
    showToast("Nuggets reset to 6!", "success");
    updateNuggetResetStatus();
  } catch (e) {
    console.error("Reset nuggets:", e);
    showToast("Could not reset nuggets.", "error");
  }
});

// -- Spend Nugget --
// Atomically deducts 1 nugget from the current user's wallet.
// Returns true if successful, false if insufficient balance or error.
async function spendNugget() {
  if (!state.sessionId || !state.uid) return false;
  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  try {
    const snap = await getDoc(walletRef);
    if (!snap.exists() || (snap.data().nuggets ?? 0) < 1) {
      showToast("Not enough nuggets! Visit the Nugget Shop.", "error");
      return false;
    }
    await updateDoc(walletRef, { nuggets: increment(-1) });
    return true;
  } catch (e) {
    console.error("spendNugget:", e);
    showToast("Could not spend nugget.", "error");
    return false;
  }
}

// Deducts 1 nugget and provides user feedback (toast + notification).
async function spendNuggetWithFeedback(reason) {
  const ok = await spendNugget();
  if (!ok) return false;
  showToast(`?? 1 nugget spent: ${reason}`, "info", 3000);
  createNotification(state.uid, "nuggetSpent", `1 nugget spent on ${reason}`);
  return true;
}

function confirmNuggetCost(message) {
  return window.confirm(`${message}\n\nThis action costs 1 nugget. Proceed?`);
}

let pendingAvatarNugget = false;
let pendingTemplateNugget = false;
let pendingHandoutNugget = false;
let pendingInventoryNugget = false;
let profileAvatarUploadConfirmed = false;
let createHandoutImageUploadConfirmed = false;
let editHandoutImageUploadConfirmed = false;

// -- GM Role Transfer --
// Flow: GM picks player ? sets PIN ? writes pendingTransfer doc ? target
// player sees blocking modal ? enters PIN ? gmUid is updated ? both reload.
async function initiateGMTransfer() {
  if (state.role !== "dm" || !state.sessionId) return;
  const players = (state.activePlayers || []).filter(p => (p.id || p.uid) !== state.uid);
  if (players.length === 0) { showToast("No players to transfer to.", "error"); return; }
  const choice = await openPlayerPicker({
    title: "Transfer GM Role",
    players,
    submitLabel: "Start Transfer",
    requirePin: true,
  });
  if (!choice) return;
  const targetUid = choice.uid;
  const pin = choice.pin;
  const pinHash = await sha256(pin.trim());
  try {
    await setDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"), {
      targetUid,
      pinHash,
      fromUid: state.uid,
      status: "pending",
      createdAt: serverTimestamp()
    });
    await createNotification(targetUid, "roleTransfer", `${state.displayName || "The GM"} wants to transfer the GM role to you.`, { fromUid: state.uid });
    showToast("Transfer initiated! Waiting for player to accept.", "info");
  } catch (e) {
    console.error("initiateGMTransfer:", e);
    showToast("Failed to initiate transfer.", "error");
  }
}

function renderPlayerPickerList(players) {
  if (!playerPickerList) return;
  playerPickerList.innerHTML = "";
  players.forEach((p, index) => {
    const uid = p.id || p.uid;
    const nick = p.nickname || getOwnerNick(uid) || uid;
    const row = document.createElement("button");
    row.type = "button";
    row.className = `playerPickerRow list-stagger-item${pickerSelectionUid === uid ? " is-active" : ""}`;
    row.dataset.uid = uid;
    row.style.setProperty("--stagger-index", String(index));
    row.innerHTML = `<span>${escapeHtml(nick)}</span><span class="muted small">${escapeHtml(uid)}</span>`;
    row.addEventListener("click", () => {
      pickerSelectionUid = uid;
      renderPlayerPickerList(players);
    });
    playerPickerList.appendChild(row);
  });
}

function closePlayerPicker(result = null) {
  if (playerPickerModal) animateModalOut(playerPickerModal);
  if (pickerResolver) {
    const resolve = pickerResolver;
    pickerResolver = null;
    resolve(result);
  }
}

function openPlayerPicker({ title, players, submitLabel = "Assign", requirePin = false }) {
  if (!playerPickerModal || !playerPickerList || !btnPlayerPickerConfirm) return Promise.resolve(null);
  if (!players || players.length === 0) return Promise.resolve(null);

  pickerSelectionUid = String(players[0].id || players[0].uid || "");
  if (playerPickerTitle) playerPickerTitle.textContent = title || "Select Player";
  btnPlayerPickerConfirm.textContent = submitLabel;
  if (playerPickerPinWrap) playerPickerPinWrap.classList.toggle("hidden", !requirePin);
  if (playerPickerPin) playerPickerPin.value = "";
  renderPlayerPickerList(players);
  animateModalIn(playerPickerModal);

  return new Promise((resolve) => {
    pickerResolver = resolve;

    btnPlayerPickerConfirm.onclick = () => {
      const uid = pickerSelectionUid;
      if (!uid) { showToast("Choose a player first.", "error"); return; }
      let pin = "";
      if (requirePin) {
        pin = String(playerPickerPin?.value || "").trim();
        if (!pin) { showToast("Set a one-time transfer PIN.", "error"); return; }
      }
      closePlayerPicker({ uid, pin });
    };

    if (btnPlayerPickerCancel) {
      btnPlayerPickerCancel.onclick = () => closePlayerPicker(null);
    }
    playerPickerModal.onclick = (e) => {
      if (e.target === playerPickerModal) closePlayerPicker(null);
    };
  });
}

btnTransferGMRole?.addEventListener("click", initiateGMTransfer);

// Target player accepts transfer
btnAcceptTransfer?.addEventListener("click", async () => {
  if (!state.sessionId || !state.uid) return;
  const pin = transferPinInput?.value?.trim();
  if (!pin) { showToast("Please enter the transfer PIN.", "error"); return; }
  try {
    const transferSnap = await getDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"));
    if (!transferSnap.exists()) { showToast("No pending transfer found.", "error"); return; }
    const data = transferSnap.data();
    if (data.targetUid !== state.uid) { showToast("This transfer is not for you.", "error"); return; }
    const pinHash = await sha256(pin);
    if (pinHash !== data.pinHash) { showToast("Incorrect PIN.", "error"); return; }
    // Execute transfer: update gmUid
    await updateDoc(doc(db, "sessions", state.sessionId), { gmUid: state.uid, updatedAt: serverTimestamp() });
    await deleteDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"));
    // Mark notification as read
    const transferNotif = notifItems.find(n => n.type === "roleTransfer" && !n.read);
    if (transferNotif) await markNotifRead(transferNotif.id);
    animateModalOut(transferModal);
    showToast("You are now the GM!", "info");
    // Reload to reflect new role
    state.role = "dm";
    cleanupListeners();
    openGMDashboard(state.sessionName);
  } catch (e) {
    console.error("acceptTransfer:", e);
    showToast("Transfer failed.", "error");
  }
});

btnDeclineTransfer?.addEventListener("click", async () => {
  if (!state.sessionId) return;
  try {
    await deleteDoc(doc(db, "sessions", state.sessionId, "pendingTransfer", "current"));
    const transferNotif = notifItems.find(n => n.type === "roleTransfer" && !n.read);
    if (transferNotif) await markNotifRead(transferNotif.id);
    animateModalOut(transferModal);
    showToast("Transfer declined.", "info");
  } catch (e) { console.warn("declineTransfer:", e); }
});

// -- GM manage player stats --
// When GM opens a player card, an "Edit Stats" button lets them modify
// session-scoped quickStats stored at sessions/{sid}/players/{uid}.
async function savePlayerQuickStats(uid, stats) {
  if (!state.sessionId || !uid) return;
  try {
    await updateDoc(doc(db, "sessions", state.sessionId, "players", uid), {
      quickStats: stats
    });
    showToast("Player stats saved.", "info");
  } catch (e) {
    console.error("savePlayerQuickStats:", e);
    showToast("Failed to save stats.", "error");
  }
}

// -- Keyboard shortcuts card --
btnShowShortcuts?.addEventListener("click", () => {
  if (shortcutOverlay) animateModalIn(shortcutOverlay);
});
btnCloseShortcuts?.addEventListener("click", () => {
  if (shortcutOverlay) animateModalOut(shortcutOverlay);
});
// Show shortcuts button only on desktop
if (matchMedia("(pointer: fine)").matches && btnShowShortcuts) {
  // Will be shown/hidden when settings menu is painted
}

// -- Settings menu: show/hide GM-only and desktop-only buttons --
function updateSettingsButtons() {
  const isGM = state.role === "dm";
  const hasSession = !!state.sessionId;
  const isDesktop = matchMedia("(pointer: fine)").matches;
  if (btnCharacterProfiles) btnCharacterProfiles.classList.toggle("hidden", !isGM || !hasSession);
  if (btnTransferGMRole) btnTransferGMRole.classList.toggle("hidden", !isGM || !hasSession);
  if (btnShowShortcuts) btnShowShortcuts.classList.toggle("hidden", !isDesktop || !hasSession);
}

// -- Character Templates CRUD --
let editingTemplateId = null; // null = creating new
let pendingTemplateImageUrl = null; // uploaded image URL for current template

btnPickTemplateImage?.addEventListener("click", () => templateImage?.click());
templateImage?.addEventListener("change", async () => {
  const file = templateImage.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (templateImageStatus) templateImageStatus.textContent = "Please select an image file.";
    return;
  }
  if (templateImageStatus) templateImageStatus.textContent = "Uploading...";
  let uploadFile;
  try { uploadFile = await compressImageToMaxSize(file); } catch (_) { if (templateImageStatus) templateImageStatus.textContent = "Could not process image."; return; }
  const ext = (uploadFile.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/templates/${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);
  try {
    await uploadBytes(ref, uploadFile, { contentType: uploadFile.type });
    pendingTemplateImageUrl = await getDownloadURL(ref);
    if (templateImagePreview) {
      templateImagePreview.src = pendingTemplateImageUrl;
      templateImagePreview.classList.remove("hidden");
    }
    if (templateImageStatus) templateImageStatus.textContent = "Uploaded (1 ?? on save).";
    pendingTemplateNugget = true;
  } catch (e) {
    console.error("Template image upload:", e);
    if (templateImageStatus) templateImageStatus.textContent = "Upload failed.";
  }
});

btnCharacterProfiles?.addEventListener("click", () => {
  showOnly(SCREEN_KEYS.CHARACTER_TEMPLATES);
  renderTemplateList();
});
btnBackFromTemplates?.addEventListener("click", () => showOnly(SCREEN_KEYS.SETTINGS));

btnCreateTemplate?.addEventListener("click", () => {
  editingTemplateId = null;
  pendingTemplateImageUrl = null;
  pendingTemplateNugget = false;
  if (templateModalTitle) templateModalTitle.textContent = "New Premade Profile";
  if (templateName) templateName.value = "";
  if (templateBio) templateBio.value = "";
  if (templateImagePreview) { templateImagePreview.src = ""; templateImagePreview.classList.add("hidden"); }
  if (templateImageStatus) templateImageStatus.textContent = "";
  if (templateImage) templateImage.value = "";
  PROFILE_STAT_KEYS.forEach(k => {
    const el = $(`tplStat${k.charAt(0).toUpperCase() + k.slice(1)}`);
    if (el) el.value = "";
  });
  if (createTemplateModal) animateModalIn(createTemplateModal);
});

btnCloseTemplateModal?.addEventListener("click", () => {
  pendingTemplateNugget = false;
  if (createTemplateModal) animateModalOut(createTemplateModal);
});
btnCancelTemplate?.addEventListener("click", () => {
  pendingTemplateNugget = false;
  if (createTemplateModal) animateModalOut(createTemplateModal);
});

btnSaveTemplate?.addEventListener("click", async () => {
  if (!state.sessionId) return;
  const name = templateName?.value?.trim();
  if (!name) { showToast("Character name is required.", "error"); return; }

  if (pendingTemplateNugget) {
    const ok = await spendNuggetWithFeedback("character image");
    if (!ok) return;
    pendingTemplateNugget = false;
  }

  const bio = templateBio?.value?.trim() || "";
  const stats = {};
  PROFILE_STAT_KEYS.forEach(k => {
    const el = $(`tplStat${k.charAt(0).toUpperCase() + k.slice(1)}`);
    const val = el?.value?.trim();
    if (val) stats[k] = isNaN(Number(val)) ? val : Number(val);
  });
  const payload = { name, bio, quickStats: stats, updatedAt: serverTimestamp() };
  if (pendingTemplateImageUrl) payload.imageUrl = pendingTemplateImageUrl;
  try {
    if (editingTemplateId) {
      await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", editingTemplateId), payload);
    } else {
      payload.assignedToUid = null;
      payload.assignmentStatus = "unassigned";
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "sessions", state.sessionId, "characterTemplates"), payload);
    }
    if (createTemplateModal) animateModalOut(createTemplateModal);
    showToast(editingTemplateId ? "Profile updated." : "Premade profile created!", "info");
    renderTemplateList();
  } catch (e) {
    console.error("saveTemplate:", e);
    showToast("Failed to save profile.", "error");
  }
});

async function renderTemplateList() {
  if (!templateList || !templateEmpty || !state.sessionId) return;
  try {
    const snap = await getDocs(query(collection(db, "sessions", state.sessionId, "characterTemplates"), orderBy("createdAt", "desc")));
    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    templateList.innerHTML = "";
    if (templates.length === 0) {
      templateEmpty.classList.remove("hidden");
      return;
    }
    templateEmpty.classList.add("hidden");
    const players = (state.activePlayers || []).filter(p => (p.id || p.uid) !== state.uid);

    templates.forEach(t => {
      const card = document.createElement("div");
      card.className = "templateCard item item--clickable";

      // Status badge
      const statusBadgeCls = t.assignmentStatus === "accepted" ? "templateCard__badge templateCard__badge--accepted"
        : t.assignmentStatus === "rejected" ? "templateCard__badge templateCard__badge--rejected"
        : t.assignmentStatus === "pending" ? "templateCard__badge templateCard__badge--pending"
        : "templateCard__badge";
      const statusIcon = t.assignmentStatus === "accepted"
        ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><path d="M4.5 12.75l6 6 9-13.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : t.assignmentStatus === "rejected"
        ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`
        : t.assignmentStatus === "pending"
        ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:11px;height:11px;flex-shrink:0"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/></svg>`;
      const statusLabel = t.assignmentStatus === "accepted" ? "Accepted"
        : t.assignmentStatus === "rejected" ? "Rejected"
        : t.assignmentStatus === "pending" ? "Pending"
        : "Unassigned";

      // Avatar
      const initial = escapeHtml((t.name || "?").trim().charAt(0).toUpperCase());
      const avatarHtml = t.imageUrl
          ? `<div class="templateCard__avatar"><img class="templateCard__avatarImg" src="${escapeHtml(t.imageUrl)}" alt="${escapeHtml(t.name)}" loading="lazy"></div>`
        : `<div class="templateCard__avatar templateCard__avatar--initials" aria-hidden="true">${initial}</div>`;

      card.innerHTML = `
        ${avatarHtml}
        <div class="templateCard__body">
          <div class="templateCard__titleRow">
            <strong class="templateCard__name">${escapeHtml(t.name)}</strong>
            <span class="${statusBadgeCls}">${statusIcon}${statusLabel}</span>
          </div>
          <p class="templateCard__bio muted small">${escapeHtml(t.bio || "")}</p>
        </div>
        <div class="templateActions">
          <button class="btn btn--small btn--ghost tpl-edit templateActionBtn" type="button" aria-label="Edit premade profile" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L9.75 17.963 6 18.75l.787-3.75L16.862 4.487Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn btn--small btn--ghost tpl-assign templateActionBtn" type="button" ${t.assignmentStatus === "accepted" ? "disabled" : ""} aria-label="Assign to player" title="Assign to player">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg>
          </button>
          <button class="btn btn--small btn--ghost tpl-qr templateActionBtn" type="button" ${t.assignedToUid ? "disabled" : ""} aria-label="Share via QR code" title="Share via QR code">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="4" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="14" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.8"/><path d="M15 14h2v2h-2v-2Zm3 0h2v4h-2v-4Zm-3 3h2v3h-2v-3Z" fill="currentColor"/></svg>
          </button>
          <button class="btn btn--small btn--danger tpl-delete templateActionBtn" type="button" aria-label="Delete premade profile" title="Delete profile">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4h6m-9 3h12m-9 0v11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      `;

      // Edit
      card.querySelector(".tpl-edit")?.addEventListener("click", (e) => {
        e.stopPropagation();
        editingTemplateId = t.id;
        pendingTemplateImageUrl = t.imageUrl || null;
        if (templateModalTitle) templateModalTitle.textContent = "Edit Premade Profile";
        if (templateName) templateName.value = t.name || "";
        if (templateBio) templateBio.value = t.bio || "";
        if (templateImagePreview) {
          if (t.imageUrl) { templateImagePreview.src = t.imageUrl; templateImagePreview.classList.remove("hidden"); }
          else { templateImagePreview.src = ""; templateImagePreview.classList.add("hidden"); }
        }
        if (templateImageStatus) templateImageStatus.textContent = "";
        if (templateImage) templateImage.value = "";
        PROFILE_STAT_KEYS.forEach(k => {
          const el = $(`tplStat${k.charAt(0).toUpperCase() + k.slice(1)}`);
          if (el) el.value = t.quickStats?.[k] ?? "";
        });
        if (createTemplateModal) animateModalIn(createTemplateModal);
      });

      // Assign
      card.querySelector(".tpl-assign")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (players.length === 0) { showToast("No players in session.", "error"); return; }
        const choice = await openPlayerPicker({
          title: `Assign \"${t.name}\"`,
          players,
          submitLabel: "Assign",
          requirePin: false,
        });
        if (!choice) return;
        const targetUid = choice.uid;
        const targetPlayer = players.find((p) => (p.id || p.uid) === targetUid);
        const targetName = targetPlayer?.nickname || getOwnerNick(targetUid) || targetUid;
        try {
          await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", t.id), {
            assignedToUid: targetUid,
            assignmentStatus: "pending"
          });
          await createNotification(targetUid, "profileOffer", `The GM created a character for you: ${t.name}`, {
            templateId: t.id, name: t.name, bio: t.bio, imageUrl: t.imageUrl || null, ...t.quickStats
          });
          showToast(`Profile sent to ${targetName}.`, "info");
          renderTemplateList();
        } catch (err) {
          console.error("assignTemplate:", err);
          showToast("Failed to assign template.", "error");
        }
      });

      // QR code
      card.querySelector(".tpl-qr")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof QRCode === "undefined") { showToast("QR library not loaded.", "error"); return; }
        const pinPart = state.gmPinPlain ? `&pin=${encodeURIComponent(state.gmPinPlain)}` : "";
        const url = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag || state.sessionId)}${pinPart}&template=${encodeURIComponent(t.id)}`;
        const container = document.createElement("div");
        container.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center";
        container.className = "modal";
        const inner = document.createElement("div");
        inner.style.cssText = "background:var(--card);padding:24px;border-radius:var(--radius-sm);text-align:center";
        inner.innerHTML = `<p style="margin-bottom:8px;color:var(--text)"><strong>${escapeHtml(t.name)}</strong></p>`;
        const qrDiv = document.createElement("div");
        inner.appendChild(qrDiv);
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close";
        closeBtn.className = "btn btn--small";
        closeBtn.style.marginTop = "12px";
        closeBtn.addEventListener("click", () => container.remove());
        inner.appendChild(closeBtn);
        container.appendChild(inner);
        container.addEventListener("click", (ev) => { if (ev.target === container) container.remove(); });
        document.body.appendChild(container);
        new QRCode(qrDiv, { text: url, width: 200, height: 200 });
      });

      // Delete
      card.querySelector(".tpl-delete")?.addEventListener("click", (e) => {
        e.stopPropagation();
        showUndoToast(`Delete "${t.name}"?`, async () => {
          try {
            await deleteDoc(doc(db, "sessions", state.sessionId, "characterTemplates", t.id));
            renderTemplateList();
          } catch (err) { showToast("Failed to delete template.", "error"); }
        });
      });

      templateList.appendChild(card);
    });
  } catch (e) {
    console.error("renderTemplateList:", e);
  }
}

// Player accepts profile offer
btnAcceptProfile?.addEventListener("click", async () => {
  const profileNotif = notifItems.find(n => n.type === "profileOffer" && !n.read);
  if (!profileNotif || !state.sessionId || !state.uid) return;
  const p = profileNotif.payload || {};
  try {
    // Build the role-profile payload using the same dual-write pattern as saveCurrentProfile()
    const quickStats = {};
    PROFILE_STAT_KEYS.forEach(k => { if (p[k] != null) quickStats[k] = p[k]; });

    const roleProfilePayload = {};
    if (p.name) roleProfilePayload.displayName = p.name;
    if (p.bio)  roleProfilePayload.bio = p.bio;
    if (p.imageUrl) roleProfilePayload.avatarUrl = p.imageUrl;
    if (Object.keys(quickStats).length > 0) roleProfilePayload.quickStats = quickStats;

    const writePayload = {
      roleProfiles: { player: roleProfilePayload },
      updatedAt: serverTimestamp(),
    };

    // Legacy top-level fields for broad compatibility (mirrors saveCurrentProfile)
    if (p.name) writePayload.displayName = p.name;
    if (p.bio)  writePayload.bio = p.bio;
    if (p.imageUrl) writePayload.avatarUrl = p.imageUrl;
    if (Object.keys(quickStats).length > 0) writePayload.quickStats = quickStats;

    await setDoc(doc(db, "users", state.uid), writePayload, { merge: true });
    if (p.name) {
      applyResolvedNicknameState(p.name, { overwriteInput: true });
      await syncNicknameToProfile(p.name);
    }

    // Refresh profile cache so the editor shows updated stats immediately
    try {
      await loadUserProfile(state.uid, { role: "player", force: true });
      updateTopBarAvatar(p.imageUrl || "");
    } catch (_) {}

    let templateId = String(p.templateId || "").trim();
    if (!templateId) {
      const pendingForPlayer = await getDocs(query(
        collection(db, "sessions", state.sessionId, "characterTemplates"),
        where("assignedToUid", "==", state.uid),
        where("assignmentStatus", "==", "pending"),
        limit(1)
      ));
      if (!pendingForPlayer.empty) templateId = pendingForPlayer.docs[0].id;
    }

    // Update template status
    if (templateId) {
      await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", templateId), {
        assignmentStatus: "accepted"
      });
    }
    await markNotifRead(profileNotif.id);
    animateModalOut(profileOfferModal);
    renderProfileScreen().catch(() => {});
    showToast("Character profile applied!", "info");
  } catch (e) {
    console.error("acceptProfile:", e);
    showToast("Failed to apply profile.", "error");
  }
});

btnRejectProfile?.addEventListener("click", async () => {
  const profileNotif = notifItems.find(n => n.type === "profileOffer" && !n.read);
  if (!profileNotif || !state.sessionId) return;
  const p = profileNotif.payload || {};
  try {
    let templateId = String(p.templateId || "").trim();
    if (!templateId && state.uid) {
      const pendingForPlayer = await getDocs(query(
        collection(db, "sessions", state.sessionId, "characterTemplates"),
        where("assignedToUid", "==", state.uid),
        where("assignmentStatus", "==", "pending"),
        limit(1)
      ));
      if (!pendingForPlayer.empty) templateId = pendingForPlayer.docs[0].id;
    }

    if (templateId) {
      await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", templateId), {
        assignmentStatus: "rejected"
      });
    }
    await markNotifRead(profileNotif.id);
    animateModalOut(profileOfferModal);
    showToast("Profile rejected.", "info");
  } catch (e) { console.warn("rejectProfile:", e); }
});

// -- Inventory search/filter --
let inventorySearchQuery = "";
inventorySearch?.addEventListener("input", debounce(() => {
  inventorySearchQuery = (inventorySearch.value || "").trim().toLowerCase();
  renderInventoryScreen();
}, 250));

// -- Session notes (multi-file notes library + local cache + Firestore sync) --
const NOTES_SAVE_DEBOUNCE_MS = 1200;
const NOTES_DEFAULT_TITLE = "Untitled Note";
const NOTES_LEGACY_TITLE = "Legacy Notes";
const NOTES_TAG_STOP_WORDS = new Set(["about", "after", "again", "also", "been", "before", "being", "both", "campaign", "clues", "could", "from", "have", "into", "just", "lore", "more", "most", "note", "notes", "over", "plan", "session", "some", "that", "their", "them", "then", "there", "these", "this", "those", "through", "very", "what", "when", "with", "will", "your"]);
let notesConfirmCallbacks = { onConfirm: null, onSecondary: null };

function getNotesAutoSaveKey() {
  const uid = String(state.uid || "").trim();
  return uid ? `tv_note_files_autosave_${uid}` : "tv_note_files_autosave";
}

function setNotesEditorOpen(isOpen) {
  if (!notesWorkspace) return;
  notesWorkspace.classList.toggle("notesWorkspace--editorOpen", !!isOpen);
}

function closeNotesMorePopover() {
  if (!notesMorePopover || !btnNotesMore) return;
  notesMorePopover.classList.add("hidden");
  btnNotesMore.setAttribute("aria-expanded", "false");
}

function toggleNotesMorePopover() {
  if (!notesMorePopover || !btnNotesMore || btnNotesMore.disabled) return;
  const shouldOpen = notesMorePopover.classList.contains("hidden");
  notesMorePopover.classList.toggle("hidden", !shouldOpen);
  btnNotesMore.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  if (shouldOpen) {
    window.setTimeout(() => notesMorePopover.querySelector(".notesMorePopover__item")?.focus(), 0);
  } else {
    btnNotesMore.focus();
  }
}

function getNoteActionIcon(kind) {
  if (kind === "restore") {
    return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 4.5v5.25h5.25"/></svg>';
  }
  if (kind === "pin") {
    return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"/><circle cx="12" cy="9" r="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 7.5h15"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.75h4.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l.9 10.12A1.5 1.5 0 0 0 9.14 19h5.72a1.5 1.5 0 0 0 1.49-1.38l.9-10.12"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11.25v4.5M14 11.25v4.5"/></svg>';
}

function getNotesCollectionRef() {
  const sid = String(state.sessionId || "").trim();
  if (!sid) return null;
  return collection(db, "sessions", sid, "noteFiles");
}

function getNoteDocRef(noteId) {
  const sid = String(state.sessionId || "").trim();
  const normalizedId = String(noteId || "").trim();
  if (!sid || !normalizedId) return null;
  return doc(db, "sessions", sid, "noteFiles", normalizedId);
}

function getLegacyNotesStorageKey() {
  const sid = String(state.sessionId || "").trim();
  const uid = String(state.uid || "").trim();
  return (sid && uid) ? `tv_notes_${sid}_${uid}` : "";
}

function getLegacyNotesDocRef() {
  const sid = String(state.sessionId || "").trim();
  const uid = String(state.uid || "").trim();
  if (!sid || !uid) return null;
  return doc(db, "sessions", sid, "notes", uid);
}

function getTodayDateInputValue() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function normalizeNoteTitle(value) {
  const normalized = String(value || "").trim();
  return normalized || NOTES_DEFAULT_TITLE;
}

function normalizeNoteTags(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean))).slice(0, 8);
  }
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 8);
}

function normalizeNoteDate(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : getTodayDateInputValue();
}

function getCurrentTagDraftFragment() {
  const rawValue = String(noteTagsInput?.value || "");
  const parts = rawValue.split(",");
  return String(parts[parts.length - 1] || "").trim().toLowerCase();
}

function extractNoteKeywords(text) {
  const counts = new Map();
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 4 && !NOTES_TAG_STOP_WORDS.has(entry))
    .forEach((entry) => counts.set(entry, (counts.get(entry) || 0) + 1));
  return [...counts.entries()]
    .sort((left, right) => (right[1] - left[1]) || (right[0].length - left[0].length) || left[0].localeCompare(right[0]))
    .map(([entry]) => entry)
    .slice(0, 15);
}

function getTagSuggestions(note) {
  if (!note) return [];
  const usedCounts = new Map();
  (state.notes.items || []).forEach((entry) => {
    normalizeNoteTags(entry.tags).forEach((tag) => usedCounts.set(tag, (usedCounts.get(tag) || 0) + 1));
  });
  const frequentTags = [...usedCounts.entries()]
    .sort((left, right) => (right[1] - left[1]) || left[0].localeCompare(right[0]))
    .map(([tag]) => tag);
  const contentKeywords = extractNoteKeywords(`${note.title || ""} ${note.content || ""}`);
  const currentTags = new Set(normalizeNoteTags(noteTagsInput?.value || note.tags || []));
  const fragment = getCurrentTagDraftFragment();
  return [...new Set([...frequentTags, ...contentKeywords])]
    .filter((tag) => !currentTags.has(tag))
    .filter((tag) => !fragment || tag.includes(fragment))
    .slice(0, 10);
}

function renderTagSuggestions(note = getActiveNote()) {
  if (!notesTagSuggestions) return;
  const shouldShow = !!note && document.activeElement === noteTagsInput;
  const suggestions = shouldShow ? getTagSuggestions(note) : [];
  notesTagSuggestions.innerHTML = "";
  notesTagSuggestions.classList.toggle("hidden", suggestions.length === 0);
  if (suggestions.length === 0) return;
  const fragment = document.createDocumentFragment();
  suggestions.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag notesTagSuggestionChip";
    button.innerHTML = `<span aria-hidden="true">+</span>${escapeHtml(tag)}`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const mergedTags = normalizeNoteTags([...(getActiveNote()?.tags || []), tag]);
      if (noteTagsInput) noteTagsInput.value = mergedTags.join(", ");
      updateActiveNoteDraft({ tags: mergedTags });
      noteTagsInput?.focus();
    });
    fragment.appendChild(button);
  });
  notesTagSuggestions.appendChild(fragment);
}

function openNotesConfirmModal({ title = "Are you sure?", body = "", okLabel = "Confirm", okStyle = "danger", secondaryLabel = "", onConfirm = null, onSecondary = null } = {}) {
  if (!notesConfirmModal || !notesConfirmTitle || !notesConfirmBody || !btnNotesConfirmOk || !btnNotesConfirmSecondary) return;
  notesConfirmCallbacks = { onConfirm, onSecondary };
  notesConfirmTitle.textContent = title;
  notesConfirmBody.textContent = body;
  btnNotesConfirmOk.textContent = okLabel;
  btnNotesConfirmOk.className = okStyle === "danger" ? "btn btn--danger" : "btn";
  btnNotesConfirmSecondary.textContent = secondaryLabel || "";
  btnNotesConfirmSecondary.className = secondaryLabel ? "btn" : "btn hidden";
  btnNotesConfirmSecondary.classList.toggle("hidden", !secondaryLabel);
  animateModalIn(notesConfirmModal);
  window.setTimeout(() => (btnNotesConfirmSecondary.classList.contains("hidden") ? btnNotesConfirmCancel : btnNotesConfirmSecondary)?.focus(), 0);
}

function closeNotesConfirmModal() {
  notesConfirmCallbacks = { onConfirm: null, onSecondary: null };
  if (notesConfirmModal) animateModalOut(notesConfirmModal);
}

function goBackFromNotes() {
  setNotesEditorOpen(false);
  closeNotesMorePopover();
  const backScreen = state.role === "dm" ? "gmDash" : "plView";
  showOnly(backScreen);
}

function serializeNoteDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function parseSerializedNoteDate(value) {
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
  if (value instanceof Date) return value;
  return null;
}

function normalizeNoteRecord(note, fallbackId = "") {
  if (!note || typeof note !== "object") return null;
  const normalizedId = String(note.id || fallbackId || "").trim();
  if (!normalizedId) return null;
  return {
    id: normalizedId,
    ownerUid: String(note.ownerUid || state.uid || "").trim(),
    title: normalizeNoteTitle(note.title),
    content: String(note.content || ""),
    sessionDate: normalizeNoteDate(note.sessionDate),
    tags: normalizeNoteTags(note.tags),
    status: String(note.status || "active").trim() === "archived" ? "archived" : "active",
    createdAt: parseSerializedNoteDate(note.createdAt) || new Date(),
    updatedAt: parseSerializedNoteDate(note.updatedAt) || new Date(),
    deletedAt: parseSerializedNoteDate(note.deletedAt),
  };
}

function sortNoteItems(items) {
  const pinnedId = state.notes.pinnedNoteId;
  return [...(items || [])].sort((left, right) => {
    if (pinnedId) {
      if (left.id === pinnedId) return -1;
      if (right.id === pinnedId) return 1;
    }
    const leftUpdated = serializeNoteDateValue(left.updatedAt) || 0;
    const rightUpdated = serializeNoteDateValue(right.updatedAt) || 0;
    return rightUpdated - leftUpdated;
  });
}

function getActiveNote() {
  const activeId = String(state.notes.activeId || "").trim();
  return (state.notes.items || []).find((note) => note.id === activeId) || null;
}

function isNoteVisibleInCurrentView(note, options = {}) {
  if (!note) return false;
  const scope = options.scope === "archived" ? "archived" : "active";
  const search = String(options.searchQuery ?? state.notes.searchQuery ?? "").trim().toLowerCase();
  const tagFilter = String(options.tagFilter ?? state.notes.tagFilter ?? "").trim().toLowerCase();
  if (note.status !== scope) return false;
  if (tagFilter && !(note.tags || []).includes(tagFilter)) return false;
  if (!search) return true;
  return buildNoteSearchText(note).includes(search);
}

function getRenderedActiveNote() {
  const activeNote = getActiveNote();
  return isNoteVisibleInCurrentView(activeNote) ? activeNote : null;
}

function getNextVisibleNoteId(options = {}) {
  const excludingId = String(options.excludingId || "").trim();
  return getFilteredNotes().find((note) => note.id !== excludingId)?.id || null;
}

function focusNotesScopeControl(scope = state.notes.scope) {
  const target = scope === "archived" ? btnNotesScopeBin : btnNotesScopeActive;
  target?.focus();
}

function clearActiveNoteSelection(options = {}) {
  state.notes.activeId = null;
  state.notes.dirty = false;
  closeNotesMorePopover();
  if (options.closeEditor !== false) setNotesEditorOpen(false);
}

function changeNotesScope(nextScope) {
  const normalizedScope = nextScope === "archived" ? "archived" : "active";
  if (normalizedScope === state.notes.scope) return;
  const activeNote = getActiveNote();
  const activeWouldRemainVisible = isNoteVisibleInCurrentView(activeNote, {
    scope: normalizedScope,
    searchQuery: state.notes.searchQuery,
    tagFilter: state.notes.tagFilter,
  });

  const applyScopeChange = () => {
    state.notes.scope = normalizedScope;
    if (state.notes.activeId && !activeWouldRemainVisible) {
      clearActiveNoteSelection();
    }
    renderNotesUI();
    if (!activeWouldRemainVisible) {
      requestAnimationFrame(() => focusNotesScopeControl(normalizedScope));
    }
  };

  if (state.notes.dirty && state.notes.activeId && !activeWouldRemainVisible) {
    openNotesConfirmModal({
      title: "Unsaved changes",
      body: "Save your current note before changing views?",
      okLabel: "Discard & Switch",
      okStyle: "danger",
      secondaryLabel: "Save & Switch",
      onConfirm: applyScopeChange,
      onSecondary: async () => {
        const saved = await saveNotesNow(false);
        if (saved !== false) applyScopeChange();
      },
    });
    return;
  }

  applyScopeChange();
}

function focusNotesFilterControl(kind = "search") {
  if (kind === "search") {
    notesSearch?.focus();
    const valueLength = String(notesSearch?.value || "").length;
    notesSearch?.setSelectionRange?.(valueLength, valueLength);
    return;
  }
  if (state.notes.tagFilter) {
    btnNotesTagFilter?.focus();
    return;
  }
  notesSearch?.focus();
}

function applyNotesViewFilters(nextFilters = {}, options = {}) {
  const nextSearchQuery = String(nextFilters.searchQuery ?? state.notes.searchQuery ?? "").trim();
  const nextTagFilter = String(nextFilters.tagFilter ?? state.notes.tagFilter ?? "").trim().toLowerCase();
  const focusKind = options.focusKind === "filter" ? "filter" : "search";
  const tagFilterChanged = nextTagFilter !== state.notes.tagFilter;

  if (nextSearchQuery === state.notes.searchQuery && nextTagFilter === state.notes.tagFilter) {
    if (focusKind === "search" && notesSearch && notesSearch.value !== state.notes.searchQuery) {
      notesSearch.value = state.notes.searchQuery;
    }
    return;
  }

  const activeNote = getActiveNote();
  const activeWouldRemainVisible = isNoteVisibleInCurrentView(activeNote, {
    scope: state.notes.scope,
    searchQuery: nextSearchQuery,
    tagFilter: nextTagFilter,
  });

  const applyFilterChange = () => {
    state.notes.searchQuery = nextSearchQuery;
    state.notes.tagFilter = nextTagFilter;
    if (state.notes.activeId && !activeWouldRemainVisible) {
      clearActiveNoteSelection();
    }
    renderNotesUI();
    if (focusKind === "search") {
      requestAnimationFrame(() => focusNotesFilterControl("search"));
      return;
    }
    if (!activeWouldRemainVisible || tagFilterChanged) {
      requestAnimationFrame(() => focusNotesFilterControl("filter"));
    }
  };

  if (state.notes.dirty && state.notes.activeId && !activeWouldRemainVisible) {
    if (focusKind === "search" && notesSearch) {
      notesSearch.value = state.notes.searchQuery;
    }
    openNotesConfirmModal({
      title: "Unsaved changes",
      body: "Save your current note before changing filters?",
      okLabel: "Discard & Filter",
      okStyle: "danger",
      secondaryLabel: "Save & Filter",
      onConfirm: applyFilterChange,
      onSecondary: async () => {
        const saved = await saveNotesNow(false);
        if (saved !== false) applyFilterChange();
      },
    });
    return;
  }

  applyFilterChange();
}

function setNotesStatus(message) {
  if (notesStatus) notesStatus.textContent = String(message || "").trim();
}

function formatNoteTimestamp(value, fallback = "-") {
  const date = value instanceof Date ? value : (typeof value?.toDate === "function" ? value.toDate() : null);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return fallback;
  return formatLastSeenDate(date);
}

function formatNoteSessionDate(value) {
  const normalized = normalizeNoteDate(value);
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toLocaleDateString();
}

function buildNoteSearchText(note) {
  return [note.title, note.content, ...(note.tags || [])].join("\n").toLowerCase();
}

function renderNotesStats() {
  const items = state.notes.items || [];
  if (notesStatActive) notesStatActive.textContent = String(items.filter((note) => note.status === "active").length);
  if (notesStatArchived) notesStatArchived.textContent = String(items.filter((note) => note.status === "archived").length);
}

function renderNotesTagPreview(note) {
  if (!notesTagPreview) return;
  const tags = note?.tags || [];
  notesTagPreview.innerHTML = "";
  notesTagPreview.classList.toggle("hidden", tags.length === 0);
  if (tags.length === 0) return;
  const fragment = document.createDocumentFragment();
  tags.forEach((tag) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag notesTagChip";
    chip.textContent = `#${tag}`;
    chip.addEventListener("click", () => {
      applyNotesViewFilters({ tagFilter: tag }, { focusKind: "filter" });
    });
    fragment.appendChild(chip);
  });
  notesTagPreview.appendChild(fragment);
}

function renderNotesEmptyState(filteredCount, totalCount) {
  if (!notesEmpty) return;
  const show = filteredCount === 0;
  notesEmpty.classList.toggle("hidden", !show);
  if (!show) return;
  if (notesEmptyTitle) {
    notesEmptyTitle.textContent = totalCount === 0
      ? "No notes yet"
      : (state.notes.scope === "archived" ? "No notes in the bin" : "No notes match this search");
  }
  if (notesEmptyHint) {
    notesEmptyHint.textContent = totalCount === 0
      ? "Create a note for this session, a subject, or a plan."
      : (state.notes.scope === "archived"
        ? "Move notes to the bin from the editor when you want to archive them."
        : "Try a different search term or clear the current tag filter.");
  }
  btnNotesEmptyCreate?.classList.toggle("hidden", state.notes.scope === "archived");
}

function getFilteredNotes() {
  const search = String(state.notes.searchQuery || "").trim().toLowerCase();
  const scope = state.notes.scope === "archived" ? "archived" : "active";
  const tagFilter = String(state.notes.tagFilter || "").trim().toLowerCase();
  return sortNoteItems(
    (state.notes.items || []).filter((note) => {
      if (note.status !== scope) return false;
      if (tagFilter && !(note.tags || []).includes(tagFilter)) return false;
      if (!search) return true;
      return buildNoteSearchText(note).includes(search);
    })
  );
}

function renderNotesList() {
  if (!notesList) return;
  const filtered = getFilteredNotes();
  const renderedActiveId = getRenderedActiveNote()?.id || "";
  const totalInScope = (state.notes.items || []).filter((note) => note.status === state.notes.scope).length;
  notesList.innerHTML = "";
  renderNotesEmptyState(filtered.length, totalInScope);
  if (filtered.length === 0) return;

  const fragment = document.createDocumentFragment();
  filtered.forEach((note) => {
    const isArchived = note.status === "archived";
    const isPinned = note.id === state.notes.pinnedNoteId;
    const row = document.createElement("div");
    row.className = `item notesListItem${note.id === renderedActiveId ? " notesListItem--active" : ""}${isPinned ? " notesListItem--pinned" : ""}`;
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.innerHTML = `
      <div class="item__meta">
        <div class="item__body">
          <div class="handoutMetaRow notesListItem__metaRow">
            <span class="tag">NOTE</span>
            <span class="notesListItem__date">${escapeHtml(formatNoteSessionDate(note.sessionDate))}</span>
          </div>
          <div class="item__title"><strong>${escapeHtml(note.title)}</strong></div>
          <p class="item__preview">${escapeHtml(String(note.content || "").trim() || "No content yet.")}</p>
          <div class="notesListItem__footer">
            <span class="notesListItem__updated">Updated ${escapeHtml(formatNoteTimestamp(note.updatedAt))}</span>
            <div class="notesListItem__tags">${(note.tags || []).map((tag) => `<button type="button" class="tag notesListItem__tag">#${escapeHtml(tag)}</button>`).join("")}</div>
          </div>
        </div>
      </div>
      <div class="item__right notesListItem__actions">
        ${isArchived
          ? `<button type="button" class="iconBtn notesActionBtn" data-action="restore" aria-label="Restore note" title="Restore note">${getNoteActionIcon("restore")}</button>
             <button type="button" class="iconBtn notesActionBtn notesActionBtn--danger" data-action="delete" aria-label="Delete note forever" title="Delete forever">${getNoteActionIcon("delete")}</button>`
          : `<button type="button" class="iconBtn notesActionBtn notesActionBtn--pin" data-action="pin" aria-label="${isPinned ? "Unpin note" : "Pin note to top"}" aria-pressed="${isPinned}" title="${isPinned ? "Unpin note" : "Pin to top"}">${getNoteActionIcon("pin")}</button>
             <button type="button" class="iconBtn notesActionBtn" data-action="archive" aria-label="Move note to bin" title="Move note to bin">${getNoteActionIcon("delete")}</button>`}
      </div>
    `;
    row.addEventListener("click", () => setActiveNote(note.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setActiveNote(note.id);
      }
    });
    row.querySelectorAll(".notesListItem__tag").forEach((tagButton, index) => {
      tagButton.addEventListener("click", (event) => {
        event.stopPropagation();
        applyNotesViewFilters({ tagFilter: note.tags[index] || "" }, { focusKind: "filter" });
      });
    });
    row.querySelectorAll(".notesActionBtn").forEach((actionButton) => {
      actionButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        const action = actionButton.getAttribute("data-action");
        if (action === "pin") {
          state.notes.pinnedNoteId = state.notes.pinnedNoteId === note.id ? null : note.id;
          renderNotesList();
          return;
        }
        if (action === "archive") await archiveNote(note.id);
        if (action === "restore") await restoreNote(note.id);
        if (action === "delete") await deleteNoteForever(note.id);
      });
    });
    fragment.appendChild(row);
  });
  notesList.appendChild(fragment);
}

function renderActiveNote() {
  const note = getRenderedActiveNote();
  const hasNote = !!note;
  const isTitleFocused = document.activeElement === noteTitleInput;
  const isTagsFocused = document.activeElement === noteTagsInput;
  const isEditorFocused = document.activeElement === notesEditor;
  if (notesEditorHeading) notesEditorHeading.textContent = hasNote ? (isTitleFocused ? (String(noteTitleInput?.value || "").trim() || NOTES_DEFAULT_TITLE) : note.title) : "Select a note";
  notesEditorEmptyState?.classList.toggle("hidden", hasNote);
  notesEditorActions?.classList.toggle("hidden", !hasNote);
  notesEditorFields?.classList.toggle("hidden", !hasNote);
  notesEditor?.classList.toggle("hidden", !hasNote);
  notesStatus?.classList.toggle("hidden", !hasNote);
  if (noteTitleInput) {
    if (!isTitleFocused) noteTitleInput.value = hasNote ? (note.title === NOTES_DEFAULT_TITLE ? "" : note.title) : "";
    noteTitleInput.disabled = !hasNote;
  }
  if (noteSessionDateInput) {
    noteSessionDateInput.value = hasNote ? normalizeNoteDate(note.sessionDate) : "";
    noteSessionDateInput.disabled = !hasNote;
  }
  if (noteTagsInput) {
    if (!isTagsFocused) noteTagsInput.value = hasNote ? (note.tags || []).join(", ") : "";
    noteTagsInput.disabled = !hasNote;
  }
  if (notesEditor) {
    if (!isEditorFocused) notesEditor.value = hasNote ? note.content : "";
    notesEditor.disabled = !hasNote;
  }
  btnNotesMore?.toggleAttribute("disabled", !hasNote);
  if (!hasNote) closeNotesMorePopover();
  btnNotesArchive?.classList.toggle("hidden", !hasNote || note.status === "archived");
  btnNotesArchive?.toggleAttribute("disabled", !hasNote || note.status === "archived");
  btnNotesRestore?.classList.toggle("hidden", !hasNote || note.status !== "archived");
  btnNotesRestore?.toggleAttribute("disabled", !hasNote || note.status !== "archived");
  btnNotesSave?.toggleAttribute("disabled", !hasNote);
  btnNotesSave?.classList.toggle("btn--active", !!(hasNote && state.notes.dirty));
  if (btnNotesSave) {
    btnNotesSave.setAttribute("aria-label", hasNote && state.notes.dirty ? "Save note with unsaved changes" : "Save note");
    btnNotesSave.title = hasNote && state.notes.dirty ? "Save unsaved changes" : "Save note";
  }
  renderNotesTagPreview(note);
  renderTagSuggestions(note);
  if (!hasNote) {
    setNotesStatus(state.notes.isLoading ? "Loading notes..." : "Select a note to begin.");
    return;
  }
  if (state.notes.dirty && note.id === state.notes.activeId) {
    setNotesStatus("Unsaved changes");
    return;
  }
  setNotesStatus(`Saved ${formatNoteTimestamp(note.updatedAt)}`);
}

function renderNotesFilterState() {
  if (btnNotesScopeActive) {
    const isActive = state.notes.scope !== "archived";
    btnNotesScopeActive.classList.toggle("btn--active", isActive);
    btnNotesScopeActive.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  if (btnNotesScopeBin) {
    const isArchived = state.notes.scope === "archived";
    btnNotesScopeBin.classList.toggle("btn--active", isArchived);
    btnNotesScopeBin.setAttribute("aria-pressed", isArchived ? "true" : "false");
  }
  if (notesTagFilterWrap) notesTagFilterWrap.classList.toggle("hidden", !state.notes.tagFilter);
  if (btnNotesTagFilter) btnNotesTagFilter.textContent = state.notes.tagFilter ? `#${state.notes.tagFilter}` : "";
  if (btnNotesAutoSave) {
    btnNotesAutoSave.classList.toggle("btn--active", !!state.notes.autoSave);
    btnNotesAutoSave.setAttribute("aria-pressed", state.notes.autoSave ? "true" : "false");
    btnNotesAutoSave.setAttribute("aria-label", state.notes.autoSave ? "Auto-save is on" : "Auto-save is off");
    btnNotesAutoSave.title = state.notes.autoSave ? "Auto-save is on" : "Auto-save is off";
  }
}

function renderNotesUI() {
  if (notesSearch && notesSearch.value !== state.notes.searchQuery) notesSearch.value = state.notes.searchQuery;
  renderNotesStats();
  renderNotesFilterState();
  renderNotesList();
  renderActiveNote();
}

function setActiveNote(noteId) {
  const normalizedId = String(noteId || "").trim();
  if (!normalizedId) return;
  if (!(state.notes.items || []).some((note) => note.id === normalizedId)) return;
  const finishSelection = () => {
    state.notes.activeId = normalizedId;
    state.notes.dirty = false;
    renderNotesUI();
    setNotesEditorOpen(true);
  };
  if (state.notes.dirty && state.notes.activeId && normalizedId !== state.notes.activeId) {
    openNotesConfirmModal({
      title: "Unsaved changes",
      body: "Save your current note before switching to another one?",
      okLabel: "Discard & Switch",
      okStyle: "danger",
      secondaryLabel: "Save & Switch",
      onConfirm: finishSelection,
      onSecondary: async () => {
        const saved = await saveNotesNow(false);
        if (saved !== false) finishSelection();
      },
    });
    return;
  }
  finishSelection();
}

function buildNewNoteRecord(overrides = {}) {
  const now = new Date();
  return normalizeNoteRecord({
    id: overrides.id || "draft",
    ownerUid: state.uid,
    title: overrides.title || NOTES_DEFAULT_TITLE,
    content: overrides.content || "",
    sessionDate: overrides.sessionDate || getTodayDateInputValue(),
    tags: overrides.tags || [],
    status: overrides.status || "active",
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    deletedAt: overrides.deletedAt || null,
  }, overrides.id || "draft");
}

async function migrateLegacyNotesIfNeeded(existingCount = 0) {
  if (existingCount > 0) return false;
  const legacyRef = getLegacyNotesDocRef();
  const legacyKey = getLegacyNotesStorageKey();
  let legacyContent = String(legacyKey ? (localStorage.getItem(legacyKey) || "") : "").trim();
  if (legacyRef) {
    try {
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        legacyContent = String(legacySnap.data()?.content || legacyContent || "").trim();
      }
    } catch (err) {
      console.warn("Legacy notes migration read failed:", err);
    }
  }
  if (!legacyContent) return false;
  const notesRef = getNotesCollectionRef();
  if (!notesRef) return false;
  await addDoc(notesRef, {
    ownerUid: state.uid,
    title: NOTES_LEGACY_TITLE,
    content: legacyContent,
    sessionDate: getTodayDateInputValue(),
    tags: ["legacy"],
    status: "active",
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return true;
}

async function loadNotesForCurrentSession() {
  if (state.unsubNotes) {
    state.unsubNotes();
    state.unsubNotes = null;
  }
  state.notes.isLoading = true;
  state.notes.dirty = false;
  state.notes.didAttemptLegacyMigration = false;
  if (!notesEditor) {
    state.notes.isLoading = false;
    return;
  }
  state.notes.items = [];
  state.notes.activeId = null;
  renderNotesUI();

  const notesRef = getNotesCollectionRef();
  const uid = String(state.uid || "").trim();
  if (!notesRef || !uid) {
    state.notes.items = [];
    state.notes.activeId = null;
    state.notes.isLoading = false;
    renderNotesUI();
    setNotesStatus("Join a session to save notes.");
    return;
  }

  const notesQuery = query(notesRef, where("ownerUid", "==", uid), orderBy("updatedAt", "desc"));
  state.unsubNotes = onSnapshot(notesQuery, async (snap) => {
    if (snap.empty && !state.notes.didAttemptLegacyMigration) {
      state.notes.didAttemptLegacyMigration = true;
      try {
        const migrated = await migrateLegacyNotesIfNeeded(0);
        if (migrated) return;
      } catch (err) {
        console.warn("Legacy notes migration failed:", err);
      }
    }

    const dirtyActiveNote = state.notes.dirty ? getActiveNote() : null;
    let nextItems = sortNoteItems(
      snap.docs
        .map((docSnap) => normalizeNoteRecord({ id: docSnap.id, ...docSnap.data() }, docSnap.id))
        .filter(Boolean)
    );

    if (dirtyActiveNote?.id) {
      const preservedDraft = normalizeNoteRecord(dirtyActiveNote, dirtyActiveNote.id);
      const existingIndex = nextItems.findIndex((note) => note.id === preservedDraft.id);
      if (existingIndex >= 0) nextItems[existingIndex] = preservedDraft;
      else nextItems.unshift(preservedDraft);
      nextItems = sortNoteItems(nextItems);
    }

    state.notes.items = nextItems;
    if (!state.notes.activeId || !nextItems.some((note) => note.id === state.notes.activeId)) {
      state.notes.activeId = nextItems[0]?.id || null;
    }
    state.notes.isLoading = false;
    renderNotesUI();
    if (nextItems.length === 0) setNotesStatus("Create your first note to start journaling this session.");
  }, (err) => {
    state.notes.isLoading = false;
    console.warn("Notes sync failed:", err);
    renderNotesUI();
    setNotesStatus("Could not sync notes from the cloud.");
  });
}

async function createNoteFile(initial = {}) {
  const notesRef = getNotesCollectionRef();
  if (!notesRef || !state.uid) {
    showToast("Join a session before creating notes.", "error");
    return null;
  }
  const draft = buildNewNoteRecord(initial);
  try {
    const created = await addDoc(notesRef, {
      ownerUid: state.uid,
      title: draft.title,
      content: draft.content,
      sessionDate: draft.sessionDate,
      tags: draft.tags,
      status: draft.status,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const localDraft = buildNewNoteRecord({ ...draft, id: created.id });
    state.notes.items = sortNoteItems([localDraft, ...(state.notes.items || [])]);
    state.notes.scope = "active";
    state.notes.searchQuery = "";
    state.notes.tagFilter = "";
    state.notes.activeId = created.id;
    state.notes.dirty = false;
    renderNotesUI();
    setNotesEditorOpen(true);
    setNotesStatus("New note created.");
    showToast("New note created.", "success");
    return created.id;
  } catch (err) {
    console.error("Create note failed:", err);
    showToast("Could not create note.", "error");
    return null;
  }
}

function requestCreateNoteFile(initial = {}) {
  if (state.notes.dirty && state.notes.activeId) {
    openNotesConfirmModal({
      title: "Unsaved changes",
      body: "Save your current note before creating a new one?",
      okLabel: "Discard & Create",
      okStyle: "danger",
      secondaryLabel: "Save & Create",
      onConfirm: () => {
        createNoteFile(initial);
      },
      onSecondary: async () => {
        const saved = await saveNotesNow(false);
        if (saved !== false) await createNoteFile(initial);
      },
    });
    return;
  }
  createNoteFile(initial);
}

function updateActiveNoteDraft(changes, options = {}) {
  const activeNote = getActiveNote();
  if (!activeNote) return;
  const scheduleSave = options.scheduleSave !== false;
  state.notes.items = sortNoteItems(
    (state.notes.items || []).map((note) => note.id === activeNote.id
      ? normalizeNoteRecord({
          ...note,
          ...changes,
          updatedAt: new Date(),
        }, note.id)
      : note)
  );
  state.notes.dirty = true;
  renderNotesUI();
  setNotesStatus("Unsaved changes");
  if (scheduleSave && state.notes.autoSave) queueActiveNoteSave();
}

function queueActiveNoteSave() {
  if (state.notes.saveTimer) clearTimeout(state.notes.saveTimer);
  const noteId = state.notes.activeId;
  if (!noteId) return;
  state.notes.saveTimer = setTimeout(() => {
    state.notes.saveTimer = null;
    saveNoteById(noteId);
  }, NOTES_SAVE_DEBOUNCE_MS);
}

async function saveNoteById(noteId, options = {}) {
  const note = (state.notes.items || []).find((entry) => entry.id === noteId);
  const noteRef = getNoteDocRef(noteId);
  if (!note || !noteRef) return false;
  try {
    await updateDoc(noteRef, {
      title: normalizeNoteTitle(note.title),
      content: String(note.content || ""),
      sessionDate: normalizeNoteDate(note.sessionDate),
      tags: normalizeNoteTags(note.tags),
      status: note.status === "archived" ? "archived" : "active",
      deletedAt: note.status === "archived" ? (note.deletedAt || serverTimestamp()) : null,
      updatedAt: serverTimestamp(),
    });
    const savedAt = new Date();
    state.notes.items = sortNoteItems(
      (state.notes.items || []).map((entry) => entry.id === noteId
        ? {
            ...entry,
            updatedAt: savedAt,
            deletedAt: entry.status === "archived" ? (entry.deletedAt || savedAt) : null,
          }
        : entry)
    );
    if (state.notes.activeId === noteId) state.notes.dirty = false;
    renderNotesUI();
    setNotesStatus(`Saved ${formatNoteTimestamp(savedAt)}`);
    if (options.showToast) showToast("Note saved.", "success");
    return true;
  } catch (err) {
    console.error("Save note failed:", err);
    setNotesStatus("Save failed. Keep this note open and try again.");
    if (options.showToast !== false) showToast("Could not save note.", "error");
    return false;
  }
}

async function saveNotesNow(showSavedState = false) {
  if (state.notes.saveTimer) {
    clearTimeout(state.notes.saveTimer);
    state.notes.saveTimer = null;
  }
  const activeId = state.notes.activeId;
  if (!activeId) return false;
  return saveNoteById(activeId, { showToast: showSavedState });
}

async function archiveNote(noteId = state.notes.activeId) {
  const note = (state.notes.items || []).find((entry) => entry.id === noteId);
  if (!note) return;
  state.notes.items = sortNoteItems(
    (state.notes.items || []).map((entry) => entry.id === noteId
      ? { ...entry, status: "archived", deletedAt: new Date(), updatedAt: new Date() }
      : entry)
  );
  if (state.notes.activeId === noteId) state.notes.activeId = getNextVisibleNoteId({ excludingId: noteId });
  if (!state.notes.activeId) setNotesEditorOpen(false);
  renderNotesUI();
  await saveNoteById(noteId, { showToast: false });
  showToast("Note moved to bin.", "info");
}

async function restoreNote(noteId = state.notes.activeId) {
  const note = (state.notes.items || []).find((entry) => entry.id === noteId);
  if (!note) return;
  state.notes.items = sortNoteItems(
    (state.notes.items || []).map((entry) => entry.id === noteId
      ? { ...entry, status: "active", deletedAt: null, updatedAt: new Date() }
      : entry)
  );
  if (state.notes.scope === "archived") {
    state.notes.activeId = getNextVisibleNoteId({ excludingId: noteId });
  } else {
    state.notes.activeId = noteId;
  }
  if (!state.notes.activeId) setNotesEditorOpen(false);
  renderNotesUI();
  await saveNoteById(noteId, { showToast: false });
  showToast("Note restored.", "success");
}

async function deleteNoteForever(noteId = state.notes.activeId) {
  const note = (state.notes.items || []).find((entry) => entry.id === noteId);
  const noteRef = getNoteDocRef(noteId);
  if (!note || !noteRef) return;
  openNotesConfirmModal({
    title: "Delete note forever?",
    body: `"${note.title}" will be removed permanently. This cannot be undone.`,
    okLabel: "Delete",
    okStyle: "danger",
    onConfirm: async () => {
      try {
        await deleteDoc(noteRef);
        state.notes.items = (state.notes.items || []).filter((entry) => entry.id !== noteId);
        if (state.notes.activeId === noteId) {
          state.notes.activeId = getNextVisibleNoteId({ excludingId: noteId });
          if (!state.notes.activeId) setNotesEditorOpen(false);
        }
        state.notes.dirty = false;
        renderNotesUI();
        showToast("Note deleted forever.", "success");
      } catch (err) {
        console.error("Delete note failed:", err);
        showToast("Could not delete note.", "error");
      }
    },
  });
}

function buildNoteExportPayload(note, format = "txt") {
  const title = normalizeNoteTitle(note?.title);
  const safeTitle = title.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
  const sessionDate = normalizeNoteDate(note?.sessionDate || getTodayDateInputValue());
  const tags = normalizeNoteTags(note?.tags);
  if (format === "md") {
    return {
      fileName: `${safeTitle || "note"}-${sessionDate}.md`,
      mimeType: "text/markdown;charset=utf-8",
      content: [
        `# ${title}`,
        "",
        `- Session date: ${sessionDate}`,
        `- Updated: ${formatNoteTimestamp(note?.updatedAt)}`,
        tags.length ? `- Tags: ${tags.map((tag) => `#${tag}`).join(" ")}` : "- Tags: -",
        "",
        String(note?.content || ""),
      ].join("\n"),
    };
  }
  return {
    fileName: `${safeTitle || "note"}-${sessionDate}.txt`,
    mimeType: "text/plain;charset=utf-8",
    content: [
      title,
      `Session date: ${sessionDate}`,
      `Updated: ${formatNoteTimestamp(note?.updatedAt)}`,
      tags.length ? `Tags: ${tags.join(", ")}` : "Tags: -",
      "",
      String(note?.content || ""),
    ].join("\n"),
  };
}

function exportActiveNote(format = "txt") {
  const note = getRenderedActiveNote();
  if (!note) return;
  const payload = buildNoteExportPayload(note, format);
  const blob = new Blob([payload.content], { type: payload.mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = payload.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
  showToast(`Exported ${format.toUpperCase()} file.`, "success");
}

notesSearch?.addEventListener("input", () => {
  applyNotesViewFilters({ searchQuery: String(notesSearch.value || "") }, { focusKind: "search" });
});

btnNotesScopeActive?.addEventListener("click", () => {
  changeNotesScope("active");
});

btnNotesScopeBin?.addEventListener("click", () => {
  changeNotesScope("archived");
});

btnNotesClearTagFilter?.addEventListener("click", () => {
  applyNotesViewFilters({ tagFilter: "" }, { focusKind: "filter" });
});

btnNotesNew?.addEventListener("click", () => {
  requestCreateNoteFile();
});

btnNotesEmptyCreate?.addEventListener("click", () => {
  requestCreateNoteFile();
});

btnNotesEmptyEditorCreate?.addEventListener("click", () => {
  requestCreateNoteFile();
});

noteTitleInput?.addEventListener("input", () => {
  updateActiveNoteDraft({ title: noteTitleInput.value || "" });
});

noteSessionDateInput?.addEventListener("input", () => {
  updateActiveNoteDraft({ sessionDate: noteSessionDateInput.value || getTodayDateInputValue() });
});

noteTagsInput?.addEventListener("input", () => {
  updateActiveNoteDraft({ tags: normalizeNoteTags(noteTagsInput.value || "") });
});

noteTagsInput?.addEventListener("focus", () => {
  renderTagSuggestions();
});

noteTagsInput?.addEventListener("blur", () => {
  window.setTimeout(() => notesTagSuggestions?.classList.add("hidden"), UI_TIMERS.TAG_SUGGESTIONS_BLUR_MS);
});

notesEditor?.addEventListener("input", () => {
  updateActiveNoteDraft({ content: notesEditor.value || "" });
});

btnNotesArchive?.addEventListener("click", () => {
  archiveNote();
});

btnNotesRestore?.addEventListener("click", () => {
  restoreNote();
});

btnNotesCopyAll?.addEventListener("click", async () => {
  const note = getActiveNote();
  if (!note) return;
  await copyToClipboard(String(note.content || ""));
  closeNotesMorePopover();
  showToast("Copied note text.", "success");
});

btnNotesExportTxt?.addEventListener("click", () => {
  exportActiveNote("txt");
  closeNotesMorePopover();
});

btnNotesExportMd?.addEventListener("click", () => {
  exportActiveNote("md");
  closeNotesMorePopover();
});

btnNotesMore?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleNotesMorePopover();
});

btnNotesAutoSave?.addEventListener("click", () => {
  state.notes.autoSave = !state.notes.autoSave;
  localStorage.setItem(getNotesAutoSaveKey(), state.notes.autoSave ? "1" : "0");
  if (!state.notes.autoSave && state.notes.saveTimer) {
    clearTimeout(state.notes.saveTimer);
    state.notes.saveTimer = null;
  }
  renderNotesFilterState();
  showToast(state.notes.autoSave ? "Auto-save enabled." : "Auto-save disabled.", "info");
});

btnNotesEditorBack?.addEventListener("click", () => {
  setNotesEditorOpen(false);
  closeNotesMorePopover();
});

btnNotesConfirmCancel?.addEventListener("click", () => {
  closeNotesConfirmModal();
});

btnNotesConfirmSecondary?.addEventListener("click", async () => {
  const callback = notesConfirmCallbacks.onSecondary;
  closeNotesConfirmModal();
  if (typeof callback === "function") await callback();
});

btnNotesConfirmOk?.addEventListener("click", async () => {
  const callback = notesConfirmCallbacks.onConfirm;
  closeNotesConfirmModal();
  if (typeof callback === "function") await callback();
});

notesConfirmModal?.addEventListener("click", (event) => {
  if (event.target === notesConfirmModal) closeNotesConfirmModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (notesConfirmModal && !notesConfirmModal.classList.contains("hidden")) {
    closeNotesConfirmModal();
    return;
  }
  if (notesMorePopover && !notesMorePopover.classList.contains("hidden")) {
    closeNotesMorePopover();
    btnNotesMore?.focus();
  }
});

document.addEventListener("click", (event) => {
  if (!notesMorePopover || !btnNotesMore) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (notesMorePopover.contains(target) || btnNotesMore.contains(target)) return;
  closeNotesMorePopover();
});

// Manual save button
const btnNotesSave = $("btnNotesSave");
btnNotesSave?.addEventListener("click", async () => {
  await saveNotesNow(true);
});

btnNotesBack && (btnNotesBack.onclick = () => {
  if (state.notes.dirty) {
    openNotesConfirmModal({
      title: "Unsaved changes",
      body: "Leave notes without saving your latest changes?",
      okLabel: "Leave",
      okStyle: "danger",
      secondaryLabel: "Save & Leave",
      onConfirm: goBackFromNotes,
      onSecondary: async () => {
        await saveNotesNow(false);
        goBackFromNotes();
      },
    });
    return;
  }
  goBackFromNotes();
});

btnInfoBack && (btnInfoBack.onclick = () => {
  showOnly(getDefaultRoleScreen());
});

// -- Tooltip onboarding for first-time users --
function buildOnboardSteps() {
  const isGM = state.role === "dm";
  return [
    {
      title: "Welcome to TomeVault",
      text: isGM
        ? "You are in GM mode. This tour follows the latest dashboard flow and each highlighted control is live."
        : "You are in player mode. This tour shows where reveals, party tools, and your quick actions now live.",
    },
    isGM ? {
      title: "Invite Players",
      target: ["btnOpenSocialFromParty", "btnTopBarSocial"],
      tap: true,
      tutorialPlacement: "upper-safe",
      text: "Open Social from the party panel to reach invite tools, join link sharing, and QR access.",
    } : {
      title: "Live Handout Feed",
      target: ["plHandoutList", "screenPlayerView"],
      text: "New handouts and reveals appear here in real time from your GM.",
    },
    isGM ? {
      title: "Invite QR Screen",
      target: ["qrInviteModal", "gmSocialPanel"],
      delay: 320,
      text: "This is your fast invite surface. Players can scan instantly while you copy or share the same join link.",
    } : null,
    isGM ? {
      title: "Party Tools",
      target: "gmPartyPanel",
      text: "Start here for table awareness: roster, table dice, battle flow, and invite access.",
    } : {
      title: "Party Snapshot",
      target: "playerPartyPanel",
      text: "Track who is online and keep table context visible while you browse handouts.",
    },
    isGM ? {
      title: "Handout Command Center",
      target: ["gmHandoutsPanel", "gmDashList"],
      text: "Create, reveal, and organize handouts by type. Player updates are synced the moment you save.",
    } : null,
    isGM ? {
      title: "Handout Filters",
      target: "gmFilterRow",
      text: "Filter by handout type during active sessions to find exactly what you need.",
    } : null,
    {
      title: "Music & Ambience",
      target: "btnOpenAmbienceBar",
      tap: true,
      tutorialPlacement: "upper-safe",
      text: isGM
        ? "Open the ambience controls to set session audio for everyone."
        : "Use this button to quickly toggle your sound during play.",
    },
    {
      title: isGM ? "Ambience Panel" : "Audio Status",
      target: isGM ? "ambienceBar" : "btnOpenAmbienceBar",
      delay: 320,
      tutorialPlacement: isGM ? "upper-safe" : undefined,
      text: isGM
        ? "Pick a track, tune volume, and control playback. The table hears updates in sync."
        : "When active, your ambience button reflects your local listen state.",
    },
    {
      title: "Notifications",
      target: "btnNotifBell",
      tap: true,
      text: "The bell is your event feed for reveals, rewards, and important session updates.",
    },
    {
      title: isGM ? "Open GM Profile" : "Open Character Profile",
      target: "btnOpenProfile",
      tap: true,
      tutorialPlacement: "upper-safe",
      text: isGM
        ? "Open your profile to manage identity, campaign-facing info, and profile tools."
        : "Open your character sheet to update identity, stats, spells, and avatar.",
    },
    {
      title: isGM ? "Profile Screen" : "Character Sheet",
      target: "screenProfile",
      delay: 320,
      text: isGM
        ? "Manage your GM details here, including avatar and presentation settings."
        : "This is your editable sheet for stats, spells, and bio.",
    },
    {
      title: "Inventory",
      target: "btnOpenInventory",
      tap: true,
      tutorialPlacement: "upper-safe",
      text: "Open inventory to track currency and item ownership across the session.",
    },
    {
      title: "Session Notes",
      target: "btnOpenNotes",
      tap: true,
      tutorialPlacement: "upper-safe",
      text: "Notes are private per user and saved per session, with quick undo support.",
    },
    {
      title: "Quick Menu",
      target: "btnHamburger",
      tap: true,
      tutorialPlacement: "upper-safe",
      text: "Tap the menu button to open quick actions.",
    },
    {
      title: "Open Settings",
      target: "btnDialSettings",
      tap: true,
      delay: 200,
      tutorialPlacement: "upper-safe",
      text: "Tap the gear to open the settings drawer.",
    },
    {
      title: "Settings Drawer",
      target: "settingsDrawer",
      delay: 220,
      text: "Theme, role controls, replay tutorial, and session actions are all centralized here.",
    },
    {
      title: "You are ready",
      returnTo: isGM ? "gmDash" : "plView",
      text: isGM
        ? "Start by creating or revealing a handout, then use Social tools to invite players."
        : "You are set. Follow handout reveals, manage your inventory, and stay synced with your party.",
    },
  ].filter(Boolean);
}

function isOnboardTargetVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return false;
  const style = window.getComputedStyle(el);
  if (!style || style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  if (el.closest(".hidden")) return false;
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

function resolveOnboardTarget(stepConfig) {
  const targets = Array.isArray(stepConfig?.target)
    ? stepConfig.target
    : stepConfig?.target
    ? [stepConfig.target]
    : [];
  if (!targets.length) return null;
  const nodes = targets.map((id) => $(id)).filter(Boolean);
  if (!nodes.length) return null;
  return nodes.find((node) => isOnboardTargetVisible(node)) || nodes[0];
}

function completeOnboarding() {
  const roleKey = normalizeProfileRole(state.role || "player");
  localStorage.setItem(`tv_onboarded:${roleKey}`, "1");
  localStorage.removeItem(`tv_onboardingReplay:${roleKey}`);
}

function startOnboarding(options = {}) {
  const force = !!options.force;
  const roleKey = normalizeProfileRole(state.role || "player");
  const legacyCompleted = localStorage.getItem("tv_onboarded") === "1";
  if (legacyCompleted && !localStorage.getItem(`tv_onboarded:${roleKey}`)) {
    localStorage.setItem(`tv_onboarded:${roleKey}`, "1");
  }
  if (!force && localStorage.getItem(`tv_onboarded:${roleKey}`)) return;
  const STEPS = buildOnboardSteps();
  let step = 0;
  const overlay = document.createElement("div");
  overlay.className = "onboardOverlay";
  let activeTarget = null;
  let targetCleanup = null;
  const tapVerb = window.matchMedia?.("(pointer: coarse)")?.matches ? "Tap" : "Click";

  setHamburgerTutorialLock(true);

  function clearActiveTarget() {
    if (activeTarget) {
      activeTarget.classList.remove("onboard-target-active");
      activeTarget.style.removeProperty("z-index");
    }
    if (targetCleanup) { targetCleanup(); targetCleanup = null; }
    activeTarget = null;
  }

  function cleanupOnboarding() {
    clearActiveTarget();
    window.removeEventListener("resize", showStep);
    setHamburgerTutorialLock(false);
    overlay.remove();
  }

  function advance() {
    clearActiveTarget();
    step++;
    const next = STEPS[step];
    if (next && next.delay) {
      setTimeout(showStep, next.delay);
    } else {
      showStep();
    }
  }

  function showStep() {
    if (step >= STEPS.length) {
      cleanupOnboarding();
      completeOnboarding();
      return;
    }
    const s = STEPS[step];
    syncHamburgerSpeedDialPosition();

    if (s?.returnTo) {
      if (s.returnTo === SCREEN_KEYS.GM_DASH) {
        showOnly(SCREEN_KEYS.GM_DASH);
        try { setGMSocialMode(false); } catch (_) {}
      } else if (s.returnTo === SCREEN_KEYS.PLAYER_VIEW) {
        showOnly(SCREEN_KEYS.PLAYER_VIEW);
      }
    }

    const el = resolveOnboardTarget(s);
    overlay.innerHTML = "";

    if (el && isOnboardTargetVisible(el)) {
      const rect = el.getBoundingClientRect();
      const pad = 8;
      const spot = document.createElement("div");
      spot.className = "onboardSpotlight";
      spot.style.cssText = `top:${rect.top - pad}px;left:${rect.left - pad}px;width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px`;
      overlay.appendChild(spot);

      if (s.tap) {
        activeTarget = el;
        el.classList.add("onboard-target-active");
        el.style.zIndex = "8003";
        // Allow the real action to fire — just call advance() alongside it
        const handler = () => { advance(); };
        el.addEventListener("click", handler, { once: true });
        targetCleanup = () => { el.style.removeProperty("z-index"); };
      }
    }

    const tip = document.createElement("div");
    tip.className = "onboardTooltip";
    const isTap = s.tap && el;
    const isLast = step >= STEPS.length - 1;
    tip.innerHTML = `
      ${s.title ? `<div class="onboardTooltip__title">${escapeHtml(s.title)}</div>` : ""}
      <div class="onboardTooltip__text">${escapeHtml(s.text)}</div>
      ${isTap ? `<div class="onboardTooltip__tapHint"><span>👆</span><span>${escapeHtml(tapVerb)} the highlighted button to continue</span></div>` : ""}
      <div class="onboardTooltip__actions">
        <button class="onboard-skip" type="button" aria-label="Skip tutorial">Skip</button>
        ${!isTap ? `<button class="btn btn--small onboard-next" type="button">${isLast ? "Done" : "Next →"}</button>` : ""}
      </div>
      <div class="onboardTooltip__step">${step + 1} / ${STEPS.length}</div>
    `;
    tip.querySelector(".onboard-skip")?.addEventListener("click", () => {
      cleanupOnboarding();
      completeOnboarding();
    });
    tip.querySelector(".onboard-next")?.addEventListener("click", () => advance());

    // Adaptive positioning to keep tap targets unobstructed on phone + desktop.
    if (el) {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw <= 768;
      const margin = isMobile ? 12 : 16;
      const gap = isTap ? 22 : 12;

      tip.style.left = "0";
      tip.style.top = "0";
      tip.style.right = "auto";
      tip.style.bottom = "auto";
      tip.style.transform = "none";

      const maxWidthPx = Math.max(260, Math.min(420, vw - margin * 2));
      tip.style.maxWidth = `${maxWidthPx}px`;
      const tipWidth = Math.min(maxWidthPx, tip.offsetWidth || maxWidthPx);
      const tipHeight = tip.offsetHeight || 220;

      const spaceAbove = rect.top;
      const spaceBelow = vh - rect.bottom;
      const forceTopThird = s?.tutorialPlacement === "top-third" || s?.tutorialPlacement === "upper-safe";
      const topBarHeight = topBar?.offsetHeight || 0;
      const safeTop = Math.max(margin, topBarHeight + (isMobile ? 10 : 14));

      // Prefer above for tap steps in lower viewport (e.g. hamburger), else choose side with more room.
      const placeAbove = forceTopThird
        ? true
        : isTap
        ? (spaceAbove >= tipHeight + gap || rect.top > vh * 0.45)
        : (spaceBelow < tipHeight + gap && spaceAbove > spaceBelow);

      const anchorCenterX = rect.left + rect.width / 2;
      let left = anchorCenterX - tipWidth / 2;
      left = Math.max(margin, Math.min(vw - tipWidth - margin, left));

      let top;
      if (forceTopThird) {
        top = Math.max(safeTop, Math.round(vh * (isMobile ? 0.14 : 0.18)));
      } else if (placeAbove) {
        top = rect.top - tipHeight - gap;
      } else {
        top = rect.bottom + gap;
      }

      // Keep tooltip fully on-screen, and prioritize higher placement on cramped screens.
      top = Math.max(safeTop, Math.min(vh - tipHeight - margin, top));
      if (isTap && !placeAbove && rect.bottom + gap + tipHeight > vh - margin) {
        top = Math.max(safeTop, rect.top - tipHeight - gap);
      }

      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    } else {
      tip.classList.add("onboardTooltip--center");
    }
    overlay.appendChild(tip);
  }

  document.body.appendChild(overlay);
  window.addEventListener("resize", showStep);
  showStep();
}

// -- Virtual scrolling helper --
// Activates only when a list container has > 50 children. Uses IntersectionObserver
// to hide off-screen items and reserve their space, reducing DOM paint cost.
function initVirtualScroll(container, itemHeight = 72) {
  if (!container) return;
  const childCount = container.children.length;

  if (container._virtualSetupRaf) {
    cancelAnimationFrame(container._virtualSetupRaf);
    container._virtualSetupRaf = 0;
  }

  if (childCount <= 50) {
    if (container._virtualObserver) {
      container._virtualObserver.disconnect();
      container._virtualObserver = null;
    }
    return;
  }

  container._virtualSetupRaf = requestAnimationFrame(() => {
    container._virtualSetupRaf = 0;
    if (container._virtualObserver) {
      container._virtualObserver.disconnect();
      container._virtualObserver = null;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        if (entry.isIntersecting) {
          el.style.visibility = "visible";
          el.style.contentVisibility = "visible";
        } else {
          el.style.visibility = "hidden";
          el.style.contentVisibility = "hidden";
        }
      });
    }, { root: container, rootMargin: "64px 0px" });

    Array.from(container.children).forEach(child => {
      child.style.minHeight = `${itemHeight}px`;
      observer.observe(child);
    });

    container._virtualObserver = observer;
  });
}

// -- Drag-and-drop with Sortable.js --
let gmHandoutSortable = null;
let inventorySortables = [];

function initDragDrop() {
  if (typeof Sortable === "undefined") return;

  // GM handout list
  const gmList = $("gmHandoutList");
  if (gmList && state.role === "dm" && !gmHandoutSortable) {
    gmHandoutSortable = new Sortable(gmList, {
      animation: 150,
      handle: ".item",
      ghostClass: "item--dragging",
      onEnd: async (evt) => {
        if (!state.sessionId) return;
        const items = Array.from(gmList.children);
        const batch = [];
        items.forEach((el, i) => {
          const id = el.dataset.id;
          if (id) batch.push(updateDoc(doc(db, "sessions", state.sessionId, "handouts", id), { sortOrder: i }));
        });
        try { await Promise.all(batch); } catch (e) { console.warn("sortOrder update:", e); }
      }
    });
  }
}

// -- Modal animation helpers --
function pulseCopiedFeedback(...elements) {
  // Subtle visual confirmation on copy actions without adding extra noise.
  elements.filter(Boolean).forEach((el) => {
    el.classList.remove("is-copied");
    // Restart CSS animation on repeated fast clicks.
    void el.offsetWidth;
    el.classList.add("is-copied");
    setTimeout(() => el.classList.remove("is-copied"), 360);
  });
}

// -- Skeleton loading placeholders --
// Show shimmering fake cards while Firestore data is in transit.
// The first real render call (renderGMHandouts / renderPlayerHandouts / etc.)
// will do `container.innerHTML = ""` which clears the skeletons.
function showSkeletonCards(container, count = 3) {
  if (!container) return;
  container.innerHTML = Array.from({ length: count },
    () => '<div class="skeleton skeleton--card" aria-hidden="true"></div>'
  ).join("");
}

async function sha256(text) {
  // Converts plain pincode to SHA-256 digest so we compare hashes, not raw PIN.
  // This is stronger than storing pinPlain in Firestore documents.
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanupListeners() {
  // Realtime listeners keep connections open.
  // Before switching context/session, always unsubscribe old listeners to avoid:
  // - duplicate renders
  // - memory leaks
  // - stale updates from previous screens
  if (state.unsubSession) state.unsubSession();
  if (state.unsubHandouts) state.unsubHandouts();
  if (state.unsubPlayers) state.unsubPlayers();
  if (state.unsubInventory) state.unsubInventory();
  if (state.unsubWallets) state.unsubWallets();
  if (state.unsubNotifications) state.unsubNotifications();
  if (state.unsubTransfer) state.unsubTransfer();
  if (state.unsubNuggets) state.unsubNuggets();
  if (state.unsubTemplateAssignments) state.unsubTemplateAssignments();
  if (state.unsubChat) state.unsubChat();
  if (state.unsubNotes) state.unsubNotes();
  state.unsubSession = null;
  state.unsubHandouts = null;
  state.unsubPlayers = null;
  state.unsubInventory = null;
  state.unsubWallets = null;
  state.unsubNotifications = null;
  state.unsubTransfer = null;
  state.unsubNuggets = null;
  state.unsubTemplateAssignments = null;
  state.unsubChat = null;
  state.unsubNotes = null;
  notifItems = [];
  state.chat.messages = [];
  state.chat.isLoading = false;
  state.chat.isSending = false;
  state.chat.isClearing = false;
  state.chat.hasServerSnapshot = false;
  state.chat.fromCache = false;
  state.chat.error = "";
  state.chat.sessionId = null;
  state.chat.shouldAutoScroll = true;
  updateNotifBadge();
  if (notifPanel) {
    notifPanel.classList.add("hidden");
    notifPanel.setAttribute("aria-hidden", "true");
  }
  handoutReviewQueue = [];
  handoutReviewPlayerName = "";
  handoutReviewBusy = false;
  if (handoutReviewStack) handoutReviewStack.innerHTML = "";
  if (handoutReviewModal) {
    handoutReviewModal.classList.add("hidden");
    handoutReviewModal.setAttribute("aria-hidden", "true");
  }
  gmHandoutDeckQueue = [];
  gmHandoutDeckBusy = false;
  if (gmHandoutDeckStack) gmHandoutDeckStack.innerHTML = "";
  if (gmHandoutDeckModal) {
    gmHandoutDeckModal.classList.add("hidden");
    gmHandoutDeckModal.setAttribute("aria-hidden", "true");
  }
  gmSeenHumanPlayerIdsForJoinNotifs = null;
  gmTemplateStatusSnapshot = null;
}

function leaveCurrentSessionLocally(message, tone = "info") {
  releaseWakeLock();
  cleanupListeners();
  stopHeartbeat();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.sessionName = "";
  state.gmPinPlain = null;
  state.joinLink = null;
  state.gmHandoutsRaw = [];
  state.playerInventoryRaw = [];
  if (chatInput) chatInput.value = "";
  state.activePlayers = [];
  state.partyRoster = [];
  state.battleActive = false;
  state.gmUid = null;
  state.currentTurnUid = null;
  state.turnRound = 1;
  state.inventoryItems = [];
  state.wallets = {};
  localStorage.removeItem("tv_role");
  localStorage.removeItem("tv_sessionId");
  localStorage.removeItem("tv_joinTag");
  localStorage.removeItem("tv_dmPin");
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
  if (message) showToast(message, tone);
}

function persistLocal() {
  // localStorage keeps tiny pieces of state across refreshes.
  // This gives an app-like "resume where I left off" experience.
  localStorage.setItem("tv_role", state.role ?? "");
  localStorage.setItem("tv_sessionId", state.sessionId ?? "");
  localStorage.setItem("tv_joinTag", state.joinTag ?? "");
  if (plNick?.value?.trim()) localStorage.setItem("tv_nick", plNick.value.trim());
  if (state.playerNick?.trim()) localStorage.setItem("tv_nick", state.playerNick.trim());
  if (state.role === "dm" && state.gmPinPlain) localStorage.setItem("tv_dmPin", state.gmPinPlain);
  if (state.role === "dm" && state.sessionId) localStorage.setItem("tv_lastDmSessionId", state.sessionId);
}

function loadLocal() {
  // Reads previously persisted state and pre-fills form inputs.
  // This reduces friction for users re-opening the app.
  const r = localStorage.getItem("tv_role") || "";
  const s = localStorage.getItem("tv_sessionId") || "";
  const t = localStorage.getItem("tv_joinTag") || "";
  const n = localStorage.getItem("tv_nick") || "";
  const dm = localStorage.getItem("tv_lastDmSessionId") || "";

  if (plNick && n) plNick.value = n;
  if (plSessionId && (t || s)) plSessionId.value = t || s;
  state.playerNick = n;

  return { r, s, t, dm };
}

function slugifySessionName(name) {
  const trimmed = String(name || "").trim().slice(0, LIMITS.SESSION_NAME_MAX);
  const base = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, LIMITS.SESSION_SLUG_MAX)
    .replace(/^-+|-+$/g, "");
  return base || "session";
}

function normalizeJoinTagInput(value) {
  let normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  normalized = normalized.replace(/-([0-9]{4,8})$/, "#$1");
  return normalized;
}

function toSafeJoinTagForLink(value) {
  return normalizeJoinTagInput(value).replace(/#([0-9]{4,8})$/, "-$1");
}

function toLegacyHashJoinTag(value) {
  return normalizeJoinTagInput(value).replace(/-([0-9]{4,8})$/, "#$1");
}

function getJoinTagLookupVariants(value) {
  const normalized = normalizeJoinTagInput(value);
  if (!normalized) return [];
  return Array.from(new Set([
    normalized,
    toSafeJoinTagForLink(normalized),
    toLegacyHashJoinTag(normalized),
  ].filter(Boolean)));
}

function buildSessionJoinLink(joinTagRaw) {
  const safeJoinTag = toSafeJoinTagForLink(joinTagRaw);
  if (!safeJoinTag) return `${location.origin}${location.pathname}`;
  return `${location.origin}${location.pathname}?join=${encodeURIComponent(safeJoinTag)}`;
}

function parseInviteUrlFields(urlLike) {
  const u = (urlLike instanceof URL) ? urlLike : new URL(String(urlLike || ""), location.href);
  let join = normalizeJoinTagInput(u.searchParams.get("join") || "");
  const pin = String(u.searchParams.get("pin") || "").trim();
  const templateId = String(u.searchParams.get("template") || "").trim();
  const hashCode = String(u.hash || "").replace(/^#/, "").trim();

  // Some chat apps decode `%23` and treat it as fragment (`#1234`). Recover it.
  if (join && hashCode && /^\d{4,8}$/.test(hashCode) && !/[#-]\d{4,8}$/.test(join)) {
    join = `${join}#${hashCode}`;
  }

  return {
    join,
    pin,
    templateId: templateId || null,
  };
}

async function generateUniqueJoinTag(sessionName) {
  const base = slugifySessionName(sessionName);
  const sessionsRef = collection(db, "sessions");

  for (let i = 0; i < 30; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${base}#${code}`;
    const safeCandidate = toSafeJoinTagForLink(candidate);
    const [hashSnap, safeSnap] = await Promise.all([
      getDocs(query(sessionsRef, where("joinTag", "==", candidate))),
      getDocs(query(sessionsRef, where("joinTag", "==", safeCandidate))),
    ]);
    if (hashSnap.empty && safeSnap.empty) return candidate;
  }

  // Very rare fallback if collisions happen repeatedly.
  const fallback = `${base}#${String(Date.now()).slice(-4)}`;
  return fallback;
}

async function hydrateJoinSessionPreview(joinTagRaw) {
  const variants = getJoinTagLookupVariants(joinTagRaw);
  if (!variants.length) return null;

  try {
    let sessionDoc = null;

    for (const candidate of variants) {
      const byTag = await getDocs(query(collection(db, "sessions"), where("joinTag", "==", candidate)));
      if (!byTag.empty) {
        sessionDoc = byTag.docs[0];
        break;
      }
    }

    if (!sessionDoc) {
      for (const candidate of variants) {
        const byId = await getDoc(doc(db, "sessions", candidate));
        if (byId.exists()) {
          sessionDoc = byId;
          break;
        }
      }
    }

    if (!sessionDoc) return null;

    const sessionData = sessionDoc.data() || {};
    state.sessionId = sessionDoc.id;
    state.joinTag = String(sessionData.joinTag || toLegacyHashJoinTag(variants[0]) || variants[0]).trim();
    state.joinLink = buildSessionJoinLink(state.joinTag);
    state.sessionName = String(sessionData.name || "").trim();
    setLiveTick();

    if (plJoinMsg && state.sessionName) {
      plJoinMsg.textContent = `Session found: ${state.sessionName}. Enter your name and PIN.`;
    }

    return {
      sessionId: sessionDoc.id,
      sessionName: state.sessionName,
      joinTag: state.joinTag,
    };
  } catch (err) {
    console.warn("Join preview lookup failed:", err);
    return null;
  }
}

function parseJoinParam() {
  // QR codes open a URL like ?join=<joinTag>&pin=<pin>&template=<templateId>.
  // This helper extracts those parameters so the player join screen is pre-filled.
  const u = new URL(location.href);
  const { join, pin, templateId } = parseInviteUrlFields(u);
  if (join && plSessionId) {
    plSessionId.value = join;
    void hydrateJoinSessionPreview(join);
    if (pin && plPin) plPin.value = pin;
    // Store template for auto-apply after joining
    if (templateId) state._pendingTemplateId = templateId;
    // Clean URL so pin isn't visible in browser bar
    u.searchParams.delete("pin");
    u.searchParams.delete("template");
    window.history.replaceState({}, "", u.toString());
    return { join, pin: pin || "", templateId: templateId || null };
  }
  return null;
}

function getGuestNicknameFallback() {
  const uidSuffix = String(state.uid || "").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  const suffix = uidSuffix || String(Math.floor(1000 + Math.random() * 9000));
  return `Traveler-${suffix}`;
}

async function tryAutoJoinFromDeepLink(joinFromUrl) {
  if (!joinFromUrl?.join || !plSessionId || !plPin) return false;
  const pin = String(plPin.value || "").trim();
  if (!/^\d{4,8}$/.test(pin)) return false;

  // Use a temporary fallback name so deep links can join instantly.
  const existingNick = getPlayerNickname();
  const hadNickname = !!existingNick;
  const nick = existingNick || getGuestNicknameFallback();
  if (plNick && !String(plNick.value || "").trim()) plNick.value = nick;

  const ok = await joinPlayerSession(plSessionId.value, nick, pin);
  if (ok && !hadNickname) {
    await requireNickname({ forcePrompt: true });
  }
  return !!ok;
}

function getPlayerNickname() {
  // Centralized nickname resolution:
  // 1) explicit in-memory state (set on join)
  // 2) current input value (if available)
  // 3) localStorage fallback
  // 4) final anonymous label
  const fromState = String(state.playerNick || "").trim();
  if (fromState) return fromState;

  const fromInput = String(plNick?.value || "").trim();
  if (fromInput) return fromInput;

  const fromLocal = String(localStorage.getItem("tv_nick") || "").trim();
  if (fromLocal) return fromLocal;

  return "";
}

function openSpellModal(initialSpell = null) {
  return new Promise((resolve) => {
    if (!spellModal || !spellNameInput || !spellSchoolInput || !spellLevelInput || !spellDescInput || !btnSpellCancel || !btnSpellSave) {
      resolve(null);
      return;
    }

    const seed = normalizeSpellEntry(initialSpell) || { name: "", school: "", level: "", description: "" };
    spellNameInput.value = seed.name;
    spellSchoolInput.value = seed.school;
    spellLevelInput.value = seed.level;
    spellDescInput.value = seed.description;

    const cleanup = () => {
      btnSpellSave.removeEventListener("click", onSave);
      btnSpellCancel.removeEventListener("click", onCancel);
      spellModal.removeEventListener("click", onBackdrop);
      spellNameInput.removeEventListener("keydown", onKeydown);
    };

    const closeWith = (value) => {
      cleanup();
      animateModalOut(spellModal);
      resolve(value);
    };

    const onSave = () => {
      const next = normalizeSpellEntry({
        name: spellNameInput.value,
        school: spellSchoolInput.value,
        level: spellLevelInput.value,
        description: spellDescInput.value,
      });
      if (!next) {
        showToast("Spell name is required.", "error");
        spellNameInput.focus();
        return;
      }
      closeWith(next);
    };

    const onCancel = () => closeWith(null);
    const onBackdrop = (event) => {
      if (event.target === spellModal) closeWith(null);
    };
    const onKeydown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSave();
      }
    };

    btnSpellSave.addEventListener("click", onSave);
    btnSpellCancel.addEventListener("click", onCancel);
    spellModal.addEventListener("click", onBackdrop);
    spellNameInput.addEventListener("keydown", onKeydown);

    animateModalIn(spellModal);
    spellNameInput.focus();
  });
}

// ---------------------------------------------------------------------------
// CREATE HANDOUT BUILDER HELPERS
// ---------------------------------------------------------------------------
// These helpers add "character" to handouts:
// - visual identity (icon + color)
// - semantic flavor (reveal mode + npc disposition)
// - content generation (random handout button)
// - local placeholder image matching (title + public content)
// ---------------------------------------------------------------------------

function getActiveIcon() {
  // Reads the selected emoji from the emoji picker input, or falls back to the
  // old icon grid if it still exists (backward compat during transition).
  const emoji = String(emojiInput?.value || "").trim();
  if (emoji) return emoji;
  const active = gmIconGrid?.querySelector(".iconTile--active");
  return active?.getAttribute("data-icon") || "🎭";
}

function setCreateIcon(icon) {
  const nextIcon = String(icon || "").trim() || "🎭";
  if (emojiInput) emojiInput.value = nextIcon;
  if (emojiPreview) emojiPreview.textContent = nextIcon;

  if (!gmIconGrid) return;
  gmIconGrid.querySelectorAll(".iconTile").forEach((tile) => {
    if (!(tile instanceof HTMLElement)) return;
    tile.classList.toggle("iconTile--active", tile.getAttribute("data-icon") === nextIcon);
  });
  renderIconSuggestions();
}

function syncCreateRevealButton() {
  if (!btnCreateRevealToggle) return;
  btnCreateRevealToggle.classList.toggle("revealStarBtn--active", createRevealDraft);
  btnCreateRevealToggle.setAttribute("aria-pressed", createRevealDraft ? "true" : "false");
  const label = btnCreateRevealToggle.querySelector(".revealStarBtn__text");
  if (label) label.textContent = createRevealDraft ? "Revealed" : "Unrevealed";
  createRevealEyeOpen?.classList.toggle("hidden", !createRevealDraft);
  createRevealEyeClosed?.classList.toggle("hidden", createRevealDraft);
}

function syncCreateClaimableButton() {
  // Keeps visual state + accessibility state in sync with our JS boolean.
  if (!btnCreateClaimable) return;
  btnCreateClaimable.classList.toggle("btn--active", createClaimableDraft);
  btnCreateClaimable.setAttribute("aria-pressed", createClaimableDraft ? "true" : "false");
  btnCreateClaimable.textContent = createClaimableDraft ? "Claimable On" : "Claimable Off";
}

function getActiveColor() {
  const active = gmColorRow?.querySelector(".colorDot--active");
  return active?.getAttribute("data-color") || "#f5c82f";
}

// ---------------------------------------------------------------------------
// ICON SUGGESTION ENGINE
// Maps keywords in the handout title + public content to relevant emoji icons.
// Top matches (up to 4) are rendered in the suggestions strip above the grid.
// ---------------------------------------------------------------------------
const ICON_KEYWORD_MAP = [
  { icon: "🎭", keywords: ["npc", "character", "actor", "mask", "persona", "villain", "hero", "noble", "lord", "king", "queen", "wizard", "sorcerer"] },
  { icon: "📜", keywords: ["letter", "scroll", "message", "note", "document", "parchment", "decree", "missive", "contract", "writ", "proclamation"] },
  { icon: "🗺️", keywords: ["map", "location", "region", "journey", "travel", "terrain", "cartograph", "route", "path", "territory"] },
  { icon: "🗝️", keywords: ["key", "lock", "unlock", "secret", "door", "chest", "entrance", "vault", "gate"] },
  { icon: "🧭", keywords: ["compass", "direction", "navigate", "explore", "quest", "guide", "wayfind", "bearing"] },
  { icon: "💰", keywords: ["loot", "gold", "treasure", "coin", "money", "reward", "wealth", "payment", "hoard", "bounty"] },
  { icon: "⚔️", keywords: ["combat", "fight", "battle", "weapon", "sword", "enemy", "war", "attack", "ambush", "duel"] },
  { icon: "🛡️", keywords: ["shield", "defense", "protect", "armor", "guard", "ward", "sanctuary", "bastion"] },
  { icon: "🧪", keywords: ["potion", "brew", "magic", "spell", "elixir", "vial", "alchemist", "ingredient", "formula", "tincture"] },
  { icon: "📖", keywords: ["book", "lore", "knowledge", "library", "tome", "grimoire", "study", "research", "ritual", "spellbook"] },
  { icon: "💎", keywords: ["gem", "jewel", "diamond", "rare", "valuable", "precious", "crystal", "stone", "ruby", "sapphire"] },
  { icon: "☠️", keywords: ["death", "dead", "skull", "danger", "trap", "deadly", "undead", "kill", "murder", "assassin", "poison"] },
];

function suggestHandoutIcons(title, pub) {
  const text = `${title} ${pub}`.toLowerCase();
  if (!text.trim()) return [];
  const scored = ICON_KEYWORD_MAP.map(({ icon, keywords }) => ({
    icon,
    score: keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0),
  }));
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.icon);
}

function renderIconSuggestions() {
  if (!iconSuggestRow || !iconSuggestTiles) return;
  const title = String(gmTitle?.value || "").trim();
  const pub = String(gmPublic?.value || "").trim();
  const suggestions = suggestHandoutIcons(title, pub);
  if (!suggestions.length) {
    iconSuggestRow.classList.add("hidden");
    return;
  }
  const current = getActiveIcon();
  iconSuggestTiles.innerHTML = suggestions
    .map((icon) => `<button class="iconTile iconSuggestTile${icon === current ? " iconTile--active" : ""}" type="button" data-icon="${icon}" aria-label="${icon}">${icon}</button>`)
    .join("");
  iconSuggestRow.classList.remove("hidden");
}

function getNpcDisposition() {
  const active = npcDispositionRow?.querySelector(".chip--active");
  return active?.getAttribute("data-npc-disposition") || "";
}

const PLACEHOLDER_SERIES_DEFS = [
  // BEGINNER NOTE:
  // This array is the "catalog blueprint" for your local image files.
  // Each object describes one filename family inside /placeholders.
  //
  // Example filename pattern in this project:
  //   Prompt1image4_7.png
  //   ^^^^^^ prefix
  //         ^ prompt number
  //               ^ image number in that prompt
  //                 ^ variant number (1..9)
  //
  // Why not hardcode every file path by hand?
  // - Less typing
  // - Fewer mistakes
  // - Easy to expand: add one line here, get many generated paths
  //
  // `tags` represent the visual "theme" this image family fits.
  // The scoring algorithm compares handout text against these tags.
  //
  // `isItem` helps give extra points to loot-style handouts.
  { prefix: "Prompt", prompt: 1, images: 4, tags: ["npc", "social", "urban", "mystery"], isItem: false },
  { prefix: "Prompt", prompt: 2, images: 1, tags: ["letter", "clue", "mystery", "urban"], isItem: false },
  { prefix: "Prompt", prompt: 3, images: 1, tags: ["map", "travel", "nature", "quest"], isItem: false },
  { prefix: "Prompt", prompt: 4, images: 1, tags: ["quest", "magic", "danger", "clue"], isItem: false },
  { prefix: "itemsPrompt", prompt: 1, images: 2, tags: ["loot", "combat", "danger"], isItem: true },
  { prefix: "itemsPrompt", prompt: 2, images: 2, tags: ["loot", "magic", "clue"], isItem: true },
  { prefix: "itemsPrompt", prompt: 3, images: 2, tags: ["loot", "religion", "quest"], isItem: true },
  { prefix: "itemsPrompt", prompt: 4, images: 3, tags: ["loot", "map", "letter", "clue"], isItem: true },
];

const SEMANTIC_KEYWORDS = {
  // BEGINNER NOTE:
  // This object is a tiny local "meaning dictionary".
  //
  // Left side (key): a semantic concept (npc, loot, clue, ...)
  // Right side (array): words we search for in title/public text.
  //
  // If users write "journal" or "dispatch", we treat that as "letter".
  // If users write "artifact" or "chest", we treat that as "loot".
  //
  // You can improve matching quality by expanding these arrays over time.
  // Keep words lowercase because we normalize all text to lowercase first.
  npc: ["npc", "person", "character", "villager", "captain", "guard", "merchant", "noble", "king", "queen", "priest", "sage"],
  loot: ["loot", "treasure", "gold", "coin", "artifact", "relic", "item", "gear", "drop", "chest", "inventory", "reward"],
  clue: ["clue", "hint", "evidence", "symbol", "code", "cipher", "rumor", "trace", "mark", "scrap", "mystery"],
  letter: ["letter", "note", "journal", "diary", "dispatch", "message", "document", "writ", "ledger", "scroll", "report"],
  quest: ["quest", "mission", "contract", "objective", "task", "goal", "bounty", "assignment", "operation"],
  map: ["map", "route", "path", "atlas", "chart", "location", "region", "road", "cave", "ruins", "catacomb"],
  magic: ["magic", "arcane", "rune", "spell", "enchanted", "mystic", "sorcery", "ritual", "mana"],
  combat: ["sword", "blade", "dagger", "bow", "shield", "battle", "fight", "war", "attack", "armor", "weapon"],
  social: ["ally", "friend", "friendly", "help", "contact", "faction", "court", "politic", "diplomacy", "trust"],
  travel: ["travel", "journey", "expedition", "road", "trail", "pass", "crossing", "scout", "patrol"],
  urban: ["city", "town", "street", "district", "market", "castle", "keep", "harbor", "gate"],
  nature: ["forest", "swamp", "river", "mountain", "valley", "wild", "grove", "coast", "island"],
  danger: ["enemy", "hostile", "threat", "danger", "curse", "poison", "trap", "blood", "dark", "ambush"],
  religion: ["temple", "shrine", "saint", "divine", "holy", "church", "cleric", "blessing", "oath"],
};

const PLACEHOLDER_CATALOG = (() => {
  // BEGINNER NOTE:
  // This IIFE (Immediately Invoked Function Expression) runs once at startup
  // and builds one flat list of all candidate images.
  //
  // Output shape per entry:
  // {
  //   url: "placeholders/Prompt1image2_3.png",
  //   tags: ["npc", "social", ...],
  //   isItem: false
  // }
  //
  // Why precompute this list?
  // - Selection becomes fast later (no filename construction each click)
  // - Keeps selection code clean and focused on scoring
  const entries = [];
  PLACEHOLDER_SERIES_DEFS.forEach((series, seriesOrder) => {
    for (let imageIndex = 1; imageIndex <= series.images; imageIndex += 1) {
      for (let variantIndex = 1; variantIndex <= 9; variantIndex += 1) {
        entries.push({
          url: `placeholders/${series.prefix}${series.prompt}image${imageIndex}_${variantIndex}.png`,
          tags: [...series.tags],
          isItem: !!series.isItem,
          seriesOrder,
          seriesPrefix: series.prefix,
          prompt: series.prompt,
          image: imageIndex,
          variant: variantIndex,
        });
      }
    }
  });
  return entries;
})();

const createImageHistoryBySeed = new Map();
const placeholderSelectionCache = new Map();
const PLACEHOLDER_SELECTION_CACHE_MAX = 400;
// BEGINNER NOTE:
// This map remembers which image URLs we already showed for a specific handout
// context, so "Change image" can rotate through alternatives before repeating.
//
// Key   = normalized seed built from title + public text + type + disposition
// Value = array of URLs already used for that key
//
// We clear this map when a handout is submitted/reset, because the next handout
// should start with a fresh rotation history.

function stableHash(input) {
  // BEGINNER NOTE:
  // This function converts text into a deterministic number.
  // Deterministic means: same input -> same output.
  //
  // We use it only for tie-breaking when two images score similarly.
  // That keeps results stable instead of looking random/jumpy.
  //
  // Algorithm: FNV-like 32-bit hash (fast and simple for UI ranking).
  const text = String(input || "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSearchText(value) {
  // BEGINNER NOTE:
  // Text normalization makes matching much more reliable.
  //
  // Steps:
  // 1) lowercase everything
  // 2) remove punctuation/symbol noise
  // 3) collapse repeated spaces
  //
  // Example:
  // "Captain's Journal!!!" -> "captain s journal"
  //
  // Without normalization, small formatting differences break keyword matches.
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSemanticSignalMap(title, publicContent, handoutType) {
  // BEGINNER NOTE:
  // Purpose: turn user text into weighted semantic signals.
  //
  // Example output:
  // { npc: 4, clue: 2, urban: 1 }
  //
  // How values are computed:
  // - Keyword hits in body text add normal weight.
  // - Keyword hits in title add EXTRA weight (title is usually high intent).
  // - Selected template type also gets a boost, so explicit user choice matters.
  //
  // This output is later consumed by scorePlaceholderCandidate().
  const titleText = normalizeSearchText(title);
  const bodyText = normalizeSearchText(publicContent);
  const merged = `${titleText} ${bodyText}`.trim();
  const words = merged ? merged.split(" ") : [];

  const counts = {};
  Object.entries(SEMANTIC_KEYWORDS).forEach(([key, variants]) => {
    let value = 0;
    variants.forEach((token) => {
      if (!token) return;
      const bodyCount = words.reduce((acc, word) => acc + (word.includes(token) ? 1 : 0), 0);
      const titleHit = titleText.includes(token) ? 1 : 0;
      value += bodyCount + (titleHit * 2);
    });
    if (value > 0) counts[key] = value;
  });

  const normalizedType = String(handoutType || "").toLowerCase();
  if (normalizedType) counts[normalizedType] = (counts[normalizedType] || 0) + 3;

  return counts;
}

function scorePlaceholderCandidate(candidate, context) {
  // BEGINNER NOTE:
  // This is the heart of the ranking algorithm.
  // Each candidate image gets points for relevance.
  //
  // Scoring strategy (high level):
  // 1) Strong boost if candidate tag matches selected handout type
  // 2) Extra bias for item images on loot handouts
  // 3) Semantic boosts when candidate tags appear in signal map
  // 4) Optional NPC-disposition flavor boosts
  // 5) Tiny deterministic tie-breaker
  //
  // If you want different behavior, tweak constants gradually and test.
  // Large jumps can create surprising ranking side effects.
  const type = String(context.type || "").toLowerCase();
  const disposition = String(context.npcDisposition || "").toLowerCase();
  const signals = context.signals || {};

  let score = 0;
  const matchedTags = [];

  if (type && candidate.tags.includes(type)) {
    score += 36;
    matchedTags.push(type);
  }

  if (type === "loot" && candidate.isItem) score += 14;
  if (type === "npc" && !candidate.isItem) score += 12;
  if (type !== "loot" && candidate.isItem) score -= 6;

  candidate.tags.forEach((tag) => {
    const signalStrength = Math.min(signals[tag] || 0, 4);
    if (signalStrength > 0) {
      score += signalStrength * 8;
      if (!matchedTags.includes(tag)) matchedTags.push(tag);
    }
  });

  if (type === "npc") {
    if (disposition === "enemy" && candidate.tags.includes("danger")) score += 8;
    if (disposition === "friendly" && candidate.tags.includes("social")) score += 8;
    if (disposition === "neutral" && candidate.tags.includes("mystery")) score += 4;
  }

  const tieBreaker = (stableHash(`${context.seed}|${candidate.url}`) % 1000) / 1000;
  score += tieBreaker;

  return { score, matchedTags };
}

function buildImageSelectionSeed({ title, publicContent, type, npcDisposition }) {
  // BEGINNER NOTE:
  // A "seed" is just a stable key representing the current handout context.
  // We normalize all parts so trivial formatting differences do not create
  // separate histories.
  //
  // This key is used in createImageHistoryBySeed to track already shown images.
  return [
    normalizeSearchText(title),
    normalizeSearchText(publicContent),
    normalizeSearchText(type),
    normalizeSearchText(npcDisposition),
  ].join("|");
}

function getPlaceholderSelectionCacheKey({ title, publicContent, type, npcDisposition }) {
  return buildImageSelectionSeed({ title, publicContent, type, npcDisposition });
}

function getCachedPlaceholderSelection(context) {
  const key = getPlaceholderSelectionCacheKey(context);
  if (!key) return null;
  const cached = placeholderSelectionCache.get(key);
  if (!cached) return null;
  // Refresh insertion order for simple LRU behavior.
  placeholderSelectionCache.delete(key);
  placeholderSelectionCache.set(key, cached);
  return cached;
}

function setCachedPlaceholderSelection(context, value) {
  const key = getPlaceholderSelectionCacheKey(context);
  if (!key) return;
  if (placeholderSelectionCache.has(key)) placeholderSelectionCache.delete(key);
  placeholderSelectionCache.set(key, value);
  if (placeholderSelectionCache.size > PLACEHOLDER_SELECTION_CACHE_MAX) {
    const oldestKey = placeholderSelectionCache.keys().next().value;
    if (oldestKey) placeholderSelectionCache.delete(oldestKey);
  }
}

function rankPlaceholderImages({ title, publicContent, type, npcDisposition }) {
  // BEGINNER NOTE:
  // This function scores ALL catalog images, then sorts best -> worst.
  // Think of it as building a leaderboard.
  //
  // Separating ranking from "choose one" gives two big advantages:
  // - We can get top image quickly (best match)
  // - We can rotate through alternatives without rescoring logic duplication
  if (!PLACEHOLDER_CATALOG.length) return [];

  const signals = buildSemanticSignalMap(title, publicContent, type);
  const seed = `${String(title || "").trim()}|${String(publicContent || "").trim()}|${String(type || "").trim()}`;

  return PLACEHOLDER_CATALOG
    .map((candidate) => {
      const result = scorePlaceholderCandidate(candidate, {
        type,
        npcDisposition,
        signals,
        seed,
      });
      return {
        url: candidate.url,
        score: result.score,
        matchedTags: result.matchedTags,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function getChronologicalPlaceholderImages() {
  return [...PLACEHOLDER_CATALOG]
    .sort((left, right) => {
      if (left.seriesOrder !== right.seriesOrder) return left.seriesOrder - right.seriesOrder;
      if (left.prompt !== right.prompt) return left.prompt - right.prompt;
      if (left.image !== right.image) return left.image - right.image;
      return left.variant - right.variant;
    })
    .map((entry) => ({
      url: entry.url,
      reason: "chronological catalog order",
      matchedTags: entry.tags,
    }));
}

function getCurrentImageContext() {
  const type = String(gmType?.value || "").toLowerCase();
  return {
    title: String(gmTitle?.value || "").trim(),
    publicContent: String(gmPublic?.value || "").trim(),
    type,
    npcDisposition: type === "npc" ? getNpcDisposition() : "",
  };
}

function getActiveImageQueue() {
  const context = getCurrentImageContext();
  if (!context.title || !context.publicContent) {
    return getChronologicalPlaceholderImages();
  }

  return rankPlaceholderImages(context).map((entry) => ({
    url: entry.url,
    matchedTags: entry.matchedTags,
    reason: entry.matchedTags?.length
      ? `matched ${entry.matchedTags.slice(0, 2).join(" + ")}`
      : "best default theme",
  }));
}

function selectBestPlaceholderImage({ title, publicContent, type, npcDisposition }) {
  // BEGINNER NOTE:
  // Convenience helper: returns top-ranked image only.
  // We keep this because other flows (e.g. auto-fill on create) may only need
  // the single best option.
  const context = { title, publicContent, type, npcDisposition };
  const cachedBest = getCachedPlaceholderSelection(context);
  const best = cachedBest || (rankPlaceholderImages(context)[0] || null);
  if (best && !cachedBest) setCachedPlaceholderSelection(context, best);

  if (!best) return null;
  const reason = best.matchedTags.length
    ? `matched ${best.matchedTags.slice(0, 2).join(" + ")}`
    : "best default theme";

  return { ...best, reason };
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampCreateImageFrameOffsets() {
  const frameEl = gmImagePreview?.closest(".portraitFrame");
  if (!(frameEl instanceof HTMLElement)) return;
  const frameWidth = frameEl.clientWidth || 132;
  const frameHeight = frameEl.clientHeight || 132;
  const maxX = Math.max(0, ((frameWidth * createImageScale) - frameWidth) / 2);
  const maxY = Math.max(0, ((frameHeight * createImageScale) - frameHeight) / 2);
  createImageOffsetX = clampValue(createImageOffsetX, -maxX, maxX);
  createImageOffsetY = clampValue(createImageOffsetY, -maxY, maxY);
}

function applyCreateImageFrameTransform() {
  if (!gmImagePreview) return;
  clampCreateImageFrameOffsets();
  gmImagePreview.style.transform = `translate(${createImageOffsetX.toFixed(1)}px, ${createImageOffsetY.toFixed(1)}px) scale(${createImageScale.toFixed(3)})`;
  gmImagePreview.style.transformOrigin = "center";
}

function resetCreateImageFrame() {
  createImageScale = 1.14;
  createImageOffsetX = 0;
  createImageOffsetY = 0;
  applyCreateImageFrameTransform();
}

function setCreateImageFrame(frame) {
  const scale = Number(frame?.scale);
  const offsetX = Number(frame?.offsetX);
  const offsetY = Number(frame?.offsetY);
  createImageScale = Number.isFinite(scale) ? clampValue(scale, 1, 2.8) : 1.14;
  createImageOffsetX = Number.isFinite(offsetX) ? offsetX : 0;
  createImageOffsetY = Number.isFinite(offsetY) ? offsetY : 0;
  applyCreateImageFrameTransform();
}

function getCreateImageFrameData() {
  if (!gmImagePreview || gmImagePreview.classList.contains("hidden")) return null;
  return {
    scale: Number(createImageScale.toFixed(3)),
    offsetX: Number(createImageOffsetX.toFixed(1)),
    offsetY: Number(createImageOffsetY.toFixed(1)),
  };
}

function buildImageFrameInlineStyle(frame) {
  const frameScale = Number(frame?.scale);
  const frameOffsetX = Number(frame?.offsetX);
  const frameOffsetY = Number(frame?.offsetY);
  if (!Number.isFinite(frameScale) && !Number.isFinite(frameOffsetX) && !Number.isFinite(frameOffsetY)) {
    return "";
  }
  const scale = Number.isFinite(frameScale) ? clampValue(frameScale, 1, 2.8) : 1;
  const offsetX = Number.isFinite(frameOffsetX) ? frameOffsetX : 0;
  const offsetY = Number.isFinite(frameOffsetY) ? frameOffsetY : 0;
  return ` style="transform:translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px) scale(${scale.toFixed(3)});transform-origin:center;"`;
}

function setupCreateImageFrameInteractions() {
  const frameEl = gmImagePreview?.closest(".portraitFrame");
  if (!(frameEl instanceof HTMLElement) || !gmImagePreview) return;
  if (frameEl.dataset.dragZoomBound === "1") return;
  frameEl.dataset.dragZoomBound = "1";

  const startDrag = (event) => {
    if (gmImagePreview.classList.contains("hidden")) return;
    createImageDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: createImageOffsetX,
      startOffsetY: createImageOffsetY,
    };
    gmImagePreview.setPointerCapture(event.pointerId);
    frameEl.classList.add("is-dragging");
  };

  const moveDrag = (event) => {
    if (!createImageDragState || createImageDragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - createImageDragState.startX;
    const dy = event.clientY - createImageDragState.startY;
    createImageOffsetX = createImageDragState.startOffsetX + dx;
    createImageOffsetY = createImageDragState.startOffsetY + dy;
    applyCreateImageFrameTransform();
  };

  const stopDrag = (event) => {
    if (!createImageDragState || createImageDragState.pointerId !== event.pointerId) return;
    if (gmImagePreview.hasPointerCapture(event.pointerId)) {
      gmImagePreview.releasePointerCapture(event.pointerId);
    }
    createImageDragState = null;
    frameEl.classList.remove("is-dragging");
  };

  gmImagePreview.addEventListener("pointerdown", startDrag);
  gmImagePreview.addEventListener("pointermove", moveDrag);
  gmImagePreview.addEventListener("pointerup", stopDrag);
  gmImagePreview.addEventListener("pointercancel", stopDrag);

  frameEl.addEventListener("wheel", (event) => {
    if (gmImagePreview.classList.contains("hidden")) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    createImageScale = clampValue(createImageScale + delta, 1, 2.8);
    applyCreateImageFrameTransform();
  }, { passive: false });

  frameEl.addEventListener("dblclick", () => {
    if (gmImagePreview.classList.contains("hidden")) return;
    resetCreateImageFrame();
  });
}

function setImagePickerOpen(isOpen) {
  imagePickerPanel?.classList.toggle("hidden", !isOpen);
  btnImageSelect?.classList.toggle("is-active", !!isOpen);
}

function renderImagePicker() {
  if (!imagePickerList) return;

  const chronological = getChronologicalPlaceholderImages();
  const currentUrl = String(gmImagePreview?.getAttribute("src") || "").trim();

  imagePickerList.innerHTML = chronological.map((entry) => {
    const isActive = currentUrl && currentUrl === entry.url;
    return `<button class="imagePickerTile${isActive ? " is-active" : ""}" type="button" role="option" aria-selected="${isActive ? "true" : "false"}" data-url="${escapeHtml(entry.url)}"><img src="${escapeHtml(entry.url)}" alt="Placeholder option" loading="lazy" /></button>`;
  }).join("");

  const selectedTile = imagePickerList.querySelector(".imagePickerTile.is-active");
  if (selectedTile instanceof HTMLElement) {
    selectedTile.scrollIntoView({ block: "center", inline: "nearest" });
  }
}

function applySelectedCreateImage(selected, messages = {}) {
  if (!selected?.url) {
    showToast("No placeholder images available.", "error");
    return;
  }

  setImagePreview(selected.url, {
    loading: messages.loading || "Selecting image...",
    success: messages.success || `Image changed (${selected.reason || "manual selection"}).`,
    fail: messages.fail || "Selected placeholder image failed to load.",
  });

  if (!imagePickerPanel?.classList.contains("hidden")) {
    renderImagePicker();
  }
}

function cycleCreateImage(direction = "next") {
  const queue = getActiveImageQueue();
  if (!queue.length) {
    showToast("No placeholder images available.", "error");
    return;
  }

  const currentUrl = String(gmImagePreview?.getAttribute("src") || "").trim();
  const currentIndex = queue.findIndex((entry) => entry.url === currentUrl);

  let targetIndex = 0;
  if (currentIndex < 0) {
    targetIndex = direction === "previous" ? (queue.length - 1) : 0;
  } else if (direction === "previous") {
    targetIndex = (currentIndex - 1 + queue.length) % queue.length;
  } else {
    targetIndex = (currentIndex + 1) % queue.length;
  }

  const target = queue[targetIndex];
  applySelectedCreateImage(target, {
    loading: direction === "previous" ? "Loading previous image..." : "Loading next image...",
  });
}

function selectRandomCreateImage() {
  const queue = getActiveImageQueue();
  if (!queue.length) {
    showToast("No placeholder images available.", "error");
    return;
  }

  const currentUrl = String(gmImagePreview?.getAttribute("src") || "").trim();
  const candidates = queue.filter((entry) => entry.url !== currentUrl);
  const target = candidates.length ? randomPick(candidates) : queue[0];
  applySelectedCreateImage(target, {
    loading: "Picking random image...",
    success: `Random image selected (${target.reason || "placeholder"}).`,
  });
}

function selectNextPlaceholderImage({ title, publicContent, type, npcDisposition, currentUrl }) {
  // BEGINNER NOTE:
  // "Change image" behavior lives here.
  // Goal: show another good option and avoid immediate repeats.
  //
  // Steps:
  // 1) Rank all images for current context
  // 2) Load seen history for this context
  // 3) Pick first ranked image not in seen history
  // 4) If all seen, reset cycle and continue
  // 5) Avoid returning currentUrl when alternatives exist
  // 6) Save chosen URL back into history
  //
  // Result: users cycle through fitting alternatives before repeats happen.
  const ranked = rankPlaceholderImages({ title, publicContent, type, npcDisposition });
  if (!ranked.length) return null;

  const selectionSeed = buildImageSelectionSeed({ title, publicContent, type, npcDisposition });
  const seenList = createImageHistoryBySeed.get(selectionSeed) || [];
  const seenSet = new Set(seenList);

  let next = ranked.find((entry) => !seenSet.has(entry.url));

  if (!next) {
    createImageHistoryBySeed.set(selectionSeed, []);
    next = ranked.find((entry) => entry.url !== currentUrl) || ranked[0];
  }

  if (currentUrl && next?.url === currentUrl) {
    const different = ranked.find((entry) => entry.url !== currentUrl && !seenSet.has(entry.url))
      || ranked.find((entry) => entry.url !== currentUrl);
    if (different) next = different;
  }

  if (!next) return null;

  const updatedSeen = [...(createImageHistoryBySeed.get(selectionSeed) || []), next.url];
  const keep = Math.min(ranked.length, 120);
  createImageHistoryBySeed.set(selectionSeed, updatedSeen.slice(-keep));

  const reason = next.matchedTags.length
    ? `matched ${next.matchedTags.slice(0, 2).join(" + ")}`
    : "best default theme";

  return {
    ...next,
    reason,
    alternatives: ranked.length,
  };
}

function setImagePreview(url, messages = {}) {
  // BEGINNER NOTE:
  // This function only updates UI preview state.
  // It does NOT decide which image to choose.
  //
  // Why this separation is good:
  // - selection logic stays testable/independent
  // - rendering logic stays simple and reusable
  const loadingMsg = messages.loading || "Generating portrait...";
  const successMsg = messages.success || "Portrait generated successfully.";
  const failMsg = messages.fail || "Portrait generation failed. Try again.";

  if (!gmImagePreview) return;
  if (!url) {
    gmImagePreview.classList.add("hidden");
    gmImagePreview.removeAttribute("src");
    gmImagePreview.removeAttribute("style");
    portraitPlaceholder?.classList.remove("hidden");
    resetCreateImageFrame();
    if (gmImageStatus) gmImageStatus.textContent = "Portrait is selected from local placeholders using Title + Public Content only.";
    return;
  }

  if (messages.frame) {
    setCreateImageFrame(messages.frame);
  } else {
    resetCreateImageFrame();
  }

  // Attach explicit load/error handlers so the UI communicates real generation
  // success/failure instead of only showing image alt text.
  gmImagePreview.onload = () => {
    gmImagePreview.classList.remove("hidden");
    portraitPlaceholder?.classList.add("hidden");
    if (gmImageStatus) gmImageStatus.textContent = successMsg;
  };

  gmImagePreview.onerror = () => {
    gmImagePreview.classList.add("hidden");
    portraitPlaceholder?.classList.remove("hidden");
    if (gmImageStatus) gmImageStatus.textContent = failMsg;
  };

  if (gmImageStatus) gmImageStatus.textContent = loadingMsg;
  applyCreateImageFrameTransform();
  gmImagePreview.src = url;
}

async function generateHandoutImage() {
  // BEGINNER NOTE:
  // Main "Change image" action flow:
  // - Validate required fields (title + public content)
  // - Compute next best alternative based on semantic ranking
  // - Push chosen URL into preview renderer
  //
  // Important privacy rule retained:
  // Secret content is NEVER used for image matching.
  const title = String(gmTitle?.value || "").trim();
  const pub = String(gmPublic?.value || "").trim();
  const type = String(gmType?.value || "").toLowerCase();
  const npcDisposition = type === "npc" ? getNpcDisposition() : "";
  const currentUrl = String(gmImagePreview?.getAttribute("src") || "").trim();

  if (!title || !pub) {
    showToast("Add title and public content first.", "error");
    return;
  }

  const selected = selectNextPlaceholderImage({
    title,
    publicContent: pub,
    type,
    npcDisposition,
    currentUrl,
  });

  applySelectedCreateImage(selected, {
    loading: "Finding another fitting placeholder image...",
  });
}

function toggleNpcSpecificUI() {
  const isNpc = String(gmType?.value || "").toLowerCase() === "npc";
  npcDispositionWrap?.classList.toggle("hidden", !isNpc);
}

function isMapHandoutType(type) {
  return String(type || "").trim().toLowerCase() === "map";
}

function syncCreateTypeDependentUI() {
  toggleNpcSpecificUI();
  const isMap = isMapHandoutType(gmType?.value);
  createMapUploadWrap?.classList.toggle("hidden", !isMap);
  [btnImagePrev, btnImageNext, btnImageRandom, btnImageSelect].forEach((btn) => {
    btn?.classList.toggle("hidden", isMap);
  });
  if (isMap) {
    setImagePreview(MAP_HANDOUT_AVATAR_URL, {
      loading: "Loading map handout avatar...",
      success: "Map handout avatar locked.",
      fail: "Could not load map handout avatar.",
    });
    setImagePickerOpen(false);
  }
  [btnImagePrev, btnImageNext, btnImageRandom, btnImageSelect, btnImageUpload].forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.disabled = isMap;
    btn.classList.toggle("is-disabled", isMap);
  });
  syncCreateMapPreview(isMap ? pendingHandoutImageUrl : "");
  if (isMap && handoutImageStatus && !String(handoutImageStatus.textContent || "").trim()) {
    handoutImageStatus.textContent = "Upload a map image (cost: 1 nugget).";
  } else if (!isMap && handoutImageStatus && !String(handoutImageStatus.textContent || "").trim()) {
    handoutImageStatus.textContent = "Upload your own portrait (costs 1 nugget when creating).";
  }
}

function syncCreateMapPreview(url) {
  if (!createMapPreviewImg) return;
  const nextUrl = String(url || "").trim();
  const hasMap = !!nextUrl;
  createMapPreviewImg.classList.toggle("hidden", !hasMap);
  createMapEmptyState?.classList.toggle("hidden", hasMap);
  if (createMapLoadingOverlay) createMapLoadingOverlay.classList.add("hidden");
  if (hasMap) {
    createMapPreviewImg.src = nextUrl;
    return;
  }
  createMapPreviewImg.removeAttribute("src");
}

function syncModalMapPreview(handout, role = state.role) {
  if (!modalMapPreviewImg) return;
  const mapUrl = isMapHandoutType(handout?.type)
    ? String(getVisibleHandoutImageUrl(handout, role, state.uid) || "").trim()
    : "";
  const hasMap = !!mapUrl;
  modalMapPreviewImg.classList.toggle("hidden", !hasMap);
  modalMapEmptyState?.classList.toggle("hidden", hasMap);
  if (modalMapLoadingOverlay) modalMapLoadingOverlay.classList.add("hidden");
  if (hasMap) {
    modalMapPreviewImg.src = mapUrl;
    return;
  }
  modalMapPreviewImg.removeAttribute("src");
}

function getHandoutAvatarImageUrl(handout) {
  if (isMapHandoutType(handout?.type)) {
    return String(handout?.imageUrl || MAP_HANDOUT_AVATAR_URL).trim();
  }
  return String(handout?.imageUrl || "").trim();
}

function canUserViewMap(handout, role = state.role, uid = state.uid) {
  if (!isMapHandoutType(handout?.type)) return true;
  if (role === "dm") return true;
  const visibleUid = String(handout?.mapVisibleToUid || "").trim();
  if (!visibleUid) return true; // No visibility restriction → visible to all players
  return !!uid && visibleUid === uid;
}

function getVisibleHandoutImageUrl(handout, role = state.role, uid = state.uid) {
  if (isMapHandoutType(handout?.type)) {
    if (!canUserViewMap(handout, role, uid)) return "";
    const explicitMapUrl = String(handout?.mapImageUrl || "").trim();
    if (explicitMapUrl) return explicitMapUrl;

    // Legacy support: older map handouts stored full map image in imageUrl.
    const legacyImageUrl = String(handout?.imageUrl || "").trim();
    if (legacyImageUrl && legacyImageUrl !== MAP_HANDOUT_AVATAR_URL) return legacyImageUrl;
    return "";
  }
  return String(handout?.imageUrl || "").trim();
}

/**
 * Compresses an image File to fit within maxBytes using canvas re-encoding.
 * Returns the original file unchanged when it already fits.
 * Always outputs JPEG for images that need compression.
 */
async function compressImageToMaxSize(file, maxBytes = 5 * 1024 * 1024) {
  if (file.size <= maxBytes) return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const tryCompress = (w, h, quality) => {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          if (blob.size <= maxBytes) {
            resolve(new File([blob], name, { type: "image/jpeg" }));
          } else if (quality > 0.3) {
            tryCompress(w, h, Math.round((quality - 0.1) * 10) / 10);
          } else if (w > 50 && h > 50) {
            tryCompress(Math.round(w * 0.75), Math.round(h * 0.75), 0.85);
          } else {
            resolve(new File([blob], name, { type: "image/jpeg" }));
          }
        }, "image/jpeg", quality);
      };
      tryCompress(img.naturalWidth, img.naturalHeight, 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

async function uploadMapImageToStorage(file, { handoutId = "create" } = {}) {
  if (!file) return { ok: false, message: "No file selected." };
  if (!state.uid || !state.sessionId) return { ok: false, message: "Sign in is required before uploading maps." };
  if (!file.type.startsWith("image/")) return { ok: false, message: "Please select an image file." };
  try { file = await compressImageToMaxSize(file); } catch (_) { return { ok: false, message: "Could not process image." }; }

  const spent = await spendNuggetWithFeedback("map image upload");
  if (!spent) return { ok: false, message: "Not enough nuggets for upload." };

  const walletId = state.role === "dm" ? "dm" : state.uid;
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/maps/${state.sessionId}/${handoutId}-${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);

  try {
    await uploadBytes(ref, file, { contentType: file.type });
    const url = await getDownloadURL(ref);
    return { ok: true, url, path };
  } catch (err) {
    try {
      await updateDoc(walletRef, { nuggets: increment(1) });
    } catch (_) {}
    console.error("Map upload failed:", err);
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("403") || msg.includes("permission")) {
      return { ok: false, message: "Upload blocked by Storage rules." };
    }
    return { ok: false, message: "Upload failed. Nugget refunded." };
  }
}

async function uploadHandoutImageToStorage(file, { handoutId = "create" } = {}) {
  if (!file) return { ok: false, message: "No file selected." };
  if (!state.uid || !state.sessionId) return { ok: false, message: "Sign in is required before uploading images." };
  if (!file.type.startsWith("image/")) return { ok: false, message: "Please select an image file." };
  try { file = await compressImageToMaxSize(file); } catch (_) { return { ok: false, message: "Could not process image." }; }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/handouts/${state.sessionId}/${handoutId}-${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);

  try {
    await uploadBytes(ref, file, { contentType: file.type });
    const url = await getDownloadURL(ref);
    return { ok: true, url, path };
  } catch (err) {
    console.error("Handout image upload failed:", err);
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("403") || msg.includes("permission")) {
      return { ok: false, message: "Upload blocked by Storage rules." };
    }
    return { ok: false, message: "Upload failed." };
  }
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomByTemplate(templateType) {
  const type = String(templateType || "clue").toLowerCase();
  // Combinatoric generator:
  // Each category has multiple dimensions (adjective + noun + motif, etc),
  // producing well over 50 outcomes per template category.
  
  const c = RANDOM_GENERATOR_CATALOG[type] || RANDOM_GENERATOR_CATALOG.clue;

  return {
    title: `${randomPick(c.a)} ${randomPick(c.b)}${c.c ? ` ${randomPick(c.c)}` : ""}`.trim(),
    publicContent: `${randomPick(c.p1)} ${randomPick(c.p2)} ${randomPick(c.p3)}`,
    secretContent: `${randomPick(c.s1)} ${randomPick(c.s2)}`,
  };
}

async function generateRandomFromTemplate() {
  const type = String(gmType?.value || "clue").toLowerCase();
  const generated = randomByTemplate(type);

  gmTitle.value = generated.title;
  gmPublic.value = generated.publicContent;
  gmSecret.value = generated.secretContent;

  if (type === "npc" && npcDispositionRow) {
    const options = ["", "friendly", "enemy", "neutral"];
    const selected = randomPick(options);
    npcDispositionRow.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("chip--active", (chip.getAttribute("data-npc-disposition") || "") === selected);
    });
  }

  // Randomize content only; keep current portrait/avatar selection unchanged.
  if (type === "map") {
    setImagePreview(MAP_HANDOUT_AVATAR_URL, {
      loading: "Loading map handout avatar...",
      success: "Map handout avatar locked.",
      fail: "Could not load map handout avatar.",
    });
  }
  renderIconSuggestions();
}

function findLinkedNpcHandoutByName(name) {
  return (state.gmHandoutsRaw || []).find((handout) => {
    if (String(handout?.type || "").toLowerCase() !== "npc") return false;
    return normalizeNpcSyncKey(handout?.title) === normalizeNpcSyncKey(name);
  }) || null;
}

async function upsertNpcIntoInitiative(name, linkedNpcHandout, dexMod) {
  if (!state.sessionId) return;
  const linkedId = String(linkedNpcHandout?.id || "").trim() || null;
  const existingNpc = (state.partyRoster || []).find((entry) => {
    if (entry?.isNpc !== true || !entry?.id) return false;
    if (linkedId && String(entry?.npcHandoutId || "").trim() === linkedId) return true;
    if (isUnknownNpcLabel(entry?.nickname)) {
      const entryAvatar = String(entry?.avatarUrl || "").trim();
      const handoutAvatar = String(linkedNpcHandout?.imageUrl || "").trim();
      if (entryAvatar && handoutAvatar && entryAvatar === handoutAvatar) return true;
    }
    return normalizeNpcSyncKey(entry?.nickname) === normalizeNpcSyncKey(name);
  });

  const payload = {
    nickname: name,
    isNpc: true,
    isRevealed: linkedNpcHandout?.revealed === true,
    npcHandoutId: linkedId,
    avatarUrl: String(linkedNpcHandout?.imageUrl || "").trim(),
    dexterityMod: dexMod,
    quickStats: { dexterityMod: dexMod },
    updatedAt: serverTimestamp(),
  };

  if (existingNpc?.id) {
    await updateDoc(doc(db, "sessions", state.sessionId, "players", existingNpc.id), {
      ...payload,
      quickStats: { ...(existingNpc.quickStats || {}), dexterityMod: dexMod },
    });
    showToast(`${name} synced in initiative tracker.`, "success");
    return;
  }

  await addDoc(collection(db, "sessions", state.sessionId, "players"), {
    ...payload,
    initiative: null,
    joinedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  });
  showToast(`${name} added to initiative tracker.`, "success");
}

async function addNpcToInitiativeFromHandoutName(name, linkedNpcHandout = null) {
  if (state.role !== "dm" || !state.sessionId) return;
  const safeName = String(name || "").trim();
  if (!safeName) {
    showToast("NPC name is required before adding to initiative.", "error");
    return;
  }
  const linked = linkedNpcHandout || findLinkedNpcHandoutByName(safeName);
  const dexInput = window.prompt(`DEX modifier for ${safeName} (e.g. +2)`, "0");
  if (dexInput === null) return;
  const dexMod = parseNumericStat(dexInput);
  if (dexMod === null) {
    showToast("Enter a valid numeric DEX modifier.", "error");
    return;
  }

  try {
    await upsertNpcIntoInitiative(safeName, linked, dexMod);
  } catch (err) {
    console.error("Add for initiative failed:", err);
    showToast("Could not add to initiative.", "error");
  }
}

function bindDelegatedClick(container, selector, onMatch) {
  container?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const matched = target.closest(selector);
    if (!(matched instanceof HTMLElement)) return;
    onMatch(matched, event);
  });
}

function setupCreateBuilderUI() {
  // One place where all create-modal listeners are attached.
  gmType?.addEventListener("change", syncCreateTypeDependentUI);
  setupCreateImageFrameInteractions();

  // "Add for Initiative" button in NPC handout creation
  const btnAddHandoutToInitiative = $("btnAddHandoutToInitiative");
  btnAddHandoutToInitiative?.addEventListener("click", async () => {
    const name = String(gmTitle?.value || "").trim();
    const pub = String(gmPublic?.value || "").trim();
    const validationError = validateHandoutCoreFields({
      title: name,
      publicContent: pub,
      type: "npc",
    });
    if (validationError) {
      showToast(validationError, "error");
      return;
    }
    await addNpcToInitiativeFromHandoutName(name);
  });

  npcDispositionRow?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const chip = target.closest(".chip");
    if (!(chip instanceof HTMLElement)) return;
    npcDispositionRow.querySelector(".chip--active")?.classList.remove("chip--active");
    chip.classList.add("chip--active");
  });

  // Emoji icon picker: tapping preview focuses the input; input event captures emoji.
  emojiPreview?.addEventListener("click", () => emojiInput?.focus());
  emojiPreview?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    emojiInput?.focus();
  });

  // Suggestion strip — delegate clicks to iconTile buttons inside it.
  bindDelegatedClick(iconSuggestRow, ".iconTile", (tile) => {
    const icon = String(tile.getAttribute("data-icon") || "").trim();
    if (!icon) return;
    setCreateIcon(icon);
  });

  bindDelegatedClick(gmIconGrid, ".iconTile", (tile) => {
    const icon = String(tile.getAttribute("data-icon") || "").trim();
    if (!icon) return;
    setCreateIcon(icon);
  });

  emojiInput?.addEventListener("input", () => {
    const val = String(emojiInput.value || "").trim();
    // Keep only the first grapheme cluster (one emoji).
    const segments = val ? [...new Intl.Segmenter().segment(val)] : [];
    const firstEmoji = segments.length ? segments[0].segment : "";
    setCreateIcon(firstEmoji || "🎭");
  });

  bindDelegatedClick(gmColorRow, ".colorDot", (dot) => {
    gmColorRow.querySelector(".colorDot--active")?.classList.remove("colorDot--active");
    dot.classList.add("colorDot--active");
  });

  // Update icon suggestions as the GM types the title or public content.
  const _debouncedSuggestions = debounce(renderIconSuggestions, UI_TIMERS.ICON_SUGGEST_DEBOUNCE_MS);
  gmTitle?.addEventListener("input", _debouncedSuggestions);
  gmPublic?.addEventListener("input", _debouncedSuggestions);

  // Prevent long-press "save image" on mobile for all app images.
  document.addEventListener("contextmenu", (e) => {
    if (e.target instanceof HTMLImageElement) e.preventDefault();
  });

  btnImagePrev?.addEventListener("click", () => {
    cycleCreateImage("previous");
  });

  btnImageNext?.addEventListener("click", () => {
    cycleCreateImage("next");
  });

  btnImageRandom?.addEventListener("click", () => {
    selectRandomCreateImage();
  });

  btnImageSelect?.addEventListener("click", () => {
    const opening = !!imagePickerPanel?.classList.contains("hidden");
    if (opening) renderImagePicker();
    setImagePickerOpen(opening);
  });

  btnImageUpload?.addEventListener("click", () => {
    const isMap = isMapHandoutType(gmType?.value);
    if (!isMap) {
      const confirmed = confirmNuggetCost("Uploading or changing this handout portrait");
      if (!confirmed) {
        createHandoutImageUploadConfirmed = false;
        if (handoutImageStatus) handoutImageStatus.textContent = "Handout portrait upload canceled.";
        return;
      }
      createHandoutImageUploadConfirmed = true;
    }
    handoutImageUpload?.click();
  });

  bindDelegatedClick(imagePickerList, ".imagePickerTile", (tile) => {
    const selectedUrl = String(tile.getAttribute("data-url") || "").trim();
    if (!selectedUrl) return;

    applySelectedCreateImage({ url: selectedUrl, reason: "manual selection" }, {
      loading: "Applying selected image...",
      success: "Image selected.",
    });
    setImagePickerOpen(false);
  });

  btnRandomHandout?.addEventListener("click", () => {
    generateRandomFromTemplate().catch(console.error);
  });

  btnCreateClaimable?.addEventListener("click", () => {
    // Toggle local draft state only; persisted when creating the handout.
    createClaimableDraft = !createClaimableDraft;
    syncCreateClaimableButton();
  });

  btnCreateRevealToggle?.addEventListener("click", () => {
    createRevealDraft = !createRevealDraft;
    syncCreateRevealButton();
  });

  syncCreateTypeDependentUI();
  setCreateIcon(getActiveIcon());
  syncCreateRevealButton();
  syncCreateClaimableButton();
  setImagePickerOpen(false);
}

async function copyToClipboard(text) {
  // Browser clipboard API is async because permission and platform behavior vary.
  // Some browsers deny clipboard access without a secure context or user gesture,
  // so we catch failures and show a toast instead of crashing the caller.
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    showToast("Clipboard access denied � copy manually.", "error");
  }
}

function buildInvitePayload() {
  const sessionTag = String(state.joinTag || state.sessionId || "").trim();
  const pin = String(state.gmPinPlain || "").trim();
  const baseJoinUrl = buildSessionJoinLink(sessionTag || state.joinTag || state.sessionId || "");
  const joinUrl = pin ? `${baseJoinUrl}&pin=${encodeURIComponent(pin)}` : baseJoinUrl;
  const lines = [
    "Join our TomeVault session by clicking the following link:",
    "",
    joinUrl,
    "",
    sessionTag ? `Session Tag: ${sessionTag}` : "",
    pin ? `PIN: ${pin}` : "",
  ].filter(Boolean);

  return {
    title: "TomeVault Session Invite",
    text: lines.join("\n"),
    url: joinUrl,
  };
}

async function shareSessionInvite() {
  const payload = buildInvitePayload();

  if (navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      gmCreateMsg.textContent = "Invite shared.";
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.warn("Native share failed; trying WhatsApp fallback:", err);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(payload.text)}`;
  const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  if (popup) {
    gmCreateMsg.textContent = "Invite opened in WhatsApp share.";
    return;
  }

  await copyToClipboard(payload.text);
  gmCreateMsg.textContent = "Share text copied to clipboard.";
}

function escapeHtml(s) {
  // Defensive output encoding for strings inserted into innerHTML.
  // Prevents HTML/script injection by turning special characters into entities.
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafeHandoutTitle(handout) {
  const rawTitle = String(handout?.title || "").trim();
  if (rawTitle) return rawTitle;
  return String(handout?.type || "").toLowerCase() === "npc" ? "Unnamed NPC" : "Untitled Handout";
}

function validateHandoutCoreFields({ title, publicContent, type }) {
  const safeTitle = String(title || "").trim();
  const safePublic = String(publicContent || "").trim();
  const isNpc = String(type || "").toLowerCase() === "npc";

  if (!safeTitle) {
    return isNpc ? "NPC name is required." : "Handout name is required.";
  }
  if (!safePublic) {
    return isNpc ? "NPC bio is required." : "Public content is required.";
  }

  return "";
}

function normalizeIconKey(iconValue) {
  // Backward compatibility mapper for legacy text keys while preserving
  // arbitrary user-chosen emoji values.
  const raw = String(iconValue || "").trim();
  if (!raw) return "document";

  const aliases = {
    doc: "document",
    scroll: "document",
    weapon: "sword",
    blade: "sword",
    armor: "shield",
    potion: "beaker",
    alchemy: "beaker",
    magic: "sparkles",
    arcane: "sparkles",
    death: "skull",
    treasure: "bag",
    loot: "bag",
    nature: "tree",
    flame: "fire",
    lock: "key",
    vision: "eye",
  };

  const allowed = new Set(["document", "sword", "shield", "beaker", "sparkles", "skull", "map", "bag", "tree", "fire", "key", "eye"]);
  const lower = raw.toLowerCase();
  if (allowed.has(lower)) return lower;
  if (aliases[lower]) return aliases[lower];

  // Keep pictographic symbols (emoji) as-is; otherwise fallback safely.
  if (/\p{Extended_Pictographic}/u.test(raw)) return raw;
  return "document";
}

function getHeroIconSvg(iconName, className = "") {
  // Returns inline SVG markup for template-based rendering in list rows.
  const cls = className ? ` class="${className}"` : "";
  const icons = {
    document: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4H16L19 7V20H7V4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 4V7H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 14H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    sword: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4L20 10L9 21H3V15L14 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 7L17 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    shield: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L19 6V11C19 16.25 15.75 20.74 12 22C8.25 20.74 5 16.25 5 11V6L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    beaker: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 4H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 4V9L5 18C4.5 19 5.2 20 6.3 20H17.7C18.8 20 19.5 19 19 18L14 9V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    sparkles: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 3L19.8 5.2L22 6L19.8 6.8L19 9L18.2 6.8L16 6L18.2 5.2L19 3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    skull: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4C8.686 4 6 6.686 6 10V12C6 13.657 7.343 15 9 15V18H11V16H13V18H15V15C16.657 15 18 13.657 18 12V10C18 6.686 15.314 4 12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="10" r="1" fill="currentColor"/></svg>`,
    map: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6L9 4L15 6L21 4V18L15 20L9 18L3 20V6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4V18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 6V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    bag: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 8H17L18 20H6L7 8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8V7C9 5.343 10.343 4 12 4C13.657 4 15 5.343 15 7V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    tree: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L6 12H10L7 17H17L14 12H18L12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    fire: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C12 6 9 7.5 9 10C9 11.657 10.343 13 12 13C13.657 13 15 11.657 15 10C15 8 14 7 14 5C17 6.5 20 10 20 14C20 18.418 16.418 22 12 22C7.582 22 4 18.418 4 14C4 10.5 6 8 8 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    key: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M12 12H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 12V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 12V14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    eye: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12C3.8 8.5 7.4 6 12 6C16.6 6 20.2 8.5 22 12C20.2 15.5 16.6 18 12 18C7.4 18 3.8 15.5 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>`,
    photo: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6C4 4.895 4.895 4 6 4H18C19.105 4 20 4.895 20 6V18C20 19.105 19.105 20 18 20H6C4.895 20 4 19.105 4 18V6Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 15L10.5 12.5L13 15L16 11L19 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/></svg>`,
    // Tabler Icons: hand-click (MIT) — https://tabler.io/icons/icon/hand-click
    claim: `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 3l-1 -1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 7h-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 3l1 -1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 6h1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    "claim-off": `<svg${cls} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 3l-1 -1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 7h-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 3l1 -1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 6h1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  };
  return icons[iconName] || `<span${cls}>${escapeHtml(iconName)}</span>`;
}

// ---- 7) QR generation ----
// ---- 7) QR generation ----
// Uses the qrcode npm package loaded as an ESM module via esm.sh.
// SVG output is injected directly so the code scales perfectly at any size
// and never has the 0×0 canvas problem of hidden containers.
let _qrLib = null;

async function loadQRLib() {
  if (_qrLib) return _qrLib;
  try {
    const mod = await import("https://esm.sh/qrcode@1.5.4?bundle");
    _qrLib = mod.default || mod;
    return _qrLib;
  } catch (e) {
    console.warn("[TomeVault] QR library failed to load:", e);
    return null;
  }
}

async function renderQR(joinUrl) {
  if (!qrBox) return;
  qrBox.innerHTML = "";
  const QRLib = await loadQRLib();
  if (!QRLib) {
    // Graceful fallback: show the raw URL so the GM can still copy-share it.
    qrBox.innerHTML = `<p class="muted small" style="padding:12px;word-break:break-all;max-width:220px">${escapeHtml(joinUrl)}</p>`;
    return;
  }
  try {
    const isLight = document.body.dataset.theme === "light";
    const svg = await QRLib.toString(joinUrl, {
      type: "svg",
      width: 240,
      margin: 2,
      color: { dark: isLight ? "#2c2340" : "#1a0d2e", light: isLight ? "#f8f5ff" : "#ffffff" },
    });
    qrBox.innerHTML = svg;
    // Ensure the injected SVG fills the container.
    const svgEl = qrBox.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "100%");
      svgEl.style.display = "block";
    }
  } catch (e) {
    console.warn("[TomeVault] QR render failed:", e);
    qrBox.innerHTML = `<p class="muted small" style="padding:12px;word-break:break-all">${escapeHtml(joinUrl)}</p>`;
  }
}

// ---- 8) In-app QR scan — native getUserMedia + jsQR ----
// Replaced Html5Qrcode (external CDN dependency, unavailable) with a
// native MediaStream approach: getUserMedia opens the environment camera,
// frames are sampled via requestAnimationFrame, and jsQR (CDN global)
// decodes the barcode pixel-by-pixel without any third-party wrapper.
let _scanRafId = null;

async function startScan() {
  if (!qrReaderWrap) return;

  const videoEl = /** @type {HTMLVideoElement|null} */ ($("scannerVideo"));
  const canvasEl = /** @type {HTMLCanvasElement|null} */ ($("scannerCanvas"));
  if (!videoEl || !canvasEl) return;

  // Show the scanner modal via shared animation path.
  animateModalIn(qrReaderWrap);

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    if (plJoinMsg) plJoinMsg.textContent = "Camera access denied — enter session tag manually.";
    animateModalOut(qrReaderWrap);
    return;
  }

  // Store raw MediaStream so stopScan() can release tracks.
  state.scan = stream;
  videoEl.srcObject = stream;
  // Required for iOS Safari: playsinline suppresses fullscreen takeover.
  videoEl.setAttribute("playsinline", "");
  try { await videoEl.play(); } catch (_) {}

  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;

  function _onQRDecoded(decodedText) {
    try {
      const { join, pin } = parseInviteUrlFields(decodedText);
      if (join) {
        plSessionId.value = join;
        void hydrateJoinSessionPreview(join);
        if (pin && plPin) plPin.value = pin;
        stopScan();
        if (plNick && !String(plNick.value || "").trim()) plNick.value = getPlayerNickname();
        const nick = String(plNick?.value || "").trim();
        const pinVal = String(plPin?.value || "").trim();
        if (nick && /^\d{4,8}$/.test(pinVal)) {
          if (plJoinMsg) plJoinMsg.textContent = "QR recognized. Joining\u2026";
          joinPlayerSession(plSessionId.value, nick, pinVal)
            .then(ok => { if (!ok && plJoinMsg) plJoinMsg.textContent = "Auto-join failed. Check PIN and try again."; })
            .catch(() => { if (plJoinMsg) plJoinMsg.textContent = "Auto-join failed. Check PIN and try again."; });
        } else if (!nick) {
          if (plJoinMsg) plJoinMsg.textContent = "QR recognized. Enter your name and tap Join.";
          plNick?.focus();
        } else {
          if (plJoinMsg) plJoinMsg.textContent = "QR recognized. Enter PIN and tap Join.";
          plPin?.focus();
        }
      } else {
        if (plJoinMsg) plJoinMsg.textContent = "QR read, but no join-param found.";
      }
    } catch {
      if (plJoinMsg) plJoinMsg.textContent = "QR read, but it\u2019s not a valid invite link.";
    }
  }

  function _tick() {
    // Guard: stop looping once stream is released.
    if (!state.scan) return;
    if (videoEl.readyState >= videoEl.HAVE_ENOUGH_DATA) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      // jsQR is a CDN global exposed by the <script> tag in index.html.
      // If it hasn't loaded (offline / blocked), degrade gracefully.
      if (typeof jsQR !== "undefined") {
        // eslint-disable-next-line no-undef
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          _onQRDecoded(code.data);
          return; // exit — stopScan resets state.scan so next raf call exits
        }
      }
    }
    _scanRafId = requestAnimationFrame(_tick);
  }

  _scanRafId = requestAnimationFrame(_tick);
}

function stopScan() {
  // Cancel any pending animation frame first to prevent ghost ticks.
  if (_scanRafId !== null) { cancelAnimationFrame(_scanRafId); _scanRafId = null; }

  // Release camera tracks → turns off the camera LED on mobile.
  if (state.scan instanceof MediaStream) {
    state.scan.getTracks().forEach((t) => t.stop());
  }
  state.scan = null;

  const videoEl = $("scannerVideo");
  if (videoEl) { videoEl.srcObject = null; }

  if (qrReaderWrap) animateModalOut(qrReaderWrap);
}
// BEGINNER NOTE � Authentication overview:
// Firebase Auth handles user identity. This app supports three auth methods:
//   1. Email + password (traditional account)
//   2. Google sign-in (OAuth popup)
//   3. Anonymous / "Guest" (one-shot mode, no account required)
//
// The anonymous-to-permanent upgrade flow is key:
// When a guest creates an account, Firebase "links" the anonymous UID
// to the new credentials. This preserves all Firestore data (sessions,
// handouts, etc.) that was created under the anonymous UID.
//
// Security notes:
// - Passwords require 12+ chars, are checked against a common-passwords list,
//   and must not contain the user's name or email.
// - Password reset uses a generic success message to avoid revealing
//   whether an email exists (prevents user enumeration attacks).

// Validation helpers
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "111111",
  "abc123",
  "letmein",
  "admin",
  "welcome",
  "iloveyou",
  "dragon",
  "monkey",
  "sunshine",
  "princess",
  "football",
  "baseball",
]);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignUpPassword(password, { email = "", displayName = "", lastName = "" } = {}) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (/^\s+$/.test(password)) {
    return "Password cannot be only spaces.";
  }

  const normalized = password.toLowerCase();
  const collapsed = normalized.replace(/\s+/g, "");
  if (COMMON_WEAK_PASSWORDS.has(normalized) || COMMON_WEAK_PASSWORDS.has(collapsed)) {
    return "This password is too common. Please choose a more unique passphrase.";
  }

  const emailLocal = String(email).split("@")[0] || "";
  const tokens = [emailLocal, displayName, lastName]
    .flatMap((value) => String(value || "").toLowerCase().split(/[^a-z0-9]+/g))
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);

  if (tokens.some((token) => normalized.includes(token))) {
    return "Password cannot include your name or email.";
  }

  return "";
}

function showFieldError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearFieldError(el) {
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
}

function clearAllAuthErrors() {
  [signInEmailErr, signInPasswordErr, signInFormErr,
   signUpIGNErr, signUpEmailErr, signUpPasswordErr, signUpConfirmErr, signUpFormErr,
   authMethodErr
  ].forEach(clearFieldError);
}

// ── reCAPTCHA v3 ─────────────────────────────────────────────────────────────
const RECAPTCHA_SITE_KEY = "6LeMT5EsAAAAABZpKrhXRvmiG2SLIrjUIq5mqeeK";
const RECAPTCHA_VERIFY_ENDPOINT = "";

async function executeRecaptcha(action) {
  if (RECAPTCHA_SITE_KEY === "YOUR_SITE_KEY") return null; // not yet configured
  if (!window.grecaptcha) return null; // script not loaded
  try {
    await new Promise((resolve) => window.grecaptcha.ready(resolve));
    return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
  } catch (e) {
    console.warn("reCAPTCHA execution failed:", e);
    return null;
  }
}

async function verifyRecaptchaToken(action, token) {
  if (!RECAPTCHA_VERIFY_ENDPOINT) {
    return {
      ok: false,
      success: false,
      bypassed: true,
      code: "recaptcha/unavailable",
      message: "Security verification endpoint is unavailable.",
    };
  }

  let res;
  try {
    res = await fetch(RECAPTCHA_VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, token }),
    });
  } catch (error) {
    console.warn("reCAPTCHA backend verification request failed:", error);
    return {
      ok: false,
      success: false,
      bypassed: true,
      code: "recaptcha/unavailable",
      message: "Security verification endpoint is unavailable.",
    };
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  return {
    ok: res.ok,
    success: payload?.success === true,
    bypassed: false,
    code: res.ok ? "recaptcha/failed" : "recaptcha/unavailable",
    message: payload?.message || "Security verification failed.",
  };
}

async function requireRecaptcha(action) {
  // Skip token acquisition entirely when there's no verification endpoint —
  // obtaining a token we'll never send is pointless and can cause hangs on
  // certain domains or network conditions.
  if (!RECAPTCHA_VERIFY_ENDPOINT) {
    return { verified: false, bypassed: true, code: "recaptcha/unavailable", message: "" };
  }

  const token = await executeRecaptcha(action);
  if (!token) {
    console.warn(`reCAPTCHA execution unavailable for action: ${action}`);
    return {
      verified: false,
      bypassed: true,
      code: "recaptcha/unavailable",
      message: "Security check unavailable. Refresh and try again.",
    };
  }

  const verification = await verifyRecaptchaToken(action, token);
  if (!verification.ok || !verification.success) {
    console.warn(`reCAPTCHA backend verification bypassed for action: ${action}`, verification);
    return {
      verified: false,
      bypassed: true,
      code: verification.code || "recaptcha/failed",
      message: verification.message || "Security verification failed.",
    };
  }

  return {
    verified: true,
    bypassed: false,
    code: null,
    message: "",
  };
}

function setSubmitLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("is-loading", loading);
  btn.disabled = loading;
}

// Map Firebase auth error codes to user-friendly messages
function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/email-already-in-use": "An account with that email already exists. Try signing in instead.",
    "auth/weak-password": "Password is too weak. Use at least 12 characters and avoid common passwords.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Sign-in popup was closed. Try again.",
    "auth/cancelled-popup-request": "Sign-in was interrupted. Please try again.",
    "auth/popup-blocked": "Popup was blocked by the browser. Please allow popups or use the redirect flow.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication yet.",
    "auth/configuration-not-found": "Authentication is not fully configured in Firebase for this project yet.",
    "auth/invalid-api-key": "Firebase API key is invalid for this app configuration.",
    "auth/app-not-authorized": "This app/domain is not authorized for Firebase Authentication.",
    "auth/unauthorized-domain": "This domain is not authorized for Firebase Authentication.",
    "auth/operation-not-supported-in-this-environment": "This browser mode is not fully supported for auth. Please use a normal browser window.",
    "auth/web-storage-unsupported": "Browser storage is blocked. Disable private mode or strict tracking prevention and try again.",
    "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-email": "Please enter a valid email address.",
    "recaptcha/unavailable": "Security check unavailable. Refresh the page and try again.",
    "recaptcha/failed": "Security verification failed. Please try again.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

function authErrorWithCode(code) {
  const message = friendlyAuthError(code);
  return code ? `${message} (${code})` : message;
}

// Some browsers block local persistence in strict/private mode.
// We fall back to session, then in-memory so auth still works.
async function ensureAuthPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    return;
  } catch (localErr) {
    console.warn("Auth local persistence unavailable, trying session persistence.", localErr);
  }

  try {
    await setPersistence(auth, browserSessionPersistence);
    return;
  } catch (sessionErr) {
    console.warn("Auth session persistence unavailable, falling back to in-memory.", sessionErr);
  }

  try {
    await setPersistence(auth, inMemoryPersistence);
  } catch (memoryErr) {
    // If this fails too, Firebase will still attempt its default behavior.
    console.warn("Auth in-memory persistence setup failed.", memoryErr);
  }
}

function shouldUseRedirectAuthFlow() {
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const hasCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  return Boolean(isMobileUA || hasCoarsePointer);
}

async function processRedirectAuthResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return;

    const user = result.user;
    state.uid = user.uid;
    state.isGuest = false;
    state.isSignedIn = true;
    state.displayName = user.displayName || "";
    state.email = user.email || "";

    const hadProfile = await hasExistingUserProfile(user.uid);
    await ensureFirestoreProfile(user);
    if (hadProfile) {
      const preferredName = await resolvePreferredDisplayName(user);
      if (preferredName) applyResolvedNicknameState(preferredName);
    }
    await convertOneShotSessions(user.uid);
    if (!hadProfile) {
      showToast("First time here - choose your player name.", "info", UI_TIMERS.TOAST_MED);
    }
    const nick = await requireNickname({ forcePrompt: !hadProfile });
    if (nick) state.displayName = nick;
    updateLandingAuthState();
    showToast("Welcome, " + (state.displayName || "Adventurer") + "!", "success");
  } catch (e) {
    if (e?.code === "auth/no-auth-event") return;
    console.error("Redirect auth result error:", e);
    showToast(friendlyAuthError(e?.code), "error");
  }
}

// Sync the landing page to reflect signed-in vs signed-out state
function updateLandingAuthState() {
  const signedIn = state.isSignedIn;

  if (authCard) authCard.classList.toggle("hidden", signedIn);
  if (authGuestCta) authGuestCta.classList.toggle("hidden", signedIn);
  if (landingHome) landingHome.classList.toggle("hidden", !signedIn);

  if (signedIn && landingDisplayName) {
    landingDisplayName.textContent = state.displayName || "Adventurer";
  }
  // One-shot banner — tied to active one-shot session, not guest state
  if (oneShotBanner) {
    oneShotBanner.classList.toggle("hidden", !state._isOneShotSession || !state.sessionId);
  }
  if (signedIn) {
    loadMySessions();
  }
}

const EMPTY_PROFILE_PLACEHOLDER_URLS = [
  "placeholders/emptyProfilePictures/emptyProfilePH1_1.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_2.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_3.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_4.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_5.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_6.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_7.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_8.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_9.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_10.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_11.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_12.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_13.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_14.png",
  "placeholders/emptyProfilePictures/emptyProfilePH1_15.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_1.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_2.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_3.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_4.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_5.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_6.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_7.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_8.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_9.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_10.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_11.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_12.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_13.png",
  "placeholders/emptyProfilePictures/emptyProfilePH2_14.png",
];

function getPlaceholderColorKey(url) {
  const match = String(url || "").match(/emptyProfilePH\d+_(\d+)\.png$/i);
  return match?.[1] || "";
}

function buildPlaceholderColorGroups() {
  const groups = new Map();
  EMPTY_PROFILE_PLACEHOLDER_URLS.forEach((url) => {
    const colorKey = getPlaceholderColorKey(url);
    if (!colorKey) return;
    const existing = groups.get(colorKey) || [];
    existing.push(url);
    groups.set(colorKey, existing);
  });
  return groups;
}

const EMPTY_PROFILE_PLACEHOLDER_GROUPS = buildPlaceholderColorGroups();

function pickRandomFromList(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items[Math.floor(Math.random() * items.length)] || "";
}

function extractAssignedPlaceholderColorFromUserData(userData) {
  if (!userData || typeof userData !== "object") return "";

  const candidates = [
    userData?.roleProfiles?.player?.avatarUrl,
    userData?.roleProfiles?.gm?.avatarUrl,
    userData?.avatarUrl,
  ];

  for (const candidate of candidates) {
    const colorKey = getPlaceholderColorKey(candidate);
    if (colorKey) return colorKey;
  }
  return "";
}

async function pickInitialProfilePlaceholderAvatar() {
  const colorKeys = Array.from(EMPTY_PROFILE_PLACEHOLDER_GROUPS.keys());
  if (colorKeys.length === 0) return "";

  try {
    const allUsersSnap = await getDocs(collection(db, "users"));
    const colorCounts = Object.fromEntries(colorKeys.map((key) => [key, 0]));

    allUsersSnap.forEach((userDoc) => {
      const assignedColor = extractAssignedPlaceholderColorFromUserData(userDoc.data());
      if (assignedColor && Object.prototype.hasOwnProperty.call(colorCounts, assignedColor)) {
        colorCounts[assignedColor] += 1;
      }
    });

    const minCount = Math.min(...colorKeys.map((key) => colorCounts[key]));
    const leastUsedColors = colorKeys.filter((key) => colorCounts[key] === minCount);
    const selectedColor = pickRandomFromList(leastUsedColors);
    const selectedGroup = EMPTY_PROFILE_PLACEHOLDER_GROUPS.get(selectedColor) || [];
    return pickRandomFromList(selectedGroup);
  } catch (err) {
    console.warn("Could not balance placeholder color assignment:", err);
    return pickRandomFromList(EMPTY_PROFILE_PLACEHOLDER_URLS);
  }
}

// Write or update the user profile doc in Firestore after sign-up/link
async function ensureFirestoreProfile(user, extraData = {}) {
  if (!user?.uid) return;
  const userRef = doc(db, "users", user.uid);
  const resolvedDisplayName = String(extraData.displayName || user.displayName || "").trim();
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialPlaceholderAvatar = await pickInitialProfilePlaceholderAvatar();
      await setDoc(userRef, {
        uid: user.uid,
        displayName: resolvedDisplayName,
        email: user.email || extraData.email || "",
        lastName: extraData.lastName || "",
        createdAt: serverTimestamp(),
        avatarUrl: initialPlaceholderAvatar,
        avatarStoragePath: "",
        quickStats: {},
        roleProfiles: {
          player: {
            displayName: resolvedDisplayName,
            avatarUrl: initialPlaceholderAvatar,
            avatarStoragePath: "",
          },
          dm: {
            displayName: resolvedDisplayName,
            avatarUrl: initialPlaceholderAvatar,
            avatarStoragePath: "",
          },
        },
      });
    } else if (extraData.displayName || extraData.lastName) {
      // Only update if TomeVault explicitly provides a name — never let the auth
      // provider's displayName (e.g. Google account name) overwrite the user's
      // custom in-game name on an existing profile.
      const updates = {};
      const explicitName = String(extraData.displayName || "").trim();
      if (explicitName) {
        updates.displayName = explicitName;
        updates["roleProfiles.player.displayName"] = explicitName;
        updates["roleProfiles.gm.displayName"] = explicitName;
      }
      if (extraData.lastName) updates.lastName = extraData.lastName;
      if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
    }
  } catch (e) {
    console.warn("ensureFirestoreProfile error:", e);
  }
}

async function hasExistingUserProfile(uid) {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) return false;
  try {
    const snap = await getDoc(getUserProfileRef(normalizedUid));
    return snap.exists();
  } catch (_) {
    return false;
  }
}

async function resolvePreferredDisplayName(user) {
  const uid = String(user?.uid || state.uid || "").trim();
  let profileDisplayName = "";
  if (uid) {
    try {
      const playerProfile = await loadUserProfile(uid, { role: "player", force: true });
      const dmProfile = await loadUserProfile(uid, { role: "dm", force: true });
      profileDisplayName = String(playerProfile?.displayName || dmProfile?.displayName || "").trim();
    } catch (err) {
      if (!isPermissionDenied(err)) {
        console.warn("Preferred displayName lookup failed:", err);
      }
    }
  }

  return String(
    profileDisplayName
    || state.playerNick
    || state.nickname
    || plNick?.value
    || localStorage.getItem("tv_nick")
    || localStorage.getItem("tv_nickname")
    || state.displayName
    || user?.displayName
    || ""
  ).trim();
}

function applyResolvedNicknameState(name, options = {}) {
  const overwriteInput = options?.overwriteInput === true;
  const normalized = String(name || "").trim();
  if (!normalized) return "";
  state.displayName = normalized;
  state.nickname = normalized;
  state.playerNick = normalized;
  localStorage.setItem("tv_nick", normalized);
  localStorage.setItem("tv_nickname", normalized);
  if (plNick && (overwriteInput || !String(plNick.value || "").trim())) {
    plNick.value = normalized;
  }
  return normalized;
}

// One-time migration:
// Keep displayName consistent across legacy top-level field and roleProfiles.{player,dm}.
async function runOneTimeRoleDisplayNameMigration(user) {
  const uid = String(user?.uid || "").trim();
  if (!uid) return;

  const migrationKey = `tv:role-name-migrated:v1:${uid}`;
  if (localStorage.getItem(migrationKey) === "1") return;

  const preferredName = await resolvePreferredDisplayName(user);

  if (!preferredName) {
    localStorage.setItem(migrationKey, "1");
    return;
  }

  try {
    await setDoc(getUserProfileRef(uid), {
      displayName: preferredName,
      roleProfiles: {
        player: { displayName: preferredName },
        dm: { displayName: preferredName },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const cachedPlayer = getCachedProfile(uid, "player") || {};
    const cachedDm = getCachedProfile(uid, "dm") || {};
    setCachedProfile(uid, "player", { ...cachedPlayer, displayName: preferredName });
    setCachedProfile(uid, "dm", { ...cachedDm, displayName: preferredName });

    if (auth.currentUser && auth.currentUser.uid === uid && auth.currentUser.displayName !== preferredName) {
      try {
        await updateProfile(auth.currentUser, { displayName: preferredName });
      } catch (profileErr) {
        console.warn("One-time displayName auth sync failed:", profileErr);
      }
    }

    applyResolvedNicknameState(preferredName);
    localStorage.setItem(migrationKey, "1");
  } catch (err) {
    if (isPermissionDenied(err)) {
      localStorage.setItem(migrationKey, "1");
      return;
    }
    console.warn("One-time role displayName migration failed:", err);
  }
}

// Trial system: free campaign access for 30 days after account creation.
// One-shots stay free forever.
// TODO: 6-month archival - a Cloud Function on pubsub.schedule('every 24 hours')
// should query sessions where ALL players' lastSeenAt > 6 months ago, move docs
// to an 'archivedSessions' collection, and delete originals. This requires
// Firebase Cloud Functions (server-side) and is out of scope for client code.
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function checkTrialStatus() {
  if (!state.uid) return false;
  try {
    const userSnap = await getDoc(doc(db, "users", state.uid));
    if (!userSnap.exists()) return true; // new user, will get createdAt on next write
    const data = userSnap.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    if (!createdAt) return true; // no timestamp yet � allow
    const remaining = (createdAt.getTime() + TRIAL_DURATION_MS) - Date.now();
    state.trialDaysLeft = Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
    state.trialHoursLeft = Math.max(0, Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
    return remaining > 0;
  } catch (e) {
    console.warn("Trial check failed, allowing access:", e);
    return true; // fail open so users aren't locked out by network issues
  }
}

function getTrialText() {
  if (state.trialDaysLeft === undefined || state.trialDaysLeft === null) return "";
  if (state.trialDaysLeft <= 0) return "Free trial expired � one-shots only";
  const days = state.trialDaysLeft;
  const hours = state.trialHoursLeft || 0;
  const dayPart = `${days} day${days === 1 ? "" : "s"}`;
  const hourPart = hours > 0 ? `, ${hours} hour${hours === 1 ? "" : "s"}` : "";
  return `Free trial: ${dayPart}${hourPart} remaining`;
}

// Convert one-shot sessions to permanent after account creation
async function convertOneShotSessions(uid) {
  if (!uid) return;
  try {
    const q = query(collection(db, "sessions"), where("gmUid", "==", uid), where("isOneShot", "==", true));
    const snap = await getDocs(q);
    const promises = snap.docs.map((d) =>
      updateDoc(doc(db, "sessions", d.id), { isOneShot: false, expiresAt: null })
    );
    await Promise.all(promises);
  } catch (e) {
    console.warn("convertOneShotSessions error:", e);
  }
}

async function cleanupOwnedExpiredOneShots(uid) {
  if (!uid) return;
  try {
    const q = query(collection(db, "sessions"), where("gmUid", "==", uid), where("isOneShot", "==", true));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(async (d) => {
      const data = d.data();
      if (!isExpiredOneShotSession(data)) return;
      await tryDeleteExpiredOneShotSession(d.id, data);
    }));
  } catch (e) {
    console.warn("cleanupOwnedExpiredOneShots error:", e);
  }
}

// ================================================================
// ZONE: AUTHENTICATION FLOW
// Purpose: auth state bootstrap, sign-in/up providers, guest mode, session ping.
// ================================================================

// Core auth initializer � returns a promise that resolves on first auth state.
// Does NOT auto-sign-in anonymously; user must choose.
//
// BEGINNER NOTE � onAuthStateChanged:
// This is Firebase's way of saying "call me whenever the user logs in,
// logs out, or the page reloads with a cached session". It fires once
// immediately with the current state, then again on every auth change.
// We wrap it in a Promise so `await initAuth()` in main() blocks until
// we know who the user is (or that nobody is logged in).
function initAuth() {
  return new Promise((resolve) => {
    let resolved = false;
    onAuthStateChanged(auth, (user) => {
      if (user) {
        state.uid = user.uid;
        state.isSignedIn = true;
        state.isGuest = false;
        state.displayName = user.displayName || "";
        state.email = user.email || "";
        if (resolved) ensureOwnProfileLoaded().catch(() => {});
      } else {
        state.uid = null;
        state.isSignedIn = false;
        state.isGuest = false;
        state.displayName = null;
        state.email = null;
        updateTopBarAvatar("");
      }
      updateLandingAuthState();
      if (!resolved) { resolved = true; resolve(user); }
    });
  });
}

// Sign up with email + password
async function signUpWithEmail() {
  clearAllAuthErrors();
  const ign = signUpIGN?.value?.trim() || "";
  const email = signUpEmail?.value?.trim() || "";
  const pw = signUpPassword?.value || "";
  const pwConfirm = signUpConfirm?.value || "";

  // Validate
  let hasErr = false;
  if (ign.length < 2 || ign.length > 30) {
    showFieldError(signUpIGNErr, "Must be 2�30 characters.");
    hasErr = true;
  }
  if (!isValidEmail(email)) {
    showFieldError(signUpEmailErr, "Please enter a valid email address.");
    hasErr = true;
  }
  const passwordValidationError = validateSignUpPassword(pw, { email, displayName: ign });
  if (passwordValidationError) {
    showFieldError(signUpPasswordErr, passwordValidationError);
    hasErr = true;
  }
  if (!pwConfirm) {
    showFieldError(signUpConfirmErr, "Please re-enter your password.");
    hasErr = true;
  } else if (pw !== pwConfirm) {
    showFieldError(signUpConfirmErr, "Passwords don't match.");
    hasErr = true;
  }
  if (hasErr) return;
  setSubmitLoading(btnSignUp, true);
  showAuthLoading("Creating your account...");
  const signUpRecaptcha = await requireRecaptcha("sign_up");
  try {
    let user;
    // If current session is anonymous, link the credential to preserve data
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, pw);
      const result = await linkWithCredential(auth.currentUser, credential);
      user = result.user;
    } else {
      const result = await createUserWithEmailAndPassword(auth, email, pw);
      user = result.user;
    }
    await updateProfile(user, { displayName: ign });
    // Force refresh so onAuthStateChanged picks up the new displayName
    await user.reload();
    state.displayName = ign;
    state.isGuest = false;
    state.isSignedIn = true;
    state.uid = user.uid;

    await ensureFirestoreProfile(user, { displayName: ign, email });
    await convertOneShotSessions(user.uid);
    const nick = await requireNickname();
    if (nick) state.displayName = nick;

    try {
      await sendEmailVerification(user);
    } catch (verificationErr) {
      console.warn("Verification email send failed:", verificationErr);
    }

    updateLandingAuthState();

    // Handle pending navigation (QR join or one-shot intent)
    const redirected = await handlePostAuthRedirect();
    if (redirected) return;

    if (signUpRecaptcha?.bypassed) {
      showToast("Account created. Security check was unavailable and was bypassed for this attempt.", "info", UI_TIMERS.TOAST_MED);
    }
    if (!user.emailVerified) {
      showToast("Account created. You're signed in now - please verify your email when convenient.", "info", UI_TIMERS.TOAST_LONG);
    } else {
      showToast("Account created. Welcome to TomeVault!", "success", 4500);
    }
  } catch (e) {
    console.error("Sign up error:", e);
    if (e.code === "auth/email-already-in-use" && auth.currentUser?.isAnonymous) {
      // Can't link � account exists. Inform user to sign in instead.
      showFieldError(signUpFormErr, "That email already has an account. Please sign in instead.");
    } else {
      showFieldError(signUpFormErr, authErrorWithCode(e.code));
    }
  } finally {
    setSubmitLoading(btnSignUp, false);
    hideAuthLoading();
  }
}

// Sign in with email + password
async function signInWithEmailFn() {
  clearAllAuthErrors();
  const email = signInEmail?.value?.trim() || "";
  const pw = signInPassword?.value || "";

  let hasErr = false;
  if (!email) { showFieldError(signInEmailErr, "Enter your email."); hasErr = true; }
  if (!pw) { showFieldError(signInPasswordErr, "Enter your password."); hasErr = true; }
  if (hasErr) return;
  setSubmitLoading(btnSignIn, true);
  showAuthLoading("Signing you in...");
  const signInRecaptcha = await requireRecaptcha("sign_in");
  const recaptchaBypassed = signInRecaptcha?.bypassed === true;
  try {
    const result = await signInWithEmailAndPassword(auth, email, pw);
    if (!result.user.emailVerified) {
      try {
        await sendEmailVerification(result.user);
      } catch (verificationErr) {
        console.warn("Resend verification failed:", verificationErr);
      }
      showToast("Signed in, but your email is not verified yet. A new verification link was sent.", "info", UI_TIMERS.TOAST_LONG);
    }

    state.uid = result.user.uid;
    state.isGuest = false;
    state.isSignedIn = true;
    state.displayName = result.user.displayName || "";
    state.email = result.user.email || "";
    await ensureFirestoreProfile(result.user);
    const preferredName = await resolvePreferredDisplayName(result.user);
    if (preferredName) applyResolvedNicknameState(preferredName);
    const nick = await requireNickname();
    if (nick) state.displayName = nick;
    updateLandingAuthState();

    // Handle pending navigation (QR join or one-shot intent)
    const redirected = await handlePostAuthRedirect();
    if (redirected) return;

    if (recaptchaBypassed) {
      showToast("Signed in. Security check was unavailable and was bypassed for this attempt.", "info", UI_TIMERS.TOAST_MED);
    }
    showToast("Welcome back, " + (state.displayName || "Adventurer") + "!", "success");
  } catch (e) {
    console.error("Sign in error:", e);
    showFieldError(signInFormErr, authErrorWithCode(e.code));
  } finally {
    setSubmitLoading(btnSignIn, false);
    hideAuthLoading();
  }
}

// Sign in / sign up with Google (auto-links anonymous accounts)
async function signInWithGoogleFn() {
  if (googleAuthInFlight) {
    showToast("Google sign-in is already in progress...", "info", UI_TIMERS.TOAST_BRIEF);
    return;
  }

  googleAuthInFlight = true;
  clearAllAuthErrors();
  // Google button is on Screen 1 — errors surface to authMethodErr
  const googleErrorTarget = authMethodErr;
  let redirectHandoff = false;
  showAuthLoading("Connecting to Google...");
  try {
    let result;
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      // Attempt to link anonymous account with Google
      try {
        result = await linkWithPopup(auth.currentUser, googleProvider);
      } catch (linkErr) {
        if (linkErr.code === "auth/credential-already-in-use") {
          // Google account already exists � sign in directly
          result = await signInWithPopup(auth, googleProvider);
          showToast("Signed in with existing Google account.", "info", UI_TIMERS.TOAST_SHORT);
        } else {
          throw linkErr;
        }
      }
    } else {
      result = await signInWithPopup(auth, googleProvider);
    }
    const user = result.user;
    state.uid = user.uid;
    state.isGuest = false;
    state.isSignedIn = true;
    state.displayName = user.displayName || "";
    state.email = user.email || "";

    const hadProfile = await hasExistingUserProfile(user.uid);
    await ensureFirestoreProfile(user);
    if (hadProfile) {
      const preferredName = await resolvePreferredDisplayName(user);
      if (preferredName) applyResolvedNicknameState(preferredName);
    }
    await convertOneShotSessions(user.uid);
    if (!hadProfile) {
      showToast("First time here - choose your player name.", "info", UI_TIMERS.TOAST_MED);
    }
    const nick = await requireNickname({ forcePrompt: !hadProfile });
    if (nick) state.displayName = nick;

    updateLandingAuthState();

    // Handle pending navigation (QR join or one-shot intent)
    const redirected = await handlePostAuthRedirect();
    if (redirected) return;

    showToast("Welcome, " + (state.displayName || "Adventurer") + "!", "success");
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user") return; // User cancelled � no error

    if (e.code === "auth/cancelled-popup-request") {
      // Usually caused by overlapping popup attempts (double taps / repeated clicks).
      showToast("Google sign-in was interrupted. Please try again once.", "info", UI_TIMERS.TOAST_SHORT);
      return;
    }

    // If popup auth fails due browser constraints, retry with redirect.
    if (["auth/popup-blocked", "auth/web-storage-unsupported", "auth/operation-not-supported-in-this-environment"].includes(e.code)) {
      try {
        if (auth.currentUser && auth.currentUser.isAnonymous) {
          redirectHandoff = true;
          await linkWithRedirect(auth.currentUser, googleProvider);
        } else {
          redirectHandoff = true;
          await signInWithRedirect(auth, googleProvider);
        }
        return;
      } catch (redirectErr) {
        redirectHandoff = false;
        console.error("Google redirect fallback error:", redirectErr);
        showFieldError(googleErrorTarget, authErrorWithCode(redirectErr.code));
        showToast(authErrorWithCode(redirectErr.code), "error", UI_TIMERS.TOAST_LONG);
        return;
      }
    }

    console.error("Google sign-in error:", e);
    showFieldError(googleErrorTarget, authErrorWithCode(e.code));
    showToast(authErrorWithCode(e.code), "error", UI_TIMERS.TOAST_LONG);
  } finally {
    if (!redirectHandoff) googleAuthInFlight = false;
    if (!redirectHandoff) hideAuthLoading();
  }
}

// Send password reset email
async function sendResetEmailFn() {
  clearAllAuthErrors();
  const email = signInEmail?.value?.trim() || "";
  if (!isValidEmail(email)) {
    showFieldError(signInEmailErr, "Enter your email address first, then click \"Forgot password?\".");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("If that email exists, a password reset link has been sent.", "success", UI_TIMERS.TOAST_MED);
  } catch (e) {
    console.error("Reset email error:", e);
    // Show generic message for security (don't reveal if email exists)
    showToast("If that email exists, a password reset link has been sent.", "success", UI_TIMERS.TOAST_MED);
  }
}

// Sign out
// IMPORTANT: Sign-out is more than just Firebase auth � we must also:
// 1. Wipe all in-memory state so stale data doesn't leak into a new session
// 2. Clear localStorage keys so the next page load doesn't auto-resume
// 3. Unsubscribe all Firestore listeners (cleanupListeners) to stop
//    receiving realtime updates for a session we no longer belong to
// 4. Navigate back to landing and update the auth card UI
async function signOutFn() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Sign out error:", e);
  }
  // Clear session state
  state.uid = null;
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.joinLink = null;
  state.gmPinPlain = null;
  state.isGuest = false;
  state.isSignedIn = false;
  state.displayName = null;
  state.nickname = null;
  state.playerNick = null;
  state.email = null;
  state.inventoryItems = [];
  state.wallets = {};
  state._isOneShotIntent = false;
  state._isOneShotSession = false;
  state._pendingJoinFromUrl = null;
  state._pendingOneShotRole = null;
  localStorage.removeItem("tv_role");
  localStorage.removeItem("tv_sessionId");
  localStorage.removeItem("tv_joinTag");
  localStorage.removeItem("tv_lastDmSessionId");
  localStorage.removeItem("tv_dmPin");
  cleanupListeners();
  showOnly(SCREEN_KEYS.LANDING);
  showAuthMethodScreen();
  updateLandingAuthState();
  showToast("Signed out.", "info");
}

// Post-auth redirect helper — checks for pending navigation after sign-in/sign-up
async function handlePostAuthRedirect() {
  if (state._pendingJoinFromUrl) {
    const pending = state._pendingJoinFromUrl;
    state._pendingJoinFromUrl = null;
    state.role = "player";
    showOnly(SCREEN_KEYS.PL_JOIN);
    try {
      const autoJoined = await tryAutoJoinFromDeepLink(pending);
      if (autoJoined) return true;
    } catch (e) {
      console.warn("Auto-join from pending deep link failed:", e);
    }
    if (plPin && !String(plPin.value || "").trim()) plPin.focus();
    return true;
  }
  if (state._pendingOneShotRole) {
    const role = state._pendingOneShotRole;
    state._pendingOneShotRole = null;
    state._isOneShotIntent = true;
    state.role = role === "player" ? "player" : "dm";
    showOnly(role === "player" ? SCREEN_KEYS.PL_JOIN : SCREEN_KEYS.GM_CREATE);
    showToast("One-shot mode — your session expires in 24 hours.", "info", UI_TIMERS.TOAST_MED);
    persistLocal();
    return true;
  }
  return false;
}

// One-shot entry (requires real auth)
function startOneShot(targetRole = "dm") {
  if (!auth.currentUser) {
    state._pendingOneShotRole = targetRole;
    showOnly(SCREEN_KEYS.LANDING);
    showAuthMethodScreen();
    if (authCard) authCard.classList.remove("hidden");
    if (authGuestCta) authGuestCta.classList.add("hidden");
    if (landingHome) landingHome.classList.add("hidden");
    showToast("Sign in to start a one-shot session.", "info");
    return;
  }
  state._isOneShotIntent = true;
  state.role = targetRole === "player" ? "player" : "dm";
  showOnly(targetRole === "player" ? SCREEN_KEYS.PL_JOIN : SCREEN_KEYS.GM_CREATE);
  showToast("One-shot mode — your session expires in 24 hours.", "info", UI_TIMERS.TOAST_MED);
  persistLocal();
}

// ---- 9b) Membership tracking (Firestore) ----
// Stores session membership under users/{uid}/memberships/{sessionId}
// so "My Sessions" works across devices without localStorage dependency.
function getMembershipRef(uid, sessionId) {
  if (!uid || !sessionId) return null;
  return doc(db, "users", uid, "memberships", sessionId);
}

async function writeMembership({ role, sessionName, joinTag, status = "active" } = {}) {
  const ref = getMembershipRef(state.uid, state.sessionId);
  if (!ref) return;
  try {
    await setDoc(ref, {
      sessionId: state.sessionId,
      joinTag: joinTag || state.joinTag || "",
      sessionName: sessionName || state.sessionName || "",
      role: role || state.role || "player",
      status,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn("writeMembership failed:", e);
  }
}

async function markMembershipLeft(uid, sessionId) {
  const ref = getMembershipRef(uid, sessionId);
  if (!ref) return;
  try {
    await setDoc(ref, { status: "left", leftAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn("markMembershipLeft failed:", e);
  }
}

// ---- 10) Heartbeat (player lastSeen) ----
let heartbeatTimer = null;
let _heartbeatCount = 0;

function startHeartbeat() {
  // Every 20s, player updates lastSeenAt. GM can then see active/online players.
  // Every 5th beat also updates the Firestore membership doc for cross-device discovery.
  stopHeartbeat();
  _heartbeatCount = 0;
  // Fire one heartbeat immediately so status updates without waiting 20s.
  sendHeartbeatNow();
  heartbeatTimer = setInterval(async () => {
    if (!state.sessionId || !state.uid) return;
    const playerRef = doc(db, FIREBASE_PATHS.SESSIONS, state.sessionId, FIREBASE_PATHS.PLAYERS, state.uid);
    try {
      await setDoc(playerRef, { lastSeenAt: serverTimestamp() }, { merge: true });
    } catch {}
    // Update membership every 5th heartbeat (~100s)
    _heartbeatCount++;
    if (_heartbeatCount % 5 === 0) {
      const ref = getMembershipRef(state.uid, state.sessionId);
      if (ref) {
        setDoc(ref, { lastSeenAt: serverTimestamp() }, { merge: true }).catch(() => {});
      }
    }
  }, UI_TIMERS.HEARTBEAT_MS);
}

function stopHeartbeat() {
  // Prevents duplicate intervals and background updates when leaving a session.
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

async function sendHeartbeatNow() {
  if (!state.sessionId || !state.uid) return;
  const playerRef = doc(db, FIREBASE_PATHS.SESSIONS, state.sessionId, FIREBASE_PATHS.PLAYERS, state.uid);
  try {
    await setDoc(playerRef, { lastSeenAt: serverTimestamp() }, { merge: true });
  } catch {}
}

// ---- 11) Navigation (knoppen) ----
// Pattern note:
// `btn && (btn.onclick = ...)` means "only attach handler if element exists".
// This keeps script robust if HTML structure changes or partial pages are loaded.
btnGoGM && (btnGoGM.onclick = () => {
  // GM role path starts at create-session screen.
  state.role = "dm";
  showOnly(SCREEN_KEYS.GM_CREATE);
  persistLocal();
});

btnGoPlayer && (btnGoPlayer.onclick = () => {
  // Player role path starts at join screen.
  state.role = "player";
  showOnly(SCREEN_KEYS.PL_JOIN);
  persistLocal();
});

// ---- Auth UI wiring ----
// Two-level state:
//   activeAuthView  — which card screen is shown ("method" | "email")
//   activeAuthTab   — which mode is active ("signIn" | "signUp")
let activeAuthView = "method";
let activeAuthTab = "signIn";

function showAuthMethodScreen() {
  activeAuthView = "method";
  authMethodScreen?.classList.remove("hidden");
  authEmailScreen?.classList.add("hidden");
  clearAllAuthErrors();
}

function showAuthEmailScreen() {
  activeAuthView = "email";
  authMethodScreen?.classList.add("hidden");
  authEmailScreen?.classList.remove("hidden");
  clearAllAuthErrors();
  // Focus the first visible input for keyboard accessibility
  requestAnimationFrame(() => {
    const firstInput = authEmailScreen?.querySelector("input:not([disabled])");
    firstInput?.focus();
  });
}

function switchAuthTab(tab) {
  if (!authTabSignIn || !authTabSignUp) return;
  const isSignIn = tab === "signIn";
  activeAuthTab = isSignIn ? "signIn" : "signUp";
  authTabSignIn.classList.toggle("is-active", isSignIn);
  authTabSignUp.classList.toggle("is-active", !isSignIn);
  authTabSignIn.setAttribute("aria-selected", String(isSignIn));
  authTabSignUp.setAttribute("aria-selected", String(!isSignIn));
  // Keep mode selector in sync (Screen 1)
  authModeSignIn?.classList.toggle("is-active", isSignIn);
  authModeSignUp?.classList.toggle("is-active", !isSignIn);
  authModeSignIn?.setAttribute("aria-selected", String(isSignIn));
  authModeSignUp?.setAttribute("aria-selected", String(!isSignIn));
  authSignIn?.classList.toggle("hidden", !isSignIn);
  authSignUp?.classList.toggle("hidden", isSignIn);
  clearAllAuthErrors();
}

function validateConfirmPasswordLive() {
  if (!signUpPassword || !signUpConfirm) return;
  const password = signUpPassword.value || "";
  const confirm = signUpConfirm.value || "";

  if (!confirm) {
    signUpConfirm.setCustomValidity("");
    clearFieldError(signUpConfirmErr);
    return;
  }

  if (password !== confirm) {
    signUpConfirm.setCustomValidity("Passwords do not match.");
    showFieldError(signUpConfirmErr, "Passwords don't match.");
    return;
  }

  signUpConfirm.setCustomValidity("");
  clearFieldError(signUpConfirmErr);
}

authTabSignIn?.addEventListener("click", () => switchAuthTab("signIn"));
authTabSignUp?.addEventListener("click", () => switchAuthTab("signUp"));

// Mode selector on Screen 1
authModeSignIn?.addEventListener("click", () => switchAuthTab("signIn"));
authModeSignUp?.addEventListener("click", () => switchAuthTab("signUp"));

// Email CTA on Screen 1 → go to credential screen
authBtnEmail?.addEventListener("click", () => showAuthEmailScreen());

// Back button on Screen 2 → return to method screen
btnAuthBack?.addEventListener("click", () => showAuthMethodScreen());

// Form submissions
formSignIn?.addEventListener("submit", (e) => { e.preventDefault(); signInWithEmailFn(); });
formSignUp?.addEventListener("submit", (e) => { e.preventDefault(); signUpWithEmail(); });
signUpPassword?.addEventListener("input", () => {
  if (!signUpPasswordErr?.classList.contains("hidden")) {
    const pwError = validateSignUpPassword(signUpPassword.value || "", {
      email: signUpEmail?.value || "",
      displayName: signUpIGN?.value || "",
    });
    if (pwError) showFieldError(signUpPasswordErr, pwError);
    else clearFieldError(signUpPasswordErr);
  }
  validateConfirmPasswordLive();
});
signUpConfirm?.addEventListener("input", validateConfirmPasswordLive);

// Social buttons
btnGoogleContinue?.addEventListener("click", () => signInWithGoogleFn());

// Forgot password
btnForgotPassword?.addEventListener("click", () => sendResetEmailFn());

// Sign out
btnSignOut?.addEventListener("click", () => signOutFn());

// Guest one-shot
btnGuestOneShotCreate?.addEventListener("click", () => startOneShot("dm"));
btnGuestOneShotJoin?.addEventListener("click", () => startOneShot("player"));

// One-shot upgrade banner → switch to sign-up tab on landing
btnOneShotUpgrade?.addEventListener("click", () => {
  showOnly(SCREEN_KEYS.LANDING);
  switchAuthTab("signUp");
  showAuthEmailScreen();
  // Show auth card even if guest is signed in anonymously
  if (authCard) authCard.classList.remove("hidden");
  if (authGuestCta) authGuestCta.classList.add("hidden");
  if (landingHome) landingHome.classList.add("hidden");
});

function isCompactAccordionLayout() {
  return window.matchMedia("(max-width: 800px)").matches;
}

function isCompactPartyLayout() {
  return window.matchMedia("(max-width: 1099px)").matches;
}

function setAccordionState(toggleButton, body, isOpen = false) {
  if (!toggleButton || !body) return;
  const open = isCompactAccordionLayout() ? !!isOpen : true;
  body.classList.toggle("is-open", open);
  toggleButton.setAttribute("aria-expanded", open ? "true" : "false");
}

function syncGMFilterToggleState() {
  const hasActiveFilter = String(state.gmFilter || "all").toLowerCase() !== "all";
  const isOpen = !gmFilterRow?.classList.contains("hidden");
  if (btnToggleFilters) {
    btnToggleFilters.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
  filterActiveBadge?.classList.toggle("hidden", !hasActiveFilter);
}

function applyGMFilterSelection(chip, handouts = state.gmHandoutsRaw) {
  if (!(chip instanceof HTMLElement) || !gmFilterRow) return;
  const filter = chip.dataset.filter || "all";
  state.gmFilter = filter;
  gmFilterRow.querySelectorAll(".chip").forEach((button) => button.classList.remove("chip--active"));
  chip.classList.add("chip--active");
  syncGMFilterToggleState();
  renderGMHandouts(handouts || []);
}

function openCreateHandoutModal(options = {}) {
  const {
    ensureDashboard = false,
    collapseAppearance = false,
    restoreDraftValues = false,
    resetImageFrameState = false,
    renderSuggestions = false,
  } = options;

  if (ensureDashboard && currentScreenKey !== SCREEN_KEYS.GM_DASH) {
    showOnly(SCREEN_KEYS.GM_DASH);
  }

  syncCreateTypeDependentUI();
  createClaimableDraft = false;
  createRevealDraft = false;
  pendingHandoutImageUrl = null;
  pendingHandoutNugget = false;
  if (resetImageFrameState) resetCreateImageFrame();
  if (handoutImageStatus) handoutImageStatus.textContent = "";
  if (handoutImageUpload) handoutImageUpload.value = "";
  if (restoreDraftValues) restoreCreateDraft();
  syncCreateTypeDependentUI();
  syncCreateRevealButton();
  syncCreateClaimableButton();
  if (collapseAppearance) setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
  setImagePickerOpen(false);
  if (renderSuggestions) renderIconSuggestions();
  animateModalIn(createHandoutModal);
}

function openInventoryScreen() {
  showOnly(SCREEN_KEYS.PLAYER_INVENTORY);
  renderInventoryScreen();
}

function openNotesScreen() {
  showOnly(SCREEN_KEYS.NOTES);
  state.notes.autoSave = localStorage.getItem(getNotesAutoSaveKey()) === "1";
  renderNotesFilterState();
  setNotesEditorOpen(false);
  closeNotesMorePopover();
  closeNotesConfirmModal();
  loadNotesForCurrentSession();
}

function getChatCollectionRef() {
  const sid = String(state.sessionId || "").trim();
  if (!sid) return null;
  return collection(db, FIREBASE_PATHS.SESSIONS, sid, FIREBASE_PATHS.CHAT_MESSAGES);
}

function normalizeChatMessageRecord(record, fallbackId = "") {
  if (!record || typeof record !== "object") return null;
  const id = String(record.id || fallbackId || "").trim();
  if (!id) return null;
  return {
    id,
    uid: String(record.uid || "").trim(),
    displayName: String(record.displayName || "Adventurer").trim().slice(0, 60) || "Adventurer",
    avatarUrl: String(record.avatarUrl || "").trim(),
    message: String(record.message || "").slice(0, LIMITS.CHAT_MESSAGE_MAX),
    createdAt: record.createdAt || null,
    expireAt: record.expireAt || null,
  };
}

function sortChatMessagesAsc(messages) {
  return [...(messages || [])].sort((left, right) => {
    const delta = toMillisSafe(left?.createdAt) - toMillisSafe(right?.createdAt);
    if (delta !== 0) return delta;
    return String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

function formatChatTimestamp(value) {
  const millis = toMillisSafe(value);
  if (!millis) return "Sending...";
  return formatLastSeenDate(new Date(millis));
}

function isSameChatAuthor(left, right) {
  return !!left && !!right && String(left.uid || "") === String(right.uid || "");
}

function isNearChatBottom() {
  if (!chatList) return true;
  return (chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight) < 96;
}

function updateChatScrollIntent() {
  state.chat.shouldAutoScroll = isNearChatBottom();
  syncChatScrollState();
}

function syncChatScrollState() {
  if (!chatList) return;
  const maxScrollTop = Math.max(0, chatList.scrollHeight - chatList.clientHeight);
  const canScroll = maxScrollTop > 8;
  const atTop = chatList.scrollTop <= 8;
  const atBottom = (maxScrollTop - chatList.scrollTop) <= 56;
  chatList.classList.toggle("chatList--can-up", canScroll && !atTop);
  chatList.classList.toggle("chatList--can-down", canScroll && !atBottom);
  btnChatJumpLatest?.classList.toggle("hidden", !canScroll || atBottom);
}

function setChatEmptyState(title, hint) {
  if (!chatEmpty) return;
  chatEmpty.classList.remove("hidden");
  chatEmpty.querySelector(".emptyState__title")?.replaceChildren(document.createTextNode(title));
  chatEmpty.querySelector(".emptyState__hint")?.replaceChildren(document.createTextNode(hint));
}

function renderMiniChatPreview(panel, statusNode, listNode, emptyNode, roleKey, options = {}) {
  if (!panel || !statusNode || !listNode || !emptyNode) return;
  const compactStatus = !!options.compactStatus;
  const roleMatches = !roleKey || state.role === roleKey;
  const canShow = roleMatches && !!state.sessionId;
  panel.classList.toggle("hidden", !canShow);
  if (!canShow) return;

  const messages = sortChatMessagesAsc(state.chat.messages || []);
  listNode.innerHTML = "";
  emptyNode.classList.add("hidden");
  statusNode.classList.remove("hidden");

  if (state.chat.isLoading && messages.length === 0) {
    statusNode.textContent = "Loading recent chat...";
    emptyNode.classList.remove("hidden");
    return;
  }

  if (state.chat.error && messages.length === 0) {
    statusNode.textContent = "Could not load chat preview.";
    emptyNode.classList.remove("hidden");
    return;
  }

  if (messages.length === 0) {
    statusNode.textContent = "No messages yet.";
    emptyNode.classList.remove("hidden");
    return;
  }

  const latestMessages = messages.slice(-4);
  const fragment = document.createDocumentFragment();
  latestMessages.forEach((entry) => {
    const row = document.createElement("article");
    row.className = `gmMiniChatPanel__row${entry.uid && entry.uid === state.uid ? " gmMiniChatPanel__row--self" : ""}`;
    const avatarSrc = resolveDisplayAvatar(entry.avatarUrl, entry.uid);
    const preview = String(entry.message || "").replace(/\s+/g, " ").trim();
    const clipped = preview.length > 96 ? `${preview.slice(0, 96)}...` : preview;
    row.innerHTML = `
      <div class="gmMiniChatPanel__avatarWrap">
        <img class="gmMiniChatPanel__avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(entry.displayName || "Adventurer")} avatar">
      </div>
      <div class="gmMiniChatPanel__body">
        <div class="gmMiniChatPanel__rowMeta">
          <strong class="gmMiniChatPanel__name">${escapeHtml(entry.displayName || "Adventurer")}</strong>
          <span class="gmMiniChatPanel__time">${escapeHtml(formatChatTimestamp(entry.createdAt))}</span>
        </div>
        <p class="gmMiniChatPanel__text">${escapeHtml(clipped || "(empty)")}</p>
      </div>
    `;
    fragment.appendChild(row);
  });
  listNode.appendChild(fragment);

  if (state.chat.fromCache && state.chat.hasServerSnapshot) {
    statusNode.textContent = "Showing last server-confirmed messages.";
  } else {
    statusNode.textContent = `Latest ${latestMessages.length} message${latestMessages.length === 1 ? "" : "s"}.`;
    statusNode.classList.toggle("hidden", compactStatus);
  }
}

function renderGMMiniChatPreview() {
  renderMiniChatPreview(gmMiniChatPanel, gmMiniChatStatus, gmMiniChatList, gmMiniChatEmpty, "dm");
  const hasGMChatSession = state.role === "dm" && !!state.sessionId;
  const chatCount = hasGMChatSession ? (state.chat.messages || []).length : 0;
  updateRailBadge(gmChatBadge, chatCount);
  gmTabChat?.classList.toggle("railTabs__tab--notify", chatCount > 0 && state.gmActiveRailTab !== "chat");
  if (isWideGMDashboard() && gmRailTabs) {
    switchRailTab(gmRailTabs, state.gmActiveRailTab || "party", "gmActiveRailTab");
  } else {
    gmPartyPanel?.classList.toggle("hidden", false);
    gmMiniChatPanel?.classList.toggle("hidden", !(state.role === "dm" && !!state.sessionId));
  }
}

function renderPlayerMiniChatPreview() {
  // No role check — this panel is scoped inside #screenPlayerView (players only).
  // Only suppress it when there is no active session.
  if (!playerMiniChatPanel) return;
  const hasSession = !!state.sessionId;
  if (!hasSession) {
    updateRailBadge(plChatBadge, 0);
    plTabChat?.classList.remove("railTabs__tab--notify");
  }
  if (!isWideGMDashboard()) {
    playerMiniChatPanel.classList.toggle("hidden", !hasSession);
    playerPartyPanel?.classList.toggle("hidden", false);
  }
  if (!hasSession) return;
  renderMiniChatPreview(playerMiniChatPanel, playerMiniChatStatus, playerMiniChatList, playerMiniChatEmpty, null, { compactStatus: true });
  const chatCount = (state.chat.messages || []).length;
  updateRailBadge(plChatBadge, chatCount);
  plTabChat?.classList.toggle("railTabs__tab--notify", chatCount > 0 && state.plActiveRailTab !== "chat");
  if (isWideGMDashboard() && plRailTabs) {
    switchRailTab(plRailTabs, state.plActiveRailTab || "party", "plActiveRailTab");
  }
}

// Called whenever the player view screen becomes visible so the panel
// shows/hides correctly without waiting for the chat subscription cycle.
function syncPlayerMiniChatPanel() {
  renderPlayerMiniChatPreview();
}

function syncChatComposerState() {
  const hasSession = !!state.sessionId;
  const trimmed = String(chatInput?.value || "").trim();
  if (chatInput) chatInput.disabled = !hasSession || state.chat.isSending || state.chat.isClearing;
  if (btnChatSend) btnChatSend.disabled = !hasSession || state.chat.isSending || state.chat.isClearing || !trimmed;
  if (btnChatJumpLatest) btnChatJumpLatest.disabled = !hasSession || state.chat.isClearing;
  if (btnChatExport) btnChatExport.disabled = !hasSession || state.chat.isClearing;
  if (btnChatClear) btnChatClear.disabled = !hasSession || state.chat.isClearing;
}

function renderChatScreen() {
  if (!chatList || !chatEmpty || !chatStatus) return;
  renderGMMiniChatPreview();
  renderPlayerMiniChatPreview();
  const messages = sortChatMessagesAsc(state.chat.messages || []);
  const isGM = state.role === "dm";
  const shouldStickToBottom = state.chat.shouldAutoScroll || currentScreenKey === SCREEN_KEYS.CHAT;

  btnChatExport?.classList.toggle("hidden", !isGM || !state.sessionId);
  btnChatClear?.classList.toggle("hidden", !isGM || !state.sessionId);
  if (chatRetentionNote) {
    chatRetentionNote.textContent = "Messages are visible to everyone in this session, written under your signed-in account, and automatically removed after 30 days.";
  }

  chatList.innerHTML = "";
  chatEmpty.classList.add("hidden");

  if (state.chat.isLoading && messages.length === 0) {
    setChatEmptyState("Loading messages", "Fetching the latest party conversation.");
    chatStatus.textContent = "Loading messages...";
    syncChatScrollState();
    syncChatComposerState();
    return;
  }

  if (state.chat.error && messages.length === 0) {
    setChatEmptyState("Could not load chat", "Check your connection and try opening the chat again.");
    chatStatus.textContent = state.chat.error;
    syncChatScrollState();
    syncChatComposerState();
    return;
  }

  if (messages.length === 0) {
    setChatEmptyState("No messages yet", "Use this room to discuss the session, recap clues, or coordinate the next step.");
    chatStatus.textContent = state.chat.isSending ? "Sending message..." : "Start the party conversation.";
    syncChatScrollState();
    syncChatComposerState();
    return;
  }

  const fragment = document.createDocumentFragment();
  messages.forEach((entry, index) => {
    const prev = messages[index - 1] || null;
    const isGrouped = isSameChatAuthor(prev, entry);
    const card = document.createElement("article");
    card.className = `chatMessage${entry.uid && entry.uid === state.uid ? " chatMessage--self" : ""}${isGrouped ? " chatMessage--grouped" : ""}`;
    const avatarSrc = resolveDisplayAvatar(entry.avatarUrl, entry.uid);
    const safeMessage = escapeHtml(entry.message).replace(/\n/g, "<br>");
    card.innerHTML = `
      <div class="chatMessage__avatarWrap">
        <img class="chatMessage__avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(entry.displayName)} avatar">
      </div>
      <div class="chatMessage__body">
        <div class="chatMessage__meta">
          <strong class="chatMessage__name">${escapeHtml(entry.displayName)}</strong>
          <span class="chatMessage__time">${escapeHtml(formatChatTimestamp(entry.createdAt))}</span>
        </div>
        <p class="chatMessage__text">${safeMessage}</p>
      </div>
    `;
    fragment.appendChild(card);
  });
  chatList.appendChild(fragment);

  if (state.chat.error) {
    chatStatus.textContent = state.chat.error;
  } else if (state.chat.isClearing) {
    chatStatus.textContent = "Clearing chat...";
  } else if (state.chat.isSending) {
    chatStatus.textContent = "Sending message...";
  } else if (state.chat.isLoading && !state.chat.hasServerSnapshot) {
    chatStatus.textContent = "Connecting to live chat...";
  } else if (state.chat.fromCache && state.chat.hasServerSnapshot) {
    chatStatus.textContent = "Connection interrupted. Showing the last server-confirmed chat state.";
  } else {
    chatStatus.textContent = `Live sync active. ${messages.length} message${messages.length === 1 ? "" : "s"} loaded.`;
  }

  syncChatComposerState();
  if (shouldStickToBottom || currentScreenKey === SCREEN_KEYS.CHAT) {
    requestAnimationFrame(() => {
      if (chatList) chatList.scrollTop = chatList.scrollHeight;
      syncChatScrollState();
    });
  } else {
    syncChatScrollState();
  }
}

function subscribePartyChat(force = false) {
  const chatRef = getChatCollectionRef();
  if (!chatRef || !state.sessionId) return;
  if (!force && state.chat.sessionId === state.sessionId && state.unsubChat) {
    renderChatScreen();
    return;
  }
  if (state.unsubChat) state.unsubChat();
  state.chat.sessionId = state.sessionId;
  const subscribedSessionId = state.sessionId;
  state.chat.messages = [];
  state.chat.isLoading = true;
  state.chat.isClearing = false;
  state.chat.hasServerSnapshot = false;
  state.chat.fromCache = false;
  state.chat.error = "";
  renderChatScreen();
  const chatQuery = query(chatRef, orderBy("createdAt", "desc"), limit(CHAT_INITIAL_LIMIT));
  state.unsubChat = onSnapshot(chatQuery, { includeMetadataChanges: true }, (snap) => {
    if (state.chat.sessionId !== subscribedSessionId) return;
    const isFromCache = !!snap.metadata?.fromCache;
    if (!state.chat.hasServerSnapshot && isFromCache) return;
    state.chat.messages = sortChatMessagesAsc(
      snap.docs
        .map((docSnap) => normalizeChatMessageRecord({ id: docSnap.id, ...docSnap.data() }, docSnap.id))
        .filter(Boolean)
    );
    state.chat.isLoading = false;
    state.chat.fromCache = isFromCache;
    state.chat.hasServerSnapshot = state.chat.hasServerSnapshot || !isFromCache;
    state.chat.error = "";
    renderChatScreen();
  }, (err) => {
    if (state.chat.sessionId !== subscribedSessionId) return;
    console.warn("Party chat listener error:", err);
    state.chat.isLoading = false;
    state.chat.error = "Failed to load chat.";
    renderChatScreen();
  });
  getDocsFromServer(chatQuery).then((snap) => {
    if (state.chat.sessionId !== subscribedSessionId) return;
    state.chat.messages = sortChatMessagesAsc(
      snap.docs
        .map((docSnap) => normalizeChatMessageRecord({ id: docSnap.id, ...docSnap.data() }, docSnap.id))
        .filter(Boolean)
    );
    state.chat.isLoading = false;
    state.chat.fromCache = false;
    state.chat.hasServerSnapshot = true;
    state.chat.error = "";
    renderChatScreen();
  }).catch(() => {
    // Keep the realtime listener active; it will render once the server responds.
  });
}

async function sendPartyChatMessage() {
  const chatRef = getChatCollectionRef();
  const text = String(chatInput?.value || "").trim().slice(0, LIMITS.CHAT_MESSAGE_MAX);
  if (!chatRef || !text || state.chat.isSending || state.chat.isClearing || !state.uid) return;
  state.chat.isSending = true;
  state.chat.error = "";
  state.chat.shouldAutoScroll = true;
  renderChatScreen();
  try {
    const profile = await loadUserProfile(state.uid).catch(() => null);
    const displayName = String(state.displayName || profile?.displayName || state.playerNick || "Adventurer").trim().slice(0, 60) || "Adventurer";
    const avatarUrl = String(profile?.avatarUrl || "").trim();
    await addDoc(chatRef, {
      uid: state.uid,
      displayName,
      avatarUrl,
      message: text,
      createdAt: serverTimestamp(),
      expireAt: new Date(Date.now() + CHAT_RETENTION_MS),
    });
    if (chatInput) chatInput.value = "";
    await waitForPendingWrites(db);
    state.chat.isSending = false;
    state.chat.error = "";
    renderChatScreen();
  } catch (err) {
    console.error("sendPartyChatMessage:", err);
    state.chat.isSending = false;
    state.chat.error = "Could not send message.";
    renderChatScreen();
    showToast("Could not send message.", "error");
  }
}

async function clearPartyChat() {
  if (state.role !== "dm" || !state.sessionId || state.chat.isClearing) return;
  const chatRef = getChatCollectionRef();
  if (!chatRef) return;
  const confirmed = window.confirm("Clear all messages from this session chat? This cannot be undone.");
  if (!confirmed) return;
  state.chat.isClearing = true;
  state.chat.error = "";
  renderChatScreen();
  try {
    while (true) {
      const snap = await getDocs(query(chatRef, limit(200)));
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      if (snap.size < 200) break;
    }
    state.chat.messages = [];
    state.chat.isClearing = false;
    state.chat.shouldAutoScroll = true;
    renderChatScreen();
    showToast("Chat cleared.", "success");
  } catch (err) {
    console.error("clearPartyChat:", err);
    state.chat.isClearing = false;
    state.chat.error = "Could not clear chat.";
    renderChatScreen();
    showToast("Could not clear chat.", "error");
  }
}

function buildChatExportPayload(messages) {
  const safeSession = String(state.sessionName || state.joinTag || state.sessionId || "session").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ");
  const content = [
    `TomeVault Party Chat`,
    `Session: ${String(state.sessionName || state.joinTag || state.sessionId || "Session").trim() || "Session"}`,
    `Exported: ${formatChatTimestamp(new Date())}`,
    `Retention: 30 days`,
    "",
    ...messages.map((entry) => `[${formatChatTimestamp(entry.createdAt)}] ${entry.displayName}: ${String(entry.message || "")}`),
  ].join("\n");
  return {
    fileName: `${safeSession || "session"}-party-chat.txt`,
    content,
  };
}

async function exportPartyChat() {
  if (state.role !== "dm" || !state.sessionId) return;
  const chatRef = getChatCollectionRef();
  if (!chatRef) return;
  try {
    chatStatus.textContent = "Exporting chat...";
    const snap = await getDocs(query(chatRef, orderBy("createdAt", "asc")));
    const messages = snap.docs
      .map((docSnap) => normalizeChatMessageRecord({ id: docSnap.id, ...docSnap.data() }, docSnap.id))
      .filter(Boolean);
    const payload = buildChatExportPayload(messages);
    const blob = new Blob([payload.content], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = payload.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), 0);
    chatStatus.textContent = "Chat exported.";
    showToast("Chat exported.", "success");
  } catch (err) {
    console.error("exportPartyChat:", err);
    chatStatus.textContent = "Could not export chat.";
    showToast("Could not export chat.", "error");
  }
}

function openChatScreen() {
  showOnly(SCREEN_KEYS.CHAT);
  subscribePartyChat();
  renderChatScreen();
}

function openHandoutsHomeScreen() {
  const target = state.role === "dm" ? SCREEN_KEYS.GM_DASH : SCREEN_KEYS.PLAYER_VIEW;
  showOnly(target);
  // Ensure social mode is closed so the handouts panel is visible.
  if (target === SCREEN_KEYS.GM_DASH) setGMSocialMode(false);
}

function setPartyPanelCollapsed(panel, toggleButton, collapsed) {
  if (!panel || !toggleButton) return;
  const isCollapsed = isCompactPartyLayout() ? !!collapsed : false;
  panel.classList.toggle("is-collapsed", isCollapsed);
  toggleButton.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
}

function setPlayerHandoutsCollapsed(collapsed) {
  const isCollapsed = !!collapsed;
  if (playerHandoutsPanel) playerHandoutsPanel.classList.toggle("is-collapsed", isCollapsed);
  if (playerHandoutsMain) playerHandoutsMain.classList.toggle("hidden", isCollapsed);
  if (btnTogglePlayerHandouts) {
    btnTogglePlayerHandouts.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    btnTogglePlayerHandouts.setAttribute("aria-label", isCollapsed ? "Expand handouts section" : "Collapse handouts section");
    btnTogglePlayerHandouts.title = isCollapsed ? "Expand handouts section" : "Collapse handouts section";
    btnTogglePlayerHandouts.classList.toggle("is-collapsed", isCollapsed);
  }
}

function syncResponsivePanelState() {
  setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
  setPartyPanelCollapsed(gmPartyPanel, btnCollapseParty, gmPartyPanel?.classList.contains("is-collapsed") ?? isCompactPartyLayout());
  setPartyPanelCollapsed(playerPartyPanel, btnCollapsePlayerParty, playerPartyPanel?.classList.contains("is-collapsed") ?? isCompactPartyLayout());
  syncGMFilterToggleState();
}

// Early fallback wiring for GM dashboard controls.
// This ensures key controls still respond even if a later script section aborts.
function wireDashboardFallbackControls() {
  gmFilterRow?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const chip = target.closest(".chip");
    if (!(chip instanceof HTMLElement)) return;
    applyGMFilterSelection(chip, state.gmHandoutsRaw || []);
  });

  // Social button is handled by the role-aware listener registered later.

  // Ambience button is handled by the role-aware listener registered later.

  btnOpenCreateHandout && (btnOpenCreateHandout.onclick = () => {
    if (btnOpenCreateHandout.disabled) return;
    openCreateHandoutModal({
      ensureDashboard: true,
      collapseAppearance: true,
      renderSuggestions: true,
    });
  });

  btnOpenInventory && (btnOpenInventory.onclick = () => {
    if (btnOpenInventory.disabled) return;
    openInventoryScreen();
  });

  btnOpenNotes && (btnOpenNotes.onclick = () => {
    if (btnOpenNotes.disabled) return;
    openNotesScreen();
  });

  btnOpenHandouts && (btnOpenHandouts.onclick = () => {
    openHandoutsHomeScreen();
  });
}

// ================================================================
// ZONE: SESSION & CONTENT RUNTIME
// Purpose: session lifecycle, handouts, party, inventory, ambience, and modals.
// ================================================================

wireDashboardFallbackControls();

chatList?.addEventListener("scroll", () => {
  updateChatScrollIntent();
});

btnChatJumpLatest?.addEventListener("click", () => {
  if (!chatList) return;
  state.chat.shouldAutoScroll = true;
  chatList.scrollTo({ top: chatList.scrollHeight, behavior: "smooth" });
  syncChatScrollState();
});

btnOpenChatFromMini?.addEventListener("click", () => {
  openChatScreen();
});

btnPlayerOpenChatFromMini?.addEventListener("click", () => {
  openChatScreen();
});

playerMiniChatPanel?.addEventListener("click", (event) => {
  if (event.target.closest("button, a, input, textarea, [role='button']")) return;
  openChatScreen();
});

btnPlayerOpenChatFromParty?.addEventListener("click", () => {
  openChatScreen();
});

// ---- Rail tab click handlers (desktop tabbed sidebar) ----
gmRailTabs?.querySelector(".railTabs__bar")?.addEventListener("click", (e) => {
  const tab = e.target.closest(".railTabs__tab");
  if (!tab || !isWideGMDashboard()) return;
  switchRailTab(gmRailTabs, tab.dataset.tab, "gmActiveRailTab");
});
plRailTabs?.querySelector(".railTabs__bar")?.addEventListener("click", (e) => {
  const tab = e.target.closest(".railTabs__tab");
  if (!tab || !isWideGMDashboard()) return;
  switchRailTab(plRailTabs, tab.dataset.tab, "plActiveRailTab");
});

btnChatBack?.addEventListener("click", () => {
  openHandoutsHomeScreen();
});

btnChatClear?.addEventListener("click", () => {
  clearPartyChat();
});

btnChatExport?.addEventListener("click", () => {
  exportPartyChat();
});

chatInput?.addEventListener("input", () => {
  syncChatComposerState();
});

chatInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  sendPartyChatMessage();
});

btnChatSend?.addEventListener("click", () => {
  sendPartyChatMessage();
});

// ---- New navigation wiring ----

// Brand home button in top bar ? navigate to session home
btnBrandHome && (btnBrandHome.onclick = () => {
  showOnly(getDefaultRoleScreen());
});

// Hamburger quick menu: click/tap toggles the dial, mouse drag repositions it,
// and touch retains the existing hold-to-drag behavior.
if (btnHamburger) {
  syncHamburgerQuickActions();

  function clearHamburgerDragTimer() {
    if (!hamburgerDragState?.holdTimer) return;
    clearTimeout(hamburgerDragState.holdTimer);
    hamburgerDragState.holdTimer = 0;
  }

  function startHamburgerDrag(state, event) {
    if (!state || state.dragging || !hamburgerDragEnabled) return;
    state.dragging = true;
    state.didDrag = true;
    btnHamburger.classList.add("is-dragging");
    btnHamburger.setPointerCapture?.(event.pointerId);
    closeHamburgerSpeedDial();
    if (state.pointerType !== "mouse") {
      navigator.vibrate?.(50);
      showToast("Drag to reposition", "info", UI_TIMERS.FAB_DRAG_TOAST_MS);
    }
  }

  function resetHamburgerDragState(pointerId, options = {}) {
    if (!hamburgerDragState || (pointerId != null && hamburgerDragState.pointerId !== pointerId)) return;
    clearHamburgerDragTimer();
    const wasDragging = hamburgerDragState.dragging;
    if (wasDragging) {
      btnHamburger.classList.remove("is-dragging");
      applyHamburgerPosition(getHamburgerCurrentPosition(), { persist: true });
    }
    if (pointerId != null) {
      btnHamburger.releasePointerCapture?.(pointerId);
    }
    const shouldToggle = !!options.toggleSpeedDial && !wasDragging && !hamburgerDragState.didDrag;
    hamburgerDragState = null;
    if (shouldToggle) toggleHamburgerSpeedDial();
  }

  function handleHamburgerPointerDown(event) {
    if (!hamburgerDragEnabled) return;
    if (event.button != null && event.button !== 0) return;
    hamburgerDragState = {
      pointerId: event.pointerId,
      pointerType: event.pointerType || "mouse",
      startX: event.clientX,
      startY: event.clientY,
      origin: getHamburgerCurrentPosition(),
      holdTimer: 0,
      dragging: false,
      didDrag: false,
    };
    if (hamburgerDragState.pointerType !== "mouse") {
      hamburgerDragState.holdTimer = setTimeout(() => {
        if (!hamburgerDragState || hamburgerDragState.pointerId !== event.pointerId) return;
        startHamburgerDrag(hamburgerDragState, event);
      }, UI_TIMERS.FAB_HOLD_MS);
    }
  }

  function handleHamburgerPointerMove(event) {
    if (!hamburgerDragState || hamburgerDragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - hamburgerDragState.startX;
    const dy = event.clientY - hamburgerDragState.startY;

    if (!hamburgerDragState.dragging) {
      if (hamburgerDragState.pointerType === "mouse") {
        if (Math.abs(dx) >= HAMBURGER_MOUSE_DRAG_THRESHOLD || Math.abs(dy) >= HAMBURGER_MOUSE_DRAG_THRESHOLD) {
          startHamburgerDrag(hamburgerDragState, event);
        }
      } else if (Math.abs(dx) > HAMBURGER_TOUCH_CANCEL_THRESHOLD || Math.abs(dy) > HAMBURGER_TOUCH_CANCEL_THRESHOLD) {
        clearHamburgerDragTimer();
      }
      if (!hamburgerDragState.dragging) return;
    }

    event.preventDefault();
    applyHamburgerPosition({
      right: hamburgerDragState.origin.right - dx,
      bottom: hamburgerDragState.origin.bottom - dy,
    });
  }

  function handleHamburgerPointerUp(event) {
    if (!hamburgerDragState || hamburgerDragState.pointerId !== event.pointerId) return;
    resetHamburgerDragState(event.pointerId, { toggleSpeedDial: true });
  }

  function handleHamburgerPointerCancel(event) {
    resetHamburgerDragState(event.pointerId, { toggleSpeedDial: false });
  }

  loadHamburgerPosition();
  btnHamburger.addEventListener("dragstart", (event) => event.preventDefault());
  btnHamburger.addEventListener("pointerdown", handleHamburgerPointerDown);
  btnHamburger.addEventListener("pointermove", handleHamburgerPointerMove);
  btnHamburger.addEventListener("pointerup", handleHamburgerPointerUp);
  btnHamburger.addEventListener("pointercancel", handleHamburgerPointerCancel);
  btnHamburger.addEventListener("lostpointercapture", handleHamburgerPointerCancel);
  window.addEventListener("resize", () => {
    if (hamburgerDragState?.dragging) return;
    applyHamburgerPosition(getHamburgerCurrentPosition());
  });
}

// Settings drawer backdrop click closes
settingsDrawerBackdrop && (settingsDrawerBackdrop.onclick = () => {
  closeSettingsDrawer();
});

btnDialSettings && (btnDialSettings.onclick = () => {
  closeHamburgerSpeedDial();
  openSettingsDrawer();
});

btnDialHandouts && (btnDialHandouts.onclick = () => {
  closeHamburgerSpeedDial();
  btnOpenHandouts?.click();
});

btnDialSocial && (btnDialSocial.onclick = () => {
  closeHamburgerSpeedDial();
  btnToggleSocial?.click();
});

btnDialAtmosphere && (btnDialAtmosphere.onclick = () => {
  closeHamburgerSpeedDial();
  btnOpenAmbienceBar?.click();
});

btnDialInventory && (btnDialInventory.onclick = () => {
  closeHamburgerSpeedDial();
  btnOpenInventory?.click();
});

btnDialNotes && (btnDialNotes.onclick = () => {
  closeHamburgerSpeedDial();
  btnOpenNotes?.click();
});

// Share invite button in social panel
btnShareInviteSocial && (btnShareInviteSocial.onclick = () => {
  shareSessionInvite();
});

btnOpenAtmospherePanel?.addEventListener("click", () => {
  btnOpenAmbienceBar?.click();
});

window.addEventListener("resize", () => {
  syncResponsivePanelState();
  if (currentScreenKey === SCREEN_KEYS.GM_DASH) syncGMDashboardLayout();
  if (isWideGMDashboard()) {
    if (gmRailTabs) switchRailTab(gmRailTabs, state.gmActiveRailTab || "party", "gmActiveRailTab");
    if (plRailTabs) switchRailTab(plRailTabs, state.plActiveRailTab || "party", "plActiveRailTab");
  } else {
    gmPartyPanel?.classList.remove("hidden");
    playerPartyPanel?.classList.remove("hidden");
    gmMiniChatPanel?.classList.toggle("hidden", !(state.role === "dm" && !!state.sessionId));
    playerMiniChatPanel?.classList.toggle("hidden", !state.sessionId);
  }
});

btnToggleFilters?.addEventListener("click", () => {
  gmFilterRow?.classList.toggle("hidden");
  syncGMFilterToggleState();
});

btnCreateAppearanceToggle?.addEventListener("click", () => {
  if (!isCompactAccordionLayout()) return;
  const nextOpen = btnCreateAppearanceToggle.getAttribute("aria-expanded") !== "true";
  setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, nextOpen);
});

// Dynamic stats panel event delegation
const _statsWrap = document.getElementById("profileQuickStatsWrap");
if (_statsWrap) {
  _statsWrap.addEventListener("click", handleStatsPanelEvent);
  _statsWrap.addEventListener("input", handleStatsPanelEvent);
  _statsWrap.addEventListener("change", handleStatsPanelEvent);
}

// Add Common Stats picker toggle
document.getElementById("btnAddCommonStats")?.addEventListener("click", () => {
  if (!profileEditorIsEditable) return;
  toggleCommonStatsPicker();
});

// Add Custom Stat row
document.getElementById("btnAddCustomStat")?.addEventListener("click", () => {
  if (!profileEditorIsEditable) return;
  dynamicStats.customStats.push({ id: genId(), name: "", value: "" });
  renderAllDynamic();
  // Focus the new name input
  const rows = document.querySelectorAll("#profileCustomStatsSection .statDynamicRow");
  const lastRow = rows[rows.length - 1];
  lastRow?.querySelector(".statDynamicRow__nameInput")?.focus();
});

// Add Bonus row
document.getElementById("btnAddBonus")?.addEventListener("click", () => {
  if (!profileEditorIsEditable) return;
  dynamicStats.bonuses.push({ id: genId(), name: "", value: "+0", appliesTo: [] });
  renderAllDynamic();
  const rows = document.querySelectorAll("#profileBonusesSection .statDynamicRow--bonus");
  const lastRow = rows[rows.length - 1];
  lastRow?.querySelector(".statDynamicRow__nameInput")?.focus();
});

btnCollapseParty?.addEventListener("click", () => {
  const collapsed = !gmPartyPanel?.classList.contains("is-collapsed");
  setPartyPanelCollapsed(gmPartyPanel, btnCollapseParty, collapsed);
});

btnCollapsePlayerParty?.addEventListener("click", () => {
  const collapsed = !playerPartyPanel?.classList.contains("is-collapsed");
  setPartyPanelCollapsed(playerPartyPanel, btnCollapsePlayerParty, collapsed);
});

btnTogglePlayerHandouts?.addEventListener("click", () => {
  const collapsed = !(playerHandoutsMain?.classList.contains("hidden"));
  setPlayerHandoutsCollapsed(collapsed);
});

setPlayerHandoutsCollapsed(false);

syncResponsivePanelState();

// Social toggle in top bar (GM only)
btnTopBarSocial && (btnTopBarSocial.onclick = () => {
  if (currentScreenKey !== SCREEN_KEYS.GM_DASH) {
    showOnly(SCREEN_KEYS.GM_DASH);
    setGMSocialMode(true);
    return;
  }
  const opening = !gmSplit?.classList.contains("social-mode");
  setGMSocialMode(opening);
});

// Profile button in bottom bar
btnOpenProfile && (btnOpenProfile.onclick = () => {
  if (PROFILE_AVATAR_DIAG) {
    logAvatarDiagnostics("btnOpenProfile:before", bottomBarAvatarImg);
  }
  showOnly(SCREEN_KEYS.PROFILE);
  requestAnimationFrame(() => {
    if (PROFILE_AVATAR_DIAG) {
      logAvatarDiagnostics("btnOpenProfile:after-showOnly", bottomBarAvatarImg);
    }
    renderProfileScreen();
  });
});

// GM floating action button � opens create handout modal
gmFab && (gmFab.onclick = () => {
  if (state.role !== "dm") return;
  openCreateHandoutModal({ collapseAppearance: true });
});

// Inline create handout button (replaces floating gmFab)
const btnCreateHandoutInline = $("btnCreateHandoutInline");
if (btnCreateHandoutInline) {
  btnCreateHandoutInline.onclick = () => {
    if (state.role !== "dm") return;
    openCreateHandoutModal({ collapseAppearance: true });
  };
}

// Profile tab bar switching (Stats / Spells)
const profileTabBar = $("profileTabBar");
if (profileTabBar) {
  profileTabBar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-profile-tab]");
    if (!chip) return;
    const tab = chip.dataset.profileTab;
    profileTabBar.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
    chip.classList.add("chip--active");
    const statsPane = $("profileStatsPane");
    const spellsPane = $("profileSpellsPane");
    if (statsPane) statsPane.classList.toggle("hidden", tab !== "stats");
    if (spellsPane) spellsPane.classList.toggle("hidden", tab !== "spells");
  });
}

// Profile edit button ? opens existing settings profile editor
const btnProfileEdit = $("btnProfileEdit");
btnProfileEdit && (btnProfileEdit.onclick = () => {
  openProfileEditor(state.uid, "profile").catch(console.warn);
});

// GM profile buttons
const btnGMProfileEdit = $("btnGMProfileEdit");
btnGMProfileEdit && (btnGMProfileEdit.onclick = () => {
  openProfileEditor(state.uid, "profile").catch(console.warn);
});

// GM: clear own player-mode profile
const btnClearPlayerProfile = $("btnClearPlayerProfile");
btnClearPlayerProfile && (btnClearPlayerProfile.onclick = async () => {
  if (state.role !== "dm" || !state.uid) return;
  const confirmed = window.confirm("Remove your player profile? This deletes your player-mode display name, bio, avatar, and stats. Your GM profile is not affected.");
  if (!confirmed) return;
  try {
    await updateDoc(doc(db, "users", state.uid), {
      "roleProfiles.player": deleteField(),
      updatedAt: serverTimestamp(),
    });
    // Evict cache so the profile screen re-reads from Firestore
    profileCache.delete(profileCacheKey(state.uid, "player"));
    renderProfileScreen().catch(() => {});
    showToast("Player profile cleared.", "success");
  } catch (err) {
    console.error("Clear player profile failed:", err);
    showToast("Failed to clear player profile.", "error");
  }
});

// GM campaign notes button
const btnGMProfileNotes = $("btnGMProfileNotes");
btnGMProfileNotes && (btnGMProfileNotes.onclick = () => {
  showOnly(SCREEN_KEYS.NOTES);
  loadNotesForCurrentSession();
});

// ---- Dynamic session list on landing page ----
// Queries Firestore for sessions owned by or joined by the current user
// and renders them in the "Your sessions" list on the landing screen.
//
// Generation counter: each call captures `thisGen` at the start. Before any DOM
// write we check that no newer call has started since; if one has, this call's
// results are silently discarded. This prevents duplicate cards when two calls
// (e.g. the leave-handler and an auth-state refresh) race each other.
let _mySessionsGen = 0;
async function loadMySessions() {
  if (!landingSessionList) return;
  if (!state.uid) return;

  const thisGen = ++_mySessionsGen;

  // Clear previous entries
  landingSessionList.innerHTML = "";
  if (landingSessionEmpty) landingSessionEmpty.classList.remove("hidden");
  if (landingSessionCount) landingSessionCount.textContent = "";

  try {
    // Query sessions where current user is the GM.
    // Uses only equality filter (no orderBy) to avoid requiring a composite Firestore index.
    // Results are sorted client-side instead.
    const gmQuery = query(
      collection(db, "sessions"),
      where("gmUid", "==", state.uid)
    );
    const gmSnap = await getDocs(gmQuery);

    const sessions = [];

    for (const d of gmSnap.docs) {
      const data = d.data();
      if (isExpiredOneShotSession(data)) {
        await tryDeleteExpiredOneShotSession(d.id, data);
        continue;
      }
      sessions.push({
        id: d.id,
        joinTag: data.joinTag || d.id,
        name: data.name || "Untitled Session",
        role: "GM",
        updatedAt: data.updatedAt,
        createdAt: data.createdAt,
      });
    }

    // Sort client-side: newest first
    sessions.sort((a, b) => {
      const ams = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
      const bms = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
      return bms - ams;
    });

    // Also load sessions the user has joined (via Firestore memberships).
    // Falls back to localStorage for backward compatibility during migration.
    const membershipSessions = [];
    const leftSessions = [];
    try {
      const memberSnap = await getDocs(collection(db, "users", state.uid, "memberships"));
      for (const mDoc of memberSnap.docs) {
        const mData = mDoc.data();
        const mSessionId = mData.sessionId || mDoc.id;
        if (sessions.some(s => s.id === mSessionId)) continue; // already listed as GM
        if (mData.status === "left") {
          leftSessions.push({ ...mData, sessionId: mSessionId, docId: mDoc.id });
          continue;
        }
        try {
          const sessionRef = doc(db, "sessions", mSessionId);
          const snap = await getDoc(sessionRef);
          if (!snap.exists()) continue;
          const data = snap.data() || {};
          if (isExpiredOneShotSession(data)) {
            await tryDeleteExpiredOneShotSession(mSessionId, data);
            continue;
          }
          membershipSessions.push({
            id: mSessionId,
            joinTag: data.joinTag || mData.joinTag || mSessionId,
            name: data.name || mData.sessionName || "Untitled Session",
            role: mData.role === "dm" ? "GM" : "Player",
            updatedAt: data.updatedAt,
            createdAt: data.createdAt,
          });
        } catch {
          // Session might be deleted or inaccessible
        }
      }
    } catch (memberErr) {
      console.warn("Membership query failed, falling back to localStorage:", memberErr);
    }

    // Fallback: also check localStorage entries not yet in memberships
    const joinedEntries = getJoinedSessionEntries();
    const allListedIds = new Set([...sessions.map(s => s.id), ...membershipSessions.map(s => s.id)]);
    for (const entry of joinedEntries) {
      const entrySessionId = String(entry?.sessionId || "").trim();
      if (!entrySessionId || allListedIds.has(entrySessionId)) continue;
      try {
        const sessionRef = doc(db, "sessions", entrySessionId);
        const snap = await getDoc(sessionRef);
        if (!snap.exists()) continue;
        const data = snap.data() || {};
        if (isExpiredOneShotSession(data)) {
          await tryDeleteExpiredOneShotSession(entrySessionId, data);
          continue;
        }
        const playerRef = doc(db, "sessions", entrySessionId, "players", state.uid);
        const psnap = await getDoc(playerRef);
        if (!psnap.exists()) continue;
        membershipSessions.push({
          id: entrySessionId,
          joinTag: data.joinTag || entry.joinTag || entrySessionId,
          name: data.name || entry.sessionName || "Untitled Session",
          role: "Player",
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
        });
        // Migrate to Firestore membership
        const ref = getMembershipRef(state.uid, entrySessionId);
        if (ref) {
          setDoc(ref, {
            sessionId: entrySessionId,
            joinTag: data.joinTag || entry.joinTag || "",
            sessionName: data.name || entry.sessionName || "",
            role: "player",
            status: "active",
            lastSeenAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      } catch {
        // Skip unreachable
      }
    }

    sessions.push(...membershipSessions);

    // Render session cards
    if (sessions.length === 0) {
      if (thisGen !== _mySessionsGen) return;
      if (landingSessionEmpty) landingSessionEmpty.classList.remove("hidden");
      if (landingSessionCount) landingSessionCount.textContent = "";
      return;
    }

    if (landingSessionEmpty) landingSessionEmpty.classList.add("hidden");
    if (landingSessionCount) landingSessionCount.textContent = `${sessions.length} total`;

    // Guard: discard results if a newer call started while we were awaiting Firestore.
    if (thisGen !== _mySessionsGen) return;

    sessions.forEach((s, idx) => {
      s.__idx = idx;
      const dateStr = s.updatedAt?.toDate
        ? s.updatedAt.toDate().toLocaleDateString()
        : s.createdAt?.toDate
          ? s.createdAt.toDate().toLocaleDateString()
          : "";

      const card = document.createElement("div");
      card.className = "landingSessionItem";
      card.className = "landingSessionItem list-stagger-item";
      card.style.setProperty("--stagger-index", String(s.__idx ?? 0));
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open session: ${s.name}`);
      card.dataset.sessionId = s.id;
      card.dataset.joinTag = s.joinTag || s.id;
      card.dataset.sessionRole = s.role.toLowerCase();
      card.innerHTML = `
        <div class="landingSessionItem__left">
          <span class="tagIcon tagIcon--active" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 4H16L19 7V20H7V4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M16 4V7H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M10 11H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
              <path d="M10 14H16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
          </span>
          <div>
            <div class="landingSessionItem__title">${escapeHtml(s.name)}</div>
            <div class="muted small">${escapeHtml(s.role)} · ${escapeHtml(dateStr)}</div>
          </div>
        </div>
        <span class="muted" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;display:block;">
            <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </span>
      `;
      landingSessionList.appendChild(card);
    });

    // Render "Previous Sessions" (left sessions) — with rejoin and remove options
    if (leftSessions.length > 0) {
      const divider = document.createElement("div");
      divider.className = "landingSessionDivider";
      divider.textContent = "Previous Sessions";
      landingSessionList.appendChild(divider);

      leftSessions.forEach((ls, idx) => {
        const card = document.createElement("div");
        card.className = "landingSessionItem landingSessionItem--left list-stagger-item";
        card.style.setProperty("--stagger-index", String(sessions.length + idx));
        card.setAttribute("role", "group");
        card.setAttribute("aria-label", `Left session: ${ls.sessionName || "Untitled"}`);
        card.innerHTML = `
          <div class="landingSessionItem__left">
            <span class="tagIcon tagIcon--muted" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 4H16L19 7V20H7V4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </span>
            <div>
              <div class="landingSessionItem__title muted">${escapeHtml(ls.sessionName || "Untitled Session")}</div>
              <div class="muted small">${escapeHtml(ls.role || "Player")} · Left</div>
            </div>
          </div>
          <div class="landingSessionItem__actions">
            <button class="btn btn--small btn--secondary js-rejoin-left" data-session-id="${escapeHtml(ls.sessionId)}" data-join-tag="${escapeHtml(ls.joinTag || "")}">Rejoin</button>
            <button class="btn btn--small btn--ghost js-remove-left" data-membership-id="${escapeHtml(ls.docId)}" aria-label="Remove from list">&times;</button>
          </div>
        `;
        landingSessionList.appendChild(card);
      });
    }
  } catch (e) {
    if (thisGen !== _mySessionsGen) return;
    console.warn("Could not load sessions list:", e);
    if (landingSessionEmpty) {
      const hintEl = landingSessionEmpty.querySelector(".emptyState__hint");
      if (hintEl) hintEl.textContent = "Could not load sessions. Check your connection.";
      landingSessionEmpty.classList.remove("hidden");
    }
  }
}

// Delegated click handler for dynamically rendered session cards
if (landingSessionList) {
  const resumeSession = async (sessionId, role, joinTag = "") => {
    if (role === "dm") {
      const ok = await tryResumeGM(sessionId);
      if (ok) return;
    }
    const playerOk = await tryResumePlayer(sessionId);
    if (playerOk) return;
    // Fallback: open join screen with session tag prefilled
    if (plSessionId) plSessionId.value = joinTag || sessionId;
    const rememberedPin = getRememberedJoinedSessionPin(sessionId);
    if (plPin && rememberedPin) plPin.value = rememberedPin;
    state.role = "player";
    showOnly(SCREEN_KEYS.PL_JOIN);
  };

  landingSessionList.addEventListener("click", (e) => {
    // Handle "Remove from list" on left sessions
    const removeBtn = e.target.closest(".js-remove-left");
    if (removeBtn) {
      e.stopPropagation();
      const membershipId = removeBtn.dataset.membershipId;
      if (membershipId && state.uid) {
        deleteDoc(doc(db, "users", state.uid, "memberships", membershipId))
          .then(() => {
            removeBtn.closest(".landingSessionItem")?.remove();
            showToast("Removed from list.", "info");
          })
          .catch(() => showToast("Could not remove.", "error"));
      }
      return;
    }
    // Handle "Rejoin" on left sessions
    const rejoinBtn = e.target.closest(".js-rejoin-left");
    if (rejoinBtn) {
      e.stopPropagation();
      const joinTag = rejoinBtn.dataset.joinTag || "";
      const sessionId = rejoinBtn.dataset.sessionId || "";
      if (plSessionId) plSessionId.value = joinTag || sessionId;
      state.role = "player";
      showOnly(SCREEN_KEYS.PL_JOIN);
      return;
    }
    // Normal session resume
    const card = e.target.closest(".landingSessionItem");
    if (!card) return;
    const sessionId = card.dataset.sessionId;
    const joinTag = card.dataset.joinTag || "";
    const sessionRole = card.dataset.sessionRole || "dm";
    if (!sessionId) return;
    resumeSession(sessionId, sessionRole, joinTag).catch((err) => {
      console.error("Session resume failed:", err);
      showToast("Could not open session.", "error");
    });
  });

  landingSessionList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".landingSessionItem");
    if (!card) return;
    e.preventDefault();
    const sessionId = card.dataset.sessionId;
    const joinTag = card.dataset.joinTag || "";
    const sessionRole = card.dataset.sessionRole || "dm";
    if (!sessionId) return;
    resumeSession(sessionId, sessionRole, joinTag).catch((err) => {
      console.error("Session resume failed:", err);
      showToast("Could not open session.", "error");
    });
  });
}

btnGMBack && (btnGMBack.onclick = () => { showOnly(SCREEN_KEYS.LANDING); loadMySessions(); });

btnPlayerBack && (btnPlayerBack.onclick = async () => {
  // If scanner is active, stop it before leaving screen.
  await stopScan();
  showOnly(SCREEN_KEYS.LANDING);
});

btnInventoryBack && (btnInventoryBack.onclick = () => {
  const backScreen = state.role === "dm" ? "gmDash" : "plView";
  showOnly(backScreen);
});

btnOpenSettings && (btnOpenSettings.onclick = async () => {
  // Open the slide-in settings drawer (not a full screen navigation)
  openSettingsDrawer();

  // Refresh trial status
  const trialStatus = $("trialStatus");
  const trialText = $("trialText");
  if (trialStatus && trialText && state.isSignedIn) {
    await checkTrialStatus();
    const text = getTrialText();
    if (text) {
      trialText.textContent = text;
      trialStatus.classList.remove("hidden");
    } else {
      trialStatus.classList.add("hidden");
    }
  } else if (trialStatus) {
    trialStatus.classList.add("hidden");
  }
});

btnOpenProfileSettings && (btnOpenProfileSettings.onclick = () => {
  openProfileEditor(state.uid, "settings").catch((e) => {
    console.error("Open profile settings failed:", e);
    showToast("Could not open Settings.", "error");
  });
});

btnReplayTutorial && (btnReplayTutorial.onclick = async () => {
  if (!state.sessionId) {
    showToast("Join a session first to replay the tutorial.", "info");
    return;
  }
  const roleKey = normalizeProfileRole(state.role || "player");
  localStorage.removeItem(`tv_onboarded:${roleKey}`);
  localStorage.setItem(`tv_onboardingReplay:${roleKey}`, "1");
  showOnly(getDefaultRoleScreen());
  await delayMs(200);
  startOnboarding({ force: true });
});

btnThemeSystem?.addEventListener("click", () => setThemePreference("system"));
btnThemeDark?.addEventListener("click", () => setThemePreference("dark"));
btnThemeLight?.addEventListener("click", () => setThemePreference("light"));

// ---- Nickname prompt (blocking modal) ----
async function syncNicknameToProfile(nickname) {
  const nick = String(nickname || "").trim();
  if (!nick || !state.uid) return;

  try {
    await setDoc(getUserProfileRef(state.uid), {
      displayName: nick,
      roleProfiles: {
        player: {
          displayName: nick,
        },
        dm: {
          displayName: nick,
        },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const cachedPlayer = getCachedProfile(state.uid, "player") || {};
    const cachedDm = getCachedProfile(state.uid, "dm") || {};
    setCachedProfile(state.uid, "player", { ...cachedPlayer, displayName: nick });
    setCachedProfile(state.uid, "dm", { ...cachedDm, displayName: nick });

    if (auth.currentUser && auth.currentUser.uid === state.uid && auth.currentUser.displayName !== nick) {
      try {
        await updateProfile(auth.currentUser, { displayName: nick });
      } catch (profileErr) {
        console.warn("Auth displayName sync failed:", profileErr);
      }
    }
  } catch (err) {
    if (!isPermissionDenied(err)) {
      console.warn("Nickname profile sync failed:", err);
    }
  }

  if (!state.sessionId) return;
  try {
    await setDoc(doc(db, "sessions", state.sessionId, "players", state.uid), {
      nickname: nick,
      lastSeenAt: serverTimestamp(),
      isNpc: false,
      isRevealed: true,
      initiative: null,
    }, { merge: true });
  } catch (err) {
    console.warn("Nickname session sync failed:", err);
  }
}

function requireNickname(options = {}) {
  return new Promise((resolve) => {
    const forcePrompt = options?.forcePrompt === true;
    // Check existing sources first (in priority order)
    const existing = state.playerNick
      || state.nickname
      || localStorage.getItem("tv_nick")
      || localStorage.getItem("tv_nickname")
      || state.displayName;
    if (!forcePrompt && existing && existing.trim()) {
      const normalized = existing.trim();
      state.displayName = normalized;
      state.nickname = normalized;
      state.playerNick = normalized;
      resolve(normalized);
      return;
    }
    if (!nicknameModal || !nicknameInput || !btnNicknameConfirm) {
      resolve("");
      return;
    }
    nicknameInput.value = "";
    animateModalIn(nicknameModal);
    nicknameInput.focus();
    function confirm() {
      const val = nicknameInput.value.trim();
      if (!val) {
        nicknameInput.focus();
        return;
      }
      btnNicknameConfirm.removeEventListener("click", confirm);
      nicknameInput.removeEventListener("keydown", onKey);
      animateModalOut(nicknameModal);
      // Persist
      state.nickname = val;
      state.playerNick = val;
      state.displayName = val;
      if (plNick) plNick.value = val;
      localStorage.setItem("tv_nickname", val);
      localStorage.setItem("tv_nick", val);
      syncNicknameToProfile(val).catch(() => {});
      resolve(val);
    }
    function onKey(e) {
      if (e.key === "Enter") confirm();
    }
    btnNicknameConfirm.addEventListener("click", confirm);
    nicknameInput.addEventListener("keydown", onKey);
  });
}

// ---- Role switching in Settings ----
btnSwitchToPlayer && (btnSwitchToPlayer.onclick = async () => {
  // GM instant-switches to player view of the same session.
  // Prompt for character name if first time
  await requireNickname();
  state.role = "player";
  persistLocal();
  settingsReturnScreenKey = SCREEN_KEYS.PLAYER_VIEW;
  await openPlayerView(state.sessionName || "Session");
  showToast("Switched to Player view.");
});

btnSwitchToGM && (btnSwitchToGM.onclick = async () => {
  // Check if user is the session owner (gmUid match) � skip PIN entirely.
  try {
    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (snap.exists() && snap.data().gmUid === state.uid) {
      // Also restore cached PIN if available.
      const cachedPin = state.gmPinPlain || localStorage.getItem("tv_dmPin");
      if (cachedPin) state.gmPinPlain = cachedPin;
      state.role = "dm";
      persistLocal();
      if (gmPinPrompt) gmPinPrompt.classList.add("hidden");
      settingsReturnScreenKey = SCREEN_KEYS.GM_DASH;
      await openGMDashboard(snap.data().name || state.sessionName || "Session");
      showToast("Switched to GM mode.");
      return;
    }
    // Not the owner � check if a GM transfer PIN has been set.
    if (!snap.exists() || !snap.data().gmTransferPinHash) {
      showToast("The GM has not set a transfer PIN. Ask the GM to set one first.", "error");
      return;
    }
  } catch (e) { console.warn("Ownership check failed, falling back to PIN:", e); }
  // Show GM Transfer PIN prompt.
  if (gmPinPrompt) {
    gmPinPrompt.classList.remove("hidden");
    btnSwitchToGM.classList.add("hidden");
    if (switchGMPinInput) { switchGMPinInput.value = ""; switchGMPinInput.focus(); }
  }
});

btnCancelSwitchGM && (btnCancelSwitchGM.onclick = () => {
  if (gmPinPrompt) gmPinPrompt.classList.add("hidden");
  if (btnSwitchToGM) btnSwitchToGM.classList.remove("hidden");
});

btnConfirmSwitchGM && (btnConfirmSwitchGM.onclick = async () => {
  const pin = switchGMPinInput?.value?.trim() || "";
  if (!pin) { showToast("Please enter the GM Transfer PIN.", "error"); return; }
  try {
    const pinHash = await sha256(pin);
    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) { showToast("Session not found.", "error"); return; }
    const sessionData = snap.data();
    // Verify against the GM transfer PIN, NOT the session join PIN.
    if (!sessionData.gmTransferPinHash) {
      showToast("No GM transfer PIN has been set.", "error");
      return;
    }
    if (pinHash !== sessionData.gmTransferPinHash) {
      showToast("Incorrect GM Transfer PIN.", "error");
      return;
    }
    // Transfer PIN matches � update gmUid in Firestore to take over.
    await updateDoc(sessionRef, { gmUid: state.uid, updatedAt: serverTimestamp() });
    // Promote to GM locally.
    state.role = "dm";
    state.gmPinPlain = null; // New GM does not inherit the session join PIN
    state.joinTag = sessionData.joinTag || state.sessionId;
    state.joinLink = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag)}`;
    persistLocal();
    if (gmPinPrompt) gmPinPrompt.classList.add("hidden");
    settingsReturnScreenKey = "gmDash";
    await openGMDashboard(sessionData.name || state.sessionName || "Session");
    showToast("You are now the GM!");
  } catch (e) {
    console.error("Switch to GM failed:", e);
    showToast("Could not verify PIN.", "error");
  }
});

// Soft-disconnect from the current session without removing any Firestore data.
// Listeners are torn down here; when the player rejoins, onSnapshot re-attaches
// and delivers every change that occurred while they were away.
function doSoftLeave(toastMsg) {
    rememberCurrentPlayerSessionForList();
    cleanupListeners();
    stopHeartbeat();
    state.role = null;
    state.sessionId = null;
    state.joinTag = null;
    state.sessionName = "";
    state.gmPinPlain = null;
    state.joinLink = null;
    state.gmHandoutsRaw = [];
    state.playerInventoryRaw = [];
    state.activePlayers = [];
    state.partyRoster = [];
    state.battleActive = false;
    state.gmUid = null;
    state.currentTurnUid = null;
    state.turnRound = 1;
    state.inventoryItems = [];
    state.wallets = {};
    localStorage.removeItem("tv_role");
    localStorage.removeItem("tv_sessionId");
    localStorage.removeItem("tv_joinTag");
    localStorage.removeItem("tv_dmPin");
    showOnly(SCREEN_KEYS.LANDING);
    loadMySessions();
    showToast(toastMsg || "Left session.");
}

// Switch Session — instant soft-leave, no confirmation needed (all data is preserved).
btnSwitchSession && (btnSwitchSession.onclick = () => {
  doSoftLeave("Session paused — your data is safe. Pick another session below.");
});

// -- Delete Session (GM) --
// Helper: cascade-delete all docs in a subcollection.
async function deleteSubcollection(sessionId, subName) {
  const snap = await getDocs(collection(db, "sessions", sessionId, subName));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// Helper: notify every player + GM in the session.
async function broadcastNotification(type, message, payload = {}) {
  if (!state.sessionId) return;
  const playersSnap = await getDocs(collection(db, "sessions", state.sessionId, "players"));
  const uids = playersSnap.docs.map(d => d.id);
  // Also notify the GM (session owner).
  const sessionSnap = await getDoc(doc(db, "sessions", state.sessionId));
  if (sessionSnap.exists()) {
    const gmUid = sessionSnap.data().gmUid;
    if (gmUid && !uids.includes(gmUid)) uids.push(gmUid);
  }
  await Promise.all(uids.map(uid => createNotification(uid, type, message, payload)));
}

let gmSeenHumanPlayerIdsForJoinNotifs = null;

async function notifySessionOnNewPlayers(players) {
  if (state.role !== "dm" || !state.sessionId) return;

  const humanPlayers = (players || []).filter((entry) => entry?.isNpc !== true && entry?.id);
  const currentIds = new Set(humanPlayers.map((entry) => String(entry.id)));

  // Prime baseline from the first snapshot so we only notify true new joins.
  if (!gmSeenHumanPlayerIdsForJoinNotifs) {
    gmSeenHumanPlayerIdsForJoinNotifs = currentIds;
    return;
  }

  const newlyJoined = humanPlayers.filter((entry) => !gmSeenHumanPlayerIdsForJoinNotifs.has(String(entry.id)));
  gmSeenHumanPlayerIdsForJoinNotifs = currentIds;
  if (newlyJoined.length === 0) return;

  for (const joined of newlyJoined) {
    const joinedUid = String(joined.id || "").trim();
    if (!joinedUid) continue;

    const joinedNick = String(joined.nickname || "A new player").trim() || "A new player";
    const targetUids = humanPlayers
      .map((entry) => String(entry.id || "").trim())
      .filter((uid) => uid && uid !== joinedUid);

    if (state.uid && state.uid !== joinedUid && !targetUids.includes(state.uid)) {
      targetUids.push(state.uid);
    }
    if (targetUids.length === 0) continue;

    await Promise.all(targetUids.map((uid) => addDoc(collection(db, "sessions", state.sessionId, "notifications"), {
      targetUid: uid,
      type: "playerJoined",
      message: `${joinedNick} has joined the session.`,
      payload: { joinedUid },
      read: false,
      createdAt: serverTimestamp(),
    })));
  }
}

function buildTemplateFromPlayerSnapshot(playerData = {}, profileData = {}) {
  const quickStats = {};
  PROFILE_STAT_KEYS.forEach((key) => {
    const value = playerData?.quickStats?.[key]
      ?? profileData?.quickStats?.[key]
      ?? playerData?.[key]
      ?? profileData?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      quickStats[key] = value;
    }
  });

  const name = String(profileData?.displayName || playerData?.nickname || playerData?.displayName || "Unknown").trim() || "Unknown";
  return {
    name,
    bio: String(profileData?.bio || playerData?.bio || "").trim(),
    imageUrl: String(profileData?.avatarUrl || playerData?.avatarUrl || "").trim() || null,
    quickStats,
    assignedToUid: null,
    assignmentStatus: "unassigned",
    sourceUid: String(playerData?.id || playerData?.uid || "").trim() || null,
    sourceType: "kickedPlayer",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function kickPartyMember(targetUid) {
  if (state.role !== "dm" || !state.sessionId || !targetUid) return;
  const target = (state.partyRoster || []).find((entry) => (entry.id || entry.uid) === targetUid);
  if (!target || target?.isNpc === true || targetUid === state.uid) return;

  const targetName = String(target?.nickname || getOwnerNick(targetUid) || "Player").trim() || "Player";
  const shouldKick = window.confirm(`Kick ${targetName} from this session? They can rejoin later with the session PIN.`);
  if (!shouldKick) return;

  const sid = state.sessionId;
  try {
    closePlayerCard();

    let profileData = {};
    try {
      profileData = await loadUserProfile(targetUid, { role: "player" });
    } catch (_) {
      profileData = {};
    }

    const playerRef = doc(db, "sessions", sid, "players", targetUid);
    const playerSnap = await getDoc(playerRef);
    const playerData = playerSnap.exists() ? { id: targetUid, ...playerSnap.data() } : { id: targetUid, ...target };

    try {
      await addDoc(collection(db, "sessions", sid, "characterTemplates"), buildTemplateFromPlayerSnapshot(playerData, profileData));
    } catch (templateErr) {
      console.warn("Kick profile transfer failed:", templateErr);
    }

    try {
      await createNotification(targetUid, "playerKicked", "The GM removed you from this session. You can rejoin at any time with the session code and PIN.");
    } catch (kickNotifErr) {
      console.warn("Kick notification failed:", kickNotifErr);
    }

    if (state.currentTurnUid === targetUid) {
      state.currentTurnUid = null;
      state.turnRound = Math.max(1, state.turnRound);
    }

    try { await deleteDoc(doc(db, "sessions", sid, "wallets", targetUid)); } catch {}
    const invSnap = await getDocs(collection(db, "sessions", sid, "inventory"));
    await Promise.all(invSnap.docs.filter((d) => d.data().ownerUid === targetUid).map((d) => deleteDoc(d.ref)));
    await deleteDoc(playerRef);

    await broadcastNotification("playerLeft", `${targetName} was removed from the party.`);
    showToast(`${targetName} was kicked. Their profile is now in Premade Profiles.`, "success");
  } catch (err) {
    console.error("kickPartyMember:", err);
    showToast("Failed to kick player.", "error");
  }
}

async function removeNpcPartyMember(targetUid) {
  if (state.role !== "dm" || !state.sessionId || !targetUid) return;
  const target = (state.partyRoster || []).find((entry) => (entry.id || entry.uid) === targetUid);
  if (!target || target?.isNpc !== true) return;

  const targetName = String(target?.nickname || "NPC").trim() || "NPC";
  const shouldRemove = window.confirm(`Remove ${targetName} from the party?`);
  if (!shouldRemove) return;

  try {
    closePlayerCard();
    if (state.currentTurnUid === targetUid) {
      state.currentTurnUid = null;
      state.turnRound = Math.max(1, state.turnRound);
    }
    await deleteDoc(doc(db, "sessions", state.sessionId, "players", targetUid));
    showToast(`${targetName} removed from party.`, "success");
  } catch (err) {
    console.error("removeNpcPartyMember:", err);
    showToast("Failed to remove NPC.", "error");
  }
}

let gmTemplateStatusSnapshot = null;

async function notifyGMOnTemplateResponses(templates) {
  if (state.role !== "dm" || !state.sessionId || !state.uid) return;
  const nextSnapshot = new Map();

  (templates || []).forEach((template) => {
    const templateId = String(template?.id || "").trim();
    if (!templateId) return;
    nextSnapshot.set(templateId, {
      status: String(template?.assignmentStatus || "").trim().toLowerCase(),
      assignedToUid: String(template?.assignedToUid || "").trim(),
      name: String(template?.name || "Character").trim() || "Character",
    });
  });

  // Prime on first snapshot to avoid notifying for historical records.
  if (!gmTemplateStatusSnapshot) {
    gmTemplateStatusSnapshot = nextSnapshot;
    return;
  }

  for (const [templateId, current] of nextSnapshot.entries()) {
    const previous = gmTemplateStatusSnapshot.get(templateId);
    if (!previous) continue;
    if (previous.status === current.status) continue;
    if (current.status !== "accepted" && current.status !== "rejected") continue;

    const responderUid = current.assignedToUid;
    const responderName = responderUid ? getOwnerNick(responderUid) : "A player";
    const verb = current.status === "accepted" ? "accepted" : "rejected";

    await createNotification(state.uid, "profileOfferResponse", `${responderName} ${verb} "${current.name}".`, {
      templateId,
      responderUid,
      status: current.status,
    });
  }

  gmTemplateStatusSnapshot = nextSnapshot;
}

btnDeleteSession && (btnDeleteSession.onclick = () => {
  if (state.role !== "dm" || !state.sessionId) return;
  if (deleteSessionConfirmInput) deleteSessionConfirmInput.value = "";
  if (btnConfirmDeleteSession) btnConfirmDeleteSession.disabled = true;
  animateModalIn(deleteSessionModal);
  deleteSessionConfirmInput?.focus();
});

deleteSessionConfirmInput && (deleteSessionConfirmInput.oninput = () => {
  const match = deleteSessionConfirmInput.value.trim() === "DELETE";
  if (btnConfirmDeleteSession) btnConfirmDeleteSession.disabled = !match;
});

btnCancelDeleteSession && (btnCancelDeleteSession.onclick = () => {
  animateModalOut(deleteSessionModal);
});

btnConfirmDeleteSession && (btnConfirmDeleteSession.onclick = async () => {
  if (deleteSessionConfirmInput?.value.trim() !== "DELETE") return;
  if (state.role !== "dm" || !state.sessionId) return;
  btnConfirmDeleteSession.disabled = true;
  btnConfirmDeleteSession.textContent = "Deleting�";
  try {
    const sid = state.sessionId;
    // Notify all players before deleting (so the notification listener fires the blocking overlay).
    await broadcastNotification("sessionDeleted", "The Game Master has deleted this session.");
    // Cascade-delete subcollections.
    const subs = ["players", "wallets", "inventory", "handouts", "notifications", "characterTemplates", "pendingTransfer"];
    await Promise.all(subs.map(s => deleteSubcollection(sid, s)));
    // Delete session document itself.
    await deleteDoc(doc(db, "sessions", sid));
    // Clean up locally.
    cleanupListeners();
    stopHeartbeat();
    state.role = null;
    state.sessionId = null;
    state.joinTag = null;
    state.sessionName = "";
    state.gmPinPlain = null;
    state.joinLink = null;
    state.gmHandoutsRaw = [];
    state.playerInventoryRaw = [];
    state.activePlayers = [];
    state.partyRoster = [];
    state.battleActive = false;
    state.gmUid = null;
    state.currentTurnUid = null;
    state.turnRound = 1;
    state.inventoryItems = [];
    state.wallets = {};
    localStorage.removeItem("tv_role");
    localStorage.removeItem("tv_sessionId");
    localStorage.removeItem("tv_joinTag");
    localStorage.removeItem("tv_dmPin");
    animateModalOut(deleteSessionModal);
    showOnly(SCREEN_KEYS.LANDING);
    loadMySessions();
    showToast("Session deleted permanently.");
  } catch (e) {
    console.error("Delete session failed:", e);
    showToast("Failed to delete session.", "error");
    btnConfirmDeleteSession.disabled = false;
    btnConfirmDeleteSession.textContent = "Delete Forever";
  }
});

// -- Discard Session (Player) --
btnDiscardSession && (btnDiscardSession.onclick = () => {
  if (state.role !== "player" || !state.sessionId) return;
  if (discardSessionConfirmInput) discardSessionConfirmInput.value = "";
  if (btnConfirmDiscardSession) {
    btnConfirmDiscardSession.disabled = true;
    btnConfirmDiscardSession.textContent = "Leave Permanently";
  }
  animateModalIn(discardSessionModal);
  discardSessionConfirmInput?.focus();
});

discardSessionConfirmInput && (discardSessionConfirmInput.oninput = () => {
  const match = discardSessionConfirmInput.value.trim() === "DISCARD";
  if (btnConfirmDiscardSession) btnConfirmDiscardSession.disabled = !match;
});

btnCancelDiscardSession && (btnCancelDiscardSession.onclick = () => {
  animateModalOut(discardSessionModal);
});

btnConfirmDiscardSession && (btnConfirmDiscardSession.onclick = async () => {
  if (discardSessionConfirmInput?.value.trim() !== "DISCARD") return;
  if (state.role !== "player" || !state.sessionId || !state.uid) return;
  btnConfirmDiscardSession.disabled = true;
  btnConfirmDiscardSession.textContent = "Leaving...";
  try {
    const sid = state.sessionId;
    const uid = state.uid;
    const nick = state.playerNick || state.displayName || "A player";

    let claimedHandoutIds = [];
    let gmUid = String(state.gmUid || "").trim();

    try {
      const [sessionSnap, handoutSnap] = await Promise.all([
        getDoc(doc(db, "sessions", sid)),
        getDocs(collection(db, "sessions", sid, "handouts")),
      ]);
      if (sessionSnap.exists()) {
        gmUid = gmUid || String(sessionSnap.data()?.gmUid || "").trim();
      }
      claimedHandoutIds = handoutSnap.docs
        .filter((d) => String(d.data()?.claimedByUid || "").trim() === uid)
        .map((d) => d.id);
    } catch (claimScanErr) {
      console.warn("Claimed handout scan failed:", claimScanErr);
    }

    // Try to transfer character profile to GM's premade templates.
    try {
      const playerRef = doc(db, "sessions", sid, "players", uid);
      const playerSnap = await getDoc(playerRef);
      if (playerSnap.exists()) {
        const pd = playerSnap.data();
        if (pd.displayName || pd.nickname) {
          await addDoc(collection(db, "sessions", sid, "characterTemplates"), {
            name: pd.displayName || pd.nickname || "Unknown",
            bio: pd.bio || "",
            avatarUrl: pd.avatarUrl || "",
            level: pd.level ?? null,
            armorRating: pd.armorRating ?? null,
            hitPoints: pd.hitPoints ?? null,
            initiative: pd.initiative ?? null,
            strength: pd.strength ?? null,
            dexterity: pd.dexterity ?? null,
            constitution: pd.constitution ?? null,
            intelligence: pd.intelligence ?? null,
            wisdom: pd.wisdom ?? null,
            charisma: pd.charisma ?? null,
            assignedTo: null,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (profileErr) {
      console.warn("Profile transfer to templates failed:", profileErr);
    }

    if (gmUid && gmUid !== uid && claimedHandoutIds.length > 0) {
      try {
        await createNotification(
          gmUid,
          "playerDiscardedHandouts",
          `${nick} left permanently. Review ${claimedHandoutIds.length} claimed handout${claimedHandoutIds.length === 1 ? "" : "s"}.`,
          {
            playerUid: uid,
            playerName: nick,
            handoutIds: claimedHandoutIds,
            sessionId: sid,
          }
        );
      } catch (notifyErr) {
        console.warn("Discard handout review notification failed:", notifyErr);
      }
    }

    // Broadcast leave notification before removing data.
    await broadcastNotification("playerLeft", `${nick} has left the session permanently.`);
    // Delete player's own wallet and inventory.
    try { await deleteDoc(doc(db, "sessions", sid, "wallets", uid)); } catch {}
    const invSnap = await getDocs(collection(db, "sessions", sid, "inventory"));
    await Promise.all(invSnap.docs.filter(d => d.data().ownerUid === uid).map(d => deleteDoc(d.ref)));
    // Delete player doc.
    await deleteDoc(doc(db, "sessions", sid, "players", uid));
    forgetJoinedSession(sid);
    // Mark Firestore membership as "left" (preserved for rejoin/history)
    await markMembershipLeft(uid, sid);
    // Clean up locally.
    cleanupListeners();
    stopHeartbeat();
    state.role = null;
    state.sessionId = null;
    state.joinTag = null;
    state.sessionName = "";
    state.gmPinPlain = null;
    state.joinLink = null;
    state.gmHandoutsRaw = [];
    state.playerInventoryRaw = [];
    state.activePlayers = [];
    state.partyRoster = [];
    state.battleActive = false;
    state.gmUid = null;
    state.currentTurnUid = null;
    state.turnRound = 1;
    state.inventoryItems = [];
    state.wallets = {};
    localStorage.removeItem("tv_role");
    localStorage.removeItem("tv_sessionId");
    localStorage.removeItem("tv_joinTag");
    localStorage.removeItem("tv_dmPin");
    animateModalOut(discardSessionModal);
    showOnly(SCREEN_KEYS.LANDING);
    loadMySessions();
    showToast("You have left the session permanently.");
  } catch (e) {
    console.error("Discard session failed:", e);
    showToast("Failed to leave session.", "error");
    btnConfirmDiscardSession.disabled = false;
    btnConfirmDiscardSession.textContent = "Leave Permanently";
  }
});

// -- Session Deleted overlay (for notified players) --
btnSessionDeletedOk && (btnSessionDeletedOk.onclick = () => {
  cleanupListeners();
  stopHeartbeat();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.sessionName = "";
  state.gmPinPlain = null;
  state.joinLink = null;
  state.gmHandoutsRaw = [];
  state.playerInventoryRaw = [];
  state.activePlayers = [];
  state.partyRoster = [];
  state.battleActive = false;
  state.gmUid = null;
  state.currentTurnUid = null;
  state.turnRound = 1;
  state.inventoryItems = [];
  state.wallets = {};
  localStorage.removeItem("tv_role");
  localStorage.removeItem("tv_sessionId");
  localStorage.removeItem("tv_joinTag");
  localStorage.removeItem("tv_dmPin");
  animateModalOut(sessionDeletedModal);
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
});

btnSettingsBack && (btnSettingsBack.onclick = () => {
  const fallback = getDefaultRoleScreen();
  const target = resolveScreenKey(settingsReturnScreenKey || fallback);
  showOnly(target);
});

btnProfileBack && (btnProfileBack.onclick = () => {
  const fallback = "settings";
  const target = resolveScreenKey(settingsProfileReturnScreenKey || fallback);
  showOnly(target);
});

btnSaveProfile && (btnSaveProfile.onclick = () => {
  saveCurrentProfile().catch((e) => {
    console.error("Save profile failed:", e);
    profileSaveMsg && (profileSaveMsg.textContent = "Could not save profile.");
    showToast("Could not save profile.", "error");
  });
});

profileAvatarFile?.addEventListener("click", (event) => {
  const confirmed = confirmNuggetCost("Uploading or changing your profile picture");
  if (!confirmed) {
    event.preventDefault();
    profileAvatarUploadConfirmed = false;
    profileAvatarStatus && (profileAvatarStatus.textContent = "Profile picture upload canceled.");
    return;
  }
  profileAvatarUploadConfirmed = true;
});

profileAvatarFile?.addEventListener("change", () => {
  if (!profileAvatarUploadConfirmed) {
    const confirmed = confirmNuggetCost("Uploading or changing your profile picture");
    if (!confirmed) {
      profileAvatarStatus && (profileAvatarStatus.textContent = "Profile picture upload canceled.");
      profileAvatarFile.value = "";
      return;
    }
    profileAvatarUploadConfirmed = true;
  }
  const file = profileAvatarFile.files?.[0];
  if (!file) return;
  uploadOwnAvatar(file).catch((e) => {
    console.error("Picture upload failed:", e);
    profileAvatarStatus && (profileAvatarStatus.textContent = "Upload failed.");
    showToast("Picture upload failed.", "error");
  }).finally(() => {
    profileAvatarUploadConfirmed = false;
    profileAvatarFile.value = "";
  });
});

btnScanCharacterSheet?.addEventListener("click", () => {
  if (btnScanCharacterSheet.disabled) return;
  openCharacterSheetCamera().catch((err) => {
    console.error("Scan camera open failed:", err);
    profileScanStatus && (profileScanStatus.textContent = "Could not open camera.");
  });
});

btnCaptureCharacterSheet?.addEventListener("click", () => {
  if (btnCaptureCharacterSheet.disabled) return;
  captureCharacterSheetFromCamera().catch((err) => {
    console.error("Capture failed:", err);
    profileScanStatus && (profileScanStatus.textContent = "Capture failed.");
  });
});

btnCloseCharacterSheetCamera?.addEventListener("click", () => {
  stopCharacterSheetCamera();
  profileScanStatus && (profileScanStatus.textContent = "Camera closed.");
});

characterSheetPhoto?.addEventListener("change", () => {
  const file = characterSheetPhoto.files?.[0];
  if (!file) return;
  scanCharacterSheetAndFill(file).finally(() => {
    characterSheetPhoto.value = "";
  });
});

// Start/stop camera scanning manually.
btnScanInApp && (btnScanInApp.onclick = () => startScan());
btnStopScan && (btnStopScan.onclick = () => stopScan());

// ---- QR invite modal (GM) ----
const qrInviteModal = $("qrInviteModal");
const btnShowQRInvite = $("btnShowQRInvite");
const btnCloseQRModal = $("btnCloseQRModal");
const btnShareFromQRModal = $("btnShareFromQRModal");

function openQRInviteModal() {
  if (!state.joinLink) return;
  const qrUrl = state.gmPinPlain
    ? `${state.joinLink}&pin=${encodeURIComponent(state.gmPinPlain)}`
    : state.joinLink;
  // Pre-render before opening so it appears on first frame.
  renderQR(qrUrl);
  animateModalIn(qrInviteModal);
}

btnShowQRInvite && (btnShowQRInvite.onclick = openQRInviteModal);

btnCloseQRModal && (btnCloseQRModal.onclick = () => animateModalOut(qrInviteModal));
qrInviteModal && (qrInviteModal.onclick = (e) => {
  if (e.target === qrInviteModal) animateModalOut(qrInviteModal);
});

const handleCopyJoinLink = async (buttonEl = null) => {
  if (!state.joinLink) return;
  const qrUrl = state.gmPinPlain
    ? `${state.joinLink}&pin=${encodeURIComponent(state.gmPinPlain)}`
    : state.joinLink;
  await copyToClipboard(qrUrl);
  showToast("Join link copied!", "success");
  if (!buttonEl) return;
  // Micro-feedback: swap button text for 1.8 s.
  if (buttonEl.dataset.originalText === undefined) {
    buttonEl.dataset.originalText = buttonEl.textContent.trim();
  }
  const prev = buttonEl.textContent;
  buttonEl.textContent = "Copied!";
  setTimeout(() => { buttonEl.textContent = prev; }, UI_TIMERS.BUTTON_FLASH_MS);
};

// Copy join link — primary CTA in QR modal and secondary quick action in social panel.
btnCopyJoinLinkSocial && (btnCopyJoinLinkSocial.onclick = async () => {
  await handleCopyJoinLink(btnCopyJoinLinkSocial);
});

btnCopyJoinLinkModal && (btnCopyJoinLinkModal.onclick = async () => {
  await handleCopyJoinLink(btnCopyJoinLinkModal);
});

btnShareFromQRModal && (btnShareFromQRModal.onclick = () => shareSessionInvite());

// ---- 12) GM: create session ----
// BEGINNER NOTE � Session creation flow:
// 1. Validate inputs (name length, PIN format)
// 2. Hash the PIN with SHA-256 so Firestore never stores the raw digits
// 3. Generate a human-readable joinTag ("cool-dragon-42") for easy sharing
// 4. Write a Firestore document to `sessions/{auto-id}`
// 5. Save state locally (localStorage) for page-reload persistence
// 6. Open the GM dashboard and start realtime listeners
btnCreateSession && (btnCreateSession.onclick = async () => {
  // User feedback first so UI does not feel frozen during async work.
  gmCreateMsg.textContent = "Creating session...";
  btnCreateSession.disabled = true;

  // Require real auth — no anonymous fallback
  if (!auth.currentUser) {
    gmCreateMsg.textContent = "Not authenticated. Please sign in first.";
    btnCreateSession.disabled = false;
    return;
  }
  if (!state.uid) {
    state.uid = auth.currentUser.uid;
  }

  const isOneShot = !!state._isOneShotIntent;

  // Trial check: signed-in users get 30 days of free campaign access.
  // One-shot sessions are always free.
  if (!isOneShot) {
    const trialOk = await checkTrialStatus();
    if (!trialOk) {
      gmCreateMsg.textContent = "Your free trial has expired. One-shot sessions remain free forever.";
      btnCreateSession.disabled = false;
      return;
    }
  }

  const rawName = String(gmSessionName.value || "").trim();
  if (rawName.length > LIMITS.SESSION_NAME_MAX) {
    gmCreateMsg.textContent = `Session name must be ${LIMITS.SESSION_NAME_MAX} characters or fewer.`;
    btnCreateSession.disabled = false;
    return;
  }
  const name = (rawName || "Untitled Session").slice(0, LIMITS.SESSION_NAME_MAX);
  const pinPlain = gmPin.value.trim();

  if (!/^\d{4,8}$/.test(pinPlain)) {
    gmCreateMsg.textContent = "PIN must be 4�8 digits.";
    btnCreateSession.disabled = false;
    return;
  }

  // Convert PIN to hash before storing/comparing.
  const pinHash = await sha256(pinPlain);
  const joinTag = await generateUniqueJoinTag(name);

  try {
    // Create a new Firestore session document.
    const sessionData = {
      name,
      joinTag,
      pinHash,
      gmUid: state.uid,
      battleActive: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ambience: { track: "tavern", volume: 0.6, isPlaying: false },
      isOneShot: isOneShot,
    };
    // One-shot sessions expire after 24 hours
    if (isOneShot) {
      sessionData.expiresAt = new Date(Date.now() + ONE_SHOT_TTL_MS);
    }
    const ref = await addDoc(collection(db, "sessions"), sessionData);

    state.role = "dm";
    state.sessionId = ref.id;
  state.joinTag = joinTag;
    state.gmPinPlain = pinPlain;
    state._isOneShotSession = isOneShot;
    state._isOneShotIntent = false;
  // Join link includes joinTag in URL query so QR scan can auto-fill join form.
  state.joinLink = buildSessionJoinLink(joinTag);

    persistLocal();
    await openGMDashboard(name);

    // Write Firestore membership for cross-device session discovery
    writeMembership({ role: "dm", sessionName: name, joinTag }).catch(() => {});
  } catch (e) {
    console.error("Session creation error:", e);
    let msg = "Could not create session.";
    if (e.code === "permission-denied" || e.message?.includes("permission")) {
      msg += " Firestore rules denied the write. Make sure your security rules allow authenticated users to create sessions.";
    } else if (e.code === "unauthenticated" || e.message?.includes("unauthenticated")) {
      msg += " You are not authenticated. Please sign in or start a one-shot session first.";
    } else if (!navigator.onLine) {
      msg += " You appear to be offline.";
    } else {
      msg += " " + (e.message || "Check Firebase config + rules.");
    }
    if (IS_LOCALHOST) {
      msg += " (localhost � check browser console for details)";
    }
    gmCreateMsg.textContent = msg;
    btnCreateSession.disabled = false;
  }
});

async function openGMDashboard(sessionName) {
  requestWakeLock();
  // Entering GM dashboard performs three responsibilities:
  // 1) Paint UI metadata (title, session id, pin, QR code)
  // 2) Wire copy/share actions for the invite link
  // 3) Subscribe to realtime data (session doc, handouts, players)
  //
  // BEGINNER NOTE � onSnapshot (realtime listeners):
  // Unlike getDocs() which fetches data once, onSnapshot() creates a
  // persistent connection. Firestore pushes updates the instant any client
  // writes a change. This is what makes TomeVault "multiplayer" � the GM
  // adds a handout and every player sees it appear immediately.
  // Each listener returns an unsubscribe function stored in state.unsub*
  // so we can disconnect when leaving the session.
  cleanupListeners();

  // Session name is now shown in Settings; dashboard uses a static wordmark.
  state.sessionName = sessionName || "Session";
  gmSessionIdText.textContent = state.joinTag || state.sessionId;
  gmSessionIdText.title = state.joinTag && state.sessionId
    ? `${state.joinTag} � ${state.sessionId}`
    : (state.joinTag || state.sessionId || "Session");
  gmPinShown.textContent = state.gmPinPlain ?? "(PIN not saved)";
  if (btnChangePin) btnChangePin.textContent = state.gmPinPlain ? "Change" : "Set PIN";
  state.joinLink = buildSessionJoinLink(state.joinTag || state.sessionId);
  const qrUrl = state.gmPinPlain
    ? `${state.joinLink}&pin=${encodeURIComponent(state.gmPinPlain)}`
    : state.joinLink;
  renderQR(qrUrl);

  // Show GM Transfer PIN status from Firestore.
  try {
    const snapForTransfer = await getDoc(doc(db, "sessions", state.sessionId));
    if (snapForTransfer.exists()) {
      const hasTransferPin = !!snapForTransfer.data().gmTransferPinHash;
      if (gmTransferPinShown) gmTransferPinShown.textContent = hasTransferPin ? "Set" : "Not set";
      if (btnChangeTransferPin) btnChangeTransferPin.textContent = hasTransferPin ? "Change" : "Set";
    }
  } catch (_) {}

  // Ambience panel should be hidden by default (opened manually via toolbar).
  if (ambienceBar) {
    ambienceBar.classList.add("hidden");
    ambienceBar.setAttribute("aria-hidden", "true");
    btnOpenAmbienceBar?.classList.remove("is-active");
  }

  // GM sound defaults on for new sessions.
  soundEnabled = true;
  localStorage.setItem("tv_soundEnabled", "1");
  syncAmbienceButtonState(false);
  try { syncSoundToggleUI(); } catch (_) {}

  // Copy helper actions: these reduce friction during live session setup.

  const sessionRef = doc(db, "sessions", state.sessionId);

  // Show skeleton placeholders while first Firestore snapshot loads.
  showSkeletonCards(gmHandoutList, 3);
  

  // Session listener (single document): keeps ambience controls in sync.
  // Also detects GM role changes (demotion when another player takes over).
  state.unsubSession = onSnapshot(sessionRef, async (snap) => {
    if (!snap.exists()) return;
    setLiveTick();
    const s = snap.data();
    state.gmUid = String(s?.gmUid || "").trim() || null;
    state.battleActive = s?.battleActive === true;
    // Sync turn state from Firestore (authoritative for round-trips / reconnects)
    if (s.currentTurnUid !== undefined) state.currentTurnUid = s.currentTurnUid || null;
    if (s.turnRound !== undefined) state.turnRound = s.turnRound || 1;
    syncPartyBattleUi();
    gmAmbience.value = s.ambience?.track ?? "tavern";
    gmVolume.value = s.ambience?.volume ?? 0.6;
    syncAmbienceButtonState(!!s.ambience?.isPlaying);
    renderAtmospherePanel(s.ambience);
    // Apply ambience locally for GM as well so they hear play/stop immediately
    try { applyAmbience(s.ambience); } catch (e) {}
    // If gmUid changed and we are no longer the GM, auto-demote to player.
    if (s.gmUid && s.gmUid !== state.uid && state.role === "dm") {
      state.role = "player";
      state.gmPinPlain = null;
      localStorage.removeItem("tv_dmPin");
      persistLocal();
      cleanupListeners();
      await requireNickname();
      showToast("Another player has taken over the GM role. You are now a player.", "info");
      await openPlayerView(state.sessionName || "Session");
    }
  });

  // Handouts listener (collection): re-renders GM list whenever handouts change.
  const handoutsRef = collection(db, "sessions", state.sessionId, "handouts");
  state.unsubHandouts = onSnapshot(query(handoutsRef, orderBy("updatedAt", "desc")), (snap) => {
    setLiveTick();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.gmHandoutsRaw = items;
    renderGMHandouts(items);
  });

  // Players listener: powers active player list + top player count pill.
  const playersRef = collection(db, "sessions", state.sessionId, "players");
  state.unsubPlayers = onSnapshot(query(playersRef, orderBy("lastSeenAt", "desc")), (snap) => {
    const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifySessionOnNewPlayers(players).catch((err) => {
      console.warn("playerJoined notification failed:", err);
    });
    renderGMPlayers(players);
  }, (err) => {
    console.error("GM players listener error:", err);
  });

  // Template listener: emits GM notifications when a player accepts/rejects an offer.
  const templatesRef = collection(db, "sessions", state.sessionId, "characterTemplates");
  state.unsubTemplateAssignments = onSnapshot(templatesRef, (snap) => {
    const templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyGMOnTemplateResponses(templates).catch((err) => {
      console.warn("profileOfferResponse notification failed:", err);
    });
  }, (err) => {
    console.error("GM templates listener error:", err);
  });

  // reflect initial social panel state in layout
  try {
    syncGMDashboardLayout();
    setGMSocialMode(false);
  } catch (e) {}

  // Subscribe to inventory & wallet data for the inventory screen.
  subscribeInventory();

  // Show bell and subscribe to notifications.
  btnNotifBell?.classList.remove("hidden");
  subscribeNotifications();

  // Subscribe to nugget balance.
  subscribeNuggets();

  showOnly(SCREEN_KEYS.GM_DASH);
  ensureOwnProfileLoaded().catch(() => {});

  // Initialize drag-and-drop for handout list
  setTimeout(initDragDrop, 500);

  // First-time onboarding tour
  setTimeout(startOnboarding, 1000);
}

// ---- 13) GM: handouts CRUD ----
// BEGINNER NOTE � CRUD stands for Create, Read, Update, Delete.
// These are the four basic operations on any piece of data.
// In TomeVault, each handout is a Firestore document inside
// `sessions/{sessionId}/handouts/{handoutId}`.
// Creating it here triggers every player's onSnapshot listener,
// which auto-renders the new card on their screen in realtime.
btnAddHandout && (btnAddHandout.onclick = async () => {
  // Build handout payload from form fields.
  const title = gmTitle.value.trim();
  const pub = gmPublic.value.trim();
  const sec = gmSecret.value.trim();
  const type = gmType.value;
  const isMap = isMapHandoutType(type);
  const iconKey = getActiveIcon();
  const accentColor = getActiveColor();
  const npcDisposition = type === "npc" ? getNpcDisposition() : "";
  let imageUrl = pendingHandoutImageUrl || String(gmImagePreview?.getAttribute("src") || "").trim() || null;

  const validationError = validateHandoutCoreFields({ title, publicContent: pub, type });
  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  if (!isMap && pendingHandoutNugget) {
    const ok = await spendNuggetWithFeedback("handout image");
    if (!ok) return;
    pendingHandoutNugget = false;
  }

  if (isMap && !imageUrl) {
    showToast("Upload a map image first (cost: 1 nugget).", "error");
    return;
  }

  if (!isMap && !imageUrl) {
    const selected = selectBestPlaceholderImage({
      title,
      publicContent: pub,
      type,
      npcDisposition,
    });
    imageUrl = selected?.url || null;
  }

  const imageFrame = imageUrl ? getCreateImageFrameData() : null;

  const handoutsRef = collection(db, "sessions", state.sessionId, "handouts");

// Persist handout under the active session subcollection.
await addDoc(handoutsRef, {
  type,
  title,
  publicContent: pub,
  secretContent: sec,
  iconEmoji: iconKey,
  iconKey,
  accentColor,
  npcDisposition,
  imageUrl: isMap ? MAP_HANDOUT_AVATAR_URL : imageUrl,
  mapImageUrl: isMap ? imageUrl : null,
  mapVisibleToUid: null,
  imageFrame,

  revealed: !!createRevealDraft,
  secretRevealed: false,

  // Claim (alleen relevant voor loot)
  claimable: (String(type).toLowerCase() === "loot") ? !!createClaimableDraft : false,
  claimedByUid: null,
  claimedByNick: null,
  claimedAt: null,

  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

  // Reset form for rapid entry of the next handout.
  gmTitle.value = "";
  gmPublic.value = "";
  gmSecret.value = "";
  clearCreateDraft();
  createRevealDraft = false;
  syncCreateRevealButton();
  setImagePreview("");
  syncCreateMapPreview("");
  pendingHandoutImageUrl = null;
  pendingHandoutNugget = false;
  if (handoutImageStatus) handoutImageStatus.textContent = "";
  if (handoutImageUpload) handoutImageUpload.value = "";
  createImageHistoryBySeed.clear();
  setImagePickerOpen(false);
  createClaimableDraft = false;
  syncCreateClaimableButton();
  animateModalOut(createHandoutModal);
  showToast("Handout created!", "success");
});

// -- Create-handout draft auto-save (localStorage) --
const CREATE_DRAFT_KEY = "tv_createHandoutDraft";
function saveCreateDraft() {
  try {
    const d = { type: gmType?.value || "", title: gmTitle?.value || "", pub: gmPublic?.value || "", sec: gmSecret?.value || "" };
    if (!d.title && !d.pub && !d.sec) { localStorage.removeItem(CREATE_DRAFT_KEY); return; }
    localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(d));
  } catch (_) {}
}
function restoreCreateDraft() {
  try {
    const raw = localStorage.getItem(CREATE_DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (gmType && d.type) gmType.value = d.type;
    if (gmTitle && d.title) gmTitle.value = d.title;
    if (gmPublic && d.pub) gmPublic.value = d.pub;
    if (gmSecret && d.sec) gmSecret.value = d.sec;
  } catch (_) {}
}
function clearCreateDraft() { try { localStorage.removeItem(CREATE_DRAFT_KEY); } catch (_) {} }
const _debouncedSaveCreateDraft = debounce(saveCreateDraft, UI_TIMERS.CREATE_DRAFT_DEBOUNCE_MS);
gmTitle?.addEventListener("input", _debouncedSaveCreateDraft);
gmPublic?.addEventListener("input", _debouncedSaveCreateDraft);
gmSecret?.addEventListener("input", _debouncedSaveCreateDraft);
gmType?.addEventListener("change", _debouncedSaveCreateDraft);

if (btnOpenCreateModal) {
  btnOpenCreateModal.onclick = () => {
    if (state.role !== "dm") return;
    openCreateHandoutModal({
      restoreDraftValues: true,
      resetImageFrameState: true,
      renderSuggestions: true,
    });
  };
}

if (btnCloseCreateModal) {
  btnCloseCreateModal.onclick = () => {
    setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
    setImagePickerOpen(false);
    animateModalOut(createHandoutModal);
  };
}

btnHandoutUploadImage?.addEventListener("click", () => handoutImageUpload?.click());
handoutImageUpload?.addEventListener("change", async () => {
  const file = handoutImageUpload.files?.[0];
  if (!file) {
    createHandoutImageUploadConfirmed = false;
    return;
  }
  if (!state.uid) {
    if (handoutImageStatus) handoutImageStatus.textContent = "Sign in is required before uploading images.";
    createHandoutImageUploadConfirmed = false;
    return;
  }
  if (!file.type.startsWith("image/")) {
    if (handoutImageStatus) handoutImageStatus.textContent = "Please select an image file.";
    createHandoutImageUploadConfirmed = false;
    return;
  }
  const isMap = isMapHandoutType(gmType?.value);
  if (!isMap && !createHandoutImageUploadConfirmed) {
    const confirmed = confirmNuggetCost("Uploading or changing this handout portrait");
    if (!confirmed) {
      if (handoutImageStatus) handoutImageStatus.textContent = "Handout portrait upload canceled.";
      handoutImageUpload.value = "";
      return;
    }
    createHandoutImageUploadConfirmed = true;
  }
  if (handoutImageStatus) handoutImageStatus.textContent = isMap ? "Uploading map..." : "Uploading image...";
  const uploaded = isMap
    ? await uploadMapImageToStorage(file, { handoutId: "create" })
    : await uploadHandoutImageToStorage(file, { handoutId: "create" });
  if (!uploaded.ok || !uploaded.url) {
    if (handoutImageStatus) handoutImageStatus.textContent = uploaded.message || "Upload failed.";
    createHandoutImageUploadConfirmed = false;
    handoutImageUpload.value = "";
    return;
  }
  pendingHandoutImageUrl = uploaded.url;
  if (isMap) {
    syncCreateMapPreview(pendingHandoutImageUrl);
  } else {
    setImagePreview(pendingHandoutImageUrl);
  }
  pendingHandoutNugget = !isMap;
  if (handoutImageStatus) {
    handoutImageStatus.textContent = isMap
      ? "Map uploaded (1 nugget spent)."
      : "Image uploaded. 1 nugget will be spent when you create this handout.";
  }
  setImagePickerOpen(false);
  createHandoutImageUploadConfirmed = false;
  handoutImageUpload.value = "";
});

if (createHandoutModal) {
  createHandoutModal.onclick = (e) => {
    if (e.target === createHandoutModal) {
      setAccordionState(btnCreateAppearanceToggle, createAppearanceBody, false);
      animateModalOut(createHandoutModal);
    }
  };
}

setupCreateBuilderUI();
// setupInventoryAvatarNav() moved after inventory variable declarations (see below)

function getCardClaimState(h, role) {
  // Computes the visual + interaction state for the compact card-level claim button.
  // Returns: { isActive, icon, label, title }
  // isActive=true means the button is interactive and triggers an immediate claim.
  const isLoot = String(h.type || "").toLowerCase() === "loot";
  const claimable = !!h.claimable;
  const claimedByUid = String(h.claimedByUid || "").trim();
  const claimedByNick = String(h.claimedByNick || "").trim();
  const isClaimed = Boolean(claimedByUid);
  const isMine = isClaimed && claimedByUid === state.uid;

  if (!isLoot) {
    return { isActive: false, icon: "claim-off", label: "Not claimable", title: "Not claimable" };
  }
  if (!claimable) {
    return { isActive: false, icon: "claim-off", label: "Claiming disabled", title: "Claiming is disabled for this loot" };
  }
  if (isMine) {
    return { isActive: false, icon: "claim", label: "Claimed by you", title: "You claimed this loot" };
  }
  if (isClaimed) {
    const by = claimedByNick || "another player";
    return { isActive: false, icon: "claim-off", label: `Claimed by ${by}`, title: `Claimed by ${by}` };
  }
  // Unclaimed + claimable
  if (role === "dm") {
    return { isActive: false, icon: "claim", label: "Unclaimed loot", title: "Unclaimed — open to manage" };
  }
  // Player: can claim
  return { isActive: true, icon: "claim", label: "Claim this loot", title: "Claim this loot" };
}

function renderGMHandouts(items) {
  // Render pipeline:
  // filter list -> build row HTML -> wire row click -> append to DOM.
  // Render functions follow a simple pattern:
  // clear container -> toggle empty state -> append rows from current data.
  // This is easy to reason about for beginners and avoids stale list entries.
  const queryText = String(state.gmSearchQuery || "").trim().toLowerCase();
  const typeFilter = String(state.gmFilter || "all").toLowerCase();
  const filtered = items.filter((handout) => {
    const handoutType = String(handout.type || "").toLowerCase();
    const matchesType = typeFilter === "all" || handoutType === typeFilter;
    if (!matchesType) return false;

    if (!queryText) return true;
    const title = String(handout.title || "").toLowerCase();
    const publicContent = String(handout.publicContent || "").toLowerCase();
    const secretContent = String(handout.secretContent || "").toLowerCase();
    return title.includes(queryText) || publicContent.includes(queryText) || secretContent.includes(queryText);
  });

  gmHandoutList.innerHTML = "";
  gmHandoutEmpty.classList.toggle("hidden", filtered.length > 0);
  if (filtered.length === 0) {
    const hintEl = gmHandoutEmpty.querySelector(".emptyState__hint");
    if (hintEl) hintEl.textContent = items.length === 0 ? "Tap the + button to create your first handout." : "No handouts match the current filters.";
  }

  const visibilityMetaIcon = (isVisible) => {
    if (isVisible) {
      return `<span class="handoutMetaIcon handoutMetaIcon--visible" title="Visible" aria-label="Visible"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3.2"></circle></svg></span>`;
    }
    return `<span class="handoutMetaIcon handoutMetaIcon--hidden" title="Hidden" aria-label="Hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3.2"></circle><path d="M4 20 20 4"></path></svg></span>`;
  };

  const secretMetaIcon = (isRevealed) => {
    if (isRevealed) {
      return `<span class="handoutMetaIcon handoutMetaIcon--secret" title="Secret revealed" aria-label="Secret revealed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path></svg></span>`;
    }
    return `<span class="handoutMetaIcon handoutMetaIcon--secretOff" title="Secret hidden" aria-label="Secret hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path><path d="M4 20 20 4"></path></svg></span>`;
  };

  const npcDispositionClass = (disposition) => {
    const normalized = String(disposition || "").toLowerCase();
    if (normalized === "friendly") return "tag--npcFriendly";
    if (normalized === "enemy") return "tag--npcEnemy";
    if (normalized === "neutral") return "tag--npcNeutral";
    return "tag--npcUnknown";
  };

  const fragment = document.createDocumentFragment();
  filtered.forEach((h) => {
    const row = document.createElement("div");
    row.className = `item ${h.revealed ? "item--revealed" : ""}`.trim();
    row.dataset.id = h.id;
    row.style.borderLeft = `4px solid ${h.accentColor || "#f5c82f"}`;
    const visibleImageUrl = getHandoutAvatarImageUrl(h);
    const frameStyle = buildImageFrameInlineStyle(h.imageFrame);
    const displayTitle = getSafeHandoutTitle(h);
    const thumbHtml = visibleImageUrl
      ? `<div class="item__thumb"><img src="${escapeHtml(visibleImageUrl)}" alt="${escapeHtml(displayTitle)} portrait"${frameStyle} /></div>`
      : `<div class="item__thumb">${getHeroIconSvg("photo", "itemThumbIcon")}</div>`;
    // Supports both new (iconKey) and legacy (iconEmoji) stored data.
    const iconMarkup = getHeroIconSvg(normalizeIconKey(h.iconKey || h.iconEmoji), "itemIconSvg");
    const isNpc = String(h.type || "").toLowerCase() === "npc";
    const typeTag = isNpc
      ? `<span class="tag tag--npc ${npcDispositionClass(h.npcDisposition)}">NPC</span>`
      : `<span class="tag">${escapeHtml((h.type ?? "handout").toUpperCase())}</span>`;
    const isLootCard = String(h.type || "").toLowerCase() === "loot";
    const claimState = isLootCard ? getCardClaimState(h, "dm") : null;
    const claimBtnHtml = claimState
      ? `<button class="cardClaimBtn${claimState.icon === "claim" ? " is-mine" : ""}" type="button" disabled aria-label="${escapeHtml(claimState.label)}" title="${escapeHtml(claimState.title)}">${getHeroIconSvg(claimState.icon, "cardClaimBtnIcon")}</button>`
      : "";
    const rightColHtml = claimBtnHtml
      ? `<div class="item__right">${thumbHtml}${claimBtnHtml}</div>`
      : thumbHtml;
    row.innerHTML = `
      <div class="item__meta">
        <span class="itemEmoji">${iconMarkup}</span>
        <div>
          <div class="handoutMetaRow">
            ${typeTag}
            ${visibilityMetaIcon(h.revealed === true)}
            ${secretMetaIcon(h.secretRevealed === true)}
          </div>
          <div><strong>${escapeHtml(displayTitle)}</strong></div>
        </div>
      </div>
      ${rightColHtml}
    `;
    row.onclick = () => openModal({ ...h, id: h.id }, "dm");
    fragment.appendChild(row);
  });
  gmHandoutList.appendChild(fragment);
  initVirtualScroll(gmHandoutList);
}

function logHandoutSearchPerf({ scope, trigger, query, totalItems, shownItems, elapsedMs }) {
  const normalizedScope = scope === "gm" ? "GM" : "Player";
  const normalizedTrigger = String(trigger || "input").toLowerCase();
  const safeQuery = String(query || "").trim();
  const total = Number.isFinite(totalItems) ? totalItems : 0;
  const shown = Number.isFinite(shownItems) ? shownItems : 0;
  const ms = Number(elapsedMs || 0).toFixed(1);
  console.debug(
    `[TV][SearchPerf][${normalizedScope}] ${ms}ms | trigger=${normalizedTrigger} | shown=${shown}/${total} | query="${safeQuery}"`
  );
}

if (gmSearch) {
  const runGMSearch = (trigger = "input") => {
    const startedAt = performance.now();
    state.gmSearchQuery = gmSearch.value || "";
    renderGMHandouts(state.gmHandoutsRaw);
    logHandoutSearchPerf({
      scope: "gm",
      trigger,
      query: state.gmSearchQuery,
      totalItems: (state.gmHandoutsRaw || []).length,
      shownItems: gmHandoutList?.childElementCount || 0,
      elapsedMs: performance.now() - startedAt,
    });
  };
  let gmSearchFrame = 0;
  const scheduleGMSearch = (trigger = "input") => {
    if (gmSearchFrame) cancelAnimationFrame(gmSearchFrame);
    gmSearchFrame = requestAnimationFrame(() => {
      gmSearchFrame = 0;
      runGMSearch(trigger);
    });
  };
  gmSearch.addEventListener("input", () => scheduleGMSearch("input"));
  gmSearch.addEventListener("search", () => scheduleGMSearch("search"));
  gmSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (gmSearchFrame) {
      cancelAnimationFrame(gmSearchFrame);
      gmSearchFrame = 0;
    }
    runGMSearch("enter");
  });
}

if (gmFilterRow) {
  gmFilterRow.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const chip = target.closest(".chip");
    if (!(chip instanceof HTMLElement)) return;
    applyGMFilterSelection(chip, state.gmHandoutsRaw);
  });
}

// Online status from heartbeat timestamp.
// Thresholds come from UI_TIMERS.*; null timestamp resolves to Unavailable.
const presenceStatusCache = new Map();

function getOnlineStatus(lastSeenAt, playerId = "") {
  const nowMs = Date.now();
  const cacheKey = String(playerId || "").trim();
  const ts = lastSeenAt?.toDate ? lastSeenAt.toDate() : lastSeenAt;
  const tsMs = ts instanceof Date ? ts.getTime() : NaN;

  if (Number.isFinite(tsMs)) {
    const diffMs = nowMs - tsMs;
    const status = diffMs < UI_TIMERS.ONLINE_THRESHOLD_MS
      ? { cls: "online", label: "Online" }
      : diffMs < UI_TIMERS.AWAY_THRESHOLD_MS
      ? { cls: "away", label: "Away" }
      : { cls: "offline", label: "Offline" };
    if (cacheKey) presenceStatusCache.set(cacheKey, { status, seenAtMs: nowMs });
    return status;
  }

  if (cacheKey) {
    const cached = presenceStatusCache.get(cacheKey);
    if (cached && (nowMs - Number(cached.seenAtMs || 0)) <= UI_TIMERS.PRESENCE_MISSING_GRACE_MS) {
      return cached.status;
    }
  }

  return { cls: "dead", label: "Unavailable" };
}

function formatLastSeenDate(lastSeenAt) {
  if (!lastSeenAt) return "-";
  const ts = lastSeenAt.toDate ? lastSeenAt.toDate() : lastSeenAt;
  if (!(ts instanceof Date) || Number.isNaN(ts.getTime())) return "-";
  const pad = (value) => String(value).padStart(2, "0");
  const hours = pad(ts.getHours());
  const mins = pad(ts.getMinutes());
  const day = pad(ts.getDate());
  const month = pad(ts.getMonth() + 1);
  const year = String(ts.getFullYear()).slice(-2);
  return `${hours}:${mins} ${day}-${month}-${year}`;
}

function parseNumericStat(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+\-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function rollD20() {
  try {
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint32Array(1);
      globalThis.crypto.getRandomValues(bytes);
      return (bytes[0] % 20) + 1;
    }
  } catch {}
  return Math.floor(Math.random() * 20) + 1;
}

function getDexterityModifier(entry) {
  const explicitMod = [
    entry?.dexterityMod,
    entry?.quickStats?.dexterityMod,
    entry?.quickStats?.dexMod,
    entry?.dexMod,
  ].map(parseNumericStat).find((n) => n !== null);
  if (explicitMod !== undefined) return explicitMod ?? 0;

  const dexRaw = [entry?.quickStats?.dexterity, entry?.dexterity]
    .map(parseNumericStat)
    .find((n) => n !== null);
  if (dexRaw !== undefined) {
    const dexValue = dexRaw ?? 0;
    return dexValue > 10 ? Math.floor((dexValue - 10) / 2) : dexValue;
  }

  const fallbackInitMod = [entry?.quickStats?.initiative, entry?.initiativeMod]
    .map(parseNumericStat)
    .find((n) => n !== null);
  return fallbackInitMod ?? 0;
}

function getInitiativeValue(entry) {
  const parsed = parseNumericStat(entry?.initiative);
  return parsed === null ? null : parsed;
}

function sortCombatantsByInitiative(entries) {
  const statusOrder = { online: 0, away: 1, offline: 2, dead: 3 };
  return [...entries].sort((a, b) => {
    const ai = getInitiativeValue(a);
    const bi = getInitiativeValue(b);
    if (ai !== null && bi !== null && ai !== bi) return bi - ai;
    if (ai !== null && bi === null) return -1;
    if (ai === null && bi !== null) return 1;

    const sa = a?.isNpc ? 0 : (statusOrder[getOnlineStatus(a?.lastSeenAt, a?.id || a?.uid).cls] ?? 9);
    const sb = b?.isNpc ? 0 : (statusOrder[getOnlineStatus(b?.lastSeenAt, b?.id || b?.uid).cls] ?? 9);
    if (sa !== sb) return sa - sb;

    const an = String(a?.nickname || "Adventurer").toLowerCase();
    const bn = String(b?.nickname || "Adventurer").toLowerCase();
    return an.localeCompare(bn);
  });
}

function unknownEnemyAvatarMarkup() {
  return `
    <svg class="gmPartyPanel__avatarIcon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"></circle>
      <path d="M5 20C5 16.6863 8.13401 14 12 14C15.866 14 19 16.6863 19 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `;
}

function initiativeDiceIconMarkup() {
  return `<svg class="gmPartyPanel__initiativeIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"></circle><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"></circle><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"></circle><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"></circle><circle cx="12" cy="12" r="1.2" fill="currentColor"></circle></svg>`;
}

function battleIconMarkup(isActive = state.battleActive === true) {
  return `<span class="gmPartyPanel__battleEmoji" aria-hidden="true">${isActive ? "⚔️" : "💤"}</span>`;
}

function setPartyRollLoading(isLoading) {
  if (gmPartyRollOverlay) {
    gmPartyRollOverlay.classList.toggle("hidden", !isLoading);
    gmPartyRollOverlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
  }
  if (btnRollInitiative) btnRollInitiative.disabled = isLoading;
  if (btnPartyBattle) btnPartyBattle.disabled = isLoading;
  if (btnAddNpc) btnAddNpc.disabled = isLoading;
  if (gmPartyPanel) gmPartyPanel.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function isPlayerInitiativeLocked() {
  return state.role === "player" && state.battleActive === true;
}

function getSelfCombatant() {
  return (state.partyRoster || []).find((entry) => (entry?.id || entry?.uid) === state.uid) || null;
}

function syncPartyBattleUi() {
  const active = state.battleActive === true;
  if (btnPartyBattle) {
    btnPartyBattle.classList.toggle("is-active", active);
    btnPartyBattle.setAttribute("aria-pressed", active ? "true" : "false");
    btnPartyBattle.innerHTML = `${battleIconMarkup(active)}<span>${active ? "Battle: ON" : "Battle: OFF"}</span>`;
  }
  if (btnPlayerInitiativeEdit) {
    btnPlayerInitiativeEdit.disabled = active;
    btnPlayerInitiativeEdit.title = active ? "Battle mode active - GM controls initiative" : "Edit your initiative";
  }
  if (btnPlayerInitiativeRoll) {
    btnPlayerInitiativeRoll.disabled = active;
    btnPlayerInitiativeRoll.title = active ? "Battle mode active - GM controls initiative" : "Roll and set your initiative";
  }
}

function renderGMPlayers(players) {
  const previousRoster = state.partyRoster || [];
  state.partyRoster = players;
  state.activePlayers = players.filter((entry) => entry?.isNpc !== true);

  const nextIds = new Set(players.map((entry) => String(entry?.id || entry?.uid || "")).filter(Boolean));
  const prevIds = new Set(previousRoster.map((entry) => String(entry?.id || entry?.uid || "")).filter(Boolean));
  const rosterChanged = nextIds.size !== prevIds.size || [...prevIds].some((id) => !nextIds.has(id));
  if (rosterChanged && state.currentTurnUid && !nextIds.has(state.currentTurnUid)) {
    const sorted = sortCombatantsByInitiative(players.filter((entry) => entry?.id));
    state.currentTurnUid = sorted[0]?.id || null;
    if (!state.currentTurnUid) state.turnRound = 1;
  }

  hydrateActivePlayerProfiles(state.activePlayers).catch(() => {});

  // Keep assignment dropdown in sync with latest active players.
  try { populateAssignablePlayers(); } catch (e) {}

  renderGMPartyPanel(players);
  renderPlayerPartyPanel(players);
    renderPlayerMiniChatPreview();
  syncNpcCombatantsWithNpcHandouts().catch(() => {});
}

let npcHandoutSyncInFlight = false;

function normalizeNpcSyncKey(value) {
  return String(value || "").trim().toLowerCase();
}

function isUnknownNpcLabel(value) {
  const normalized = normalizeNpcSyncKey(value);
  return normalized === "unknown enemy" || normalized === "enemy" || normalized === "unknown";
}

async function syncNpcCombatantsWithNpcHandouts() {
  if (state.role !== "dm" || !state.sessionId || npcHandoutSyncInFlight) return;

  const npcEntries = (state.partyRoster || []).filter((entry) => entry?.isNpc === true && entry?.id);
  const npcHandouts = (state.gmHandoutsRaw || []).filter((handout) => String(handout?.type || "").toLowerCase() === "npc");
  if (npcEntries.length === 0 || npcHandouts.length === 0) return;

  const handoutByName = new Map();
  npcHandouts.forEach((handout) => {
    const key = normalizeNpcSyncKey(handout?.title);
    if (!key || handoutByName.has(key)) return;
    handoutByName.set(key, handout);
  });

  const linkedHandoutIds = new Set(
    npcEntries
      .map((entry) => String(entry?.npcHandoutId || "").trim())
      .filter(Boolean)
  );

  const updates = [];
  npcEntries.forEach((npc) => {
    const matchedById = npc?.npcHandoutId
      ? npcHandouts.find((handout) => handout?.id === npc.npcHandoutId)
      : null;
    const matchedByName = handoutByName.get(normalizeNpcSyncKey(npc?.nickname));
    const matchedByAvatar = !matchedById
      ? npcHandouts.find((handout) => {
          const handoutAvatar = String(handout?.imageUrl || "").trim();
          const npcAvatar = String(npc?.avatarUrl || "").trim();
          return !!handoutAvatar && handoutAvatar === npcAvatar;
        })
      : null;

    let matched = matchedById || matchedByName || matchedByAvatar;

    if (!matched && !npc?.npcHandoutId && isUnknownNpcLabel(npc?.nickname)) {
      const remainingCandidates = npcHandouts.filter((handout) => !linkedHandoutIds.has(String(handout?.id || "").trim()));
      if (remainingCandidates.length === 1) {
        matched = remainingCandidates[0];
      }
    }

    if (!matched) return;

    const nextReveal = matched?.revealed === true;
    const nextAvatar = String(matched?.imageUrl || "").trim();
    const nextName = String(matched?.title || "").trim() || String(npc?.nickname || "").trim() || "Unknown Enemy";
    const nextHandoutId = String(matched?.id || "").trim() || null;
    const currentAvatar = String(npc?.avatarUrl || "").trim();
    const currentName = String(npc?.nickname || "").trim();
    const currentReveal = npc?.isRevealed === true;
    const currentHandoutId = String(npc?.npcHandoutId || "").trim() || null;

    if (currentReveal === nextReveal && currentAvatar === nextAvatar && currentName === nextName && currentHandoutId === nextHandoutId) return;

    updates.push({
      id: npc.id,
      patch: {
        nickname: nextName,
        avatarUrl: nextAvatar,
        isRevealed: nextReveal,
        npcHandoutId: nextHandoutId,
        updatedAt: serverTimestamp(),
      },
    });

    if (nextHandoutId) linkedHandoutIds.add(nextHandoutId);
  });

  if (updates.length === 0) return;
  npcHandoutSyncInFlight = true;
  try {
    const batch = writeBatch(db);
    updates.forEach(({ id, patch }) => {
      batch.set(doc(db, "sessions", state.sessionId, "players", id), patch, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn("NPC handout sync skipped:", err);
  } finally {
    npcHandoutSyncInFlight = false;
  }
}

function renderPartyPanel(players, listEl, emptyEl) {
  if (!listEl || !emptyEl) return;

  emptyEl.classList.toggle("hidden", players.length > 0);
  if (players.length === 0) {
    listEl.innerHTML = "";
    return;
  }

  const isGMList = listEl === gmPartyInlineList;
  const sorted = sortCombatantsByInitiative(players);
  const existingRows = new Map(
    [...listEl.querySelectorAll(".gmPartyPanel__row[data-uid]")].map((row) => [String(row.dataset.uid || ""), row])
  );
  const nextIds = new Set(sorted.map((entry) => String(entry?.id || "")).filter(Boolean));

  existingRows.forEach((row, uid) => {
    if (!nextIds.has(uid)) row.remove();
  });

  const orderedRows = [];

  sorted.forEach((p, index) => {
    const uid = String(p?.id || "");
    if (!uid) return;
    const isNpc = p?.isNpc === true;
    const isHiddenNpc = isNpc && p?.isRevealed === false;
    const profile = !isNpc ? getCachedProfile(p.id, "player") : null;
    const displayName = String(profile?.displayName || p?.displayName || p?.nickname || "").trim();
    const nick = String(
      isHiddenNpc
        ? "Unknown Enemy"
        : (displayName || (isNpc ? "Enemy" : "Adventurer"))
    ).trim();
    const status = isNpc
      ? { cls: p?.isRevealed === false ? "offline" : "away", label: p?.isRevealed === false ? "Hidden" : "NPC" }
      : getOnlineStatus(p.lastSeenAt, p?.id || p?.uid);
    const avatarUrl = String((isNpc ? p?.avatarUrl : (profile?.avatarUrl || p?.avatarUrl)) || "").trim();
    const initial = escapeHtml((nick.charAt(0) || "?").toUpperCase());
    const initiativeValue = getInitiativeValue(p);
    const initiativeLabel = initiativeValue === null ? "-" : String(initiativeValue);
    const npcAvatarNeedsCrop = isNpc && avatarUrl && /placeholders\//i.test(avatarUrl);
    const avatarMarkup = isHiddenNpc
      ? unknownEnemyAvatarMarkup()
      : avatarUrl
      ? `<img class="${npcAvatarNeedsCrop ? "gmPartyPanel__avatarImg--npc" : ""}" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(nick)} avatar" />`
      : `<span>${initial}</span>`;
    let metaText = isNpc ? (p?.isRevealed === false ? "Hidden enemy" : "Revealed enemy") : formatLastSeenDate(p.lastSeenAt);
    if (isNpc && !isGMList && p?.isRevealed === false) {
      metaText = "Unknown threat";
    }

    const gmNpcButton = isGMList && isNpc
      ? `<button class="gmPartyPanel__npcBtn" type="button" data-toggle-npc="${escapeHtml(uid)}">${p?.isRevealed === false ? "Reveal" : "Hide"}</button>`
      : `<span class="gmPartyPanel__status gmPartyPanel__status--${escapeHtml(status.cls)}">${escapeHtml(status.label)}</span>`;

    const rowMarkup = `
      <span class="gmPartyPanel__identity">
        <span class="gmPartyPanel__avatar">${avatarMarkup}</span>
        <span style="min-width:0">
          <span class="gmPartyPanel__name">${escapeHtml(nick)}</span>
          <span class="gmPartyPanel__meta">${escapeHtml(metaText)}</span>
        </span>
      </span>
      <span class="gmPartyPanel__statusWrap">
        <span class="gmPartyPanel__initiative">${initiativeDiceIconMarkup()}<span>${escapeHtml(initiativeLabel)}</span></span>
        ${gmNpcButton}
      </span>
    `;
    const rowSignature = JSON.stringify({
      isGMList,
      isNpc,
      isHiddenNpc,
      avatarUrl,
      nick,
      metaText,
      initiativeLabel,
      statusCls: status.cls,
      statusLabel: status.label,
      activeTurn: p.id === state.currentTurnUid,
      npcToggleLabel: isGMList && isNpc ? (p?.isRevealed === false ? "Reveal" : "Hide") : "",
      npcAvatarNeedsCrop,
    });

    let row = existingRows.get(uid) || null;
    const isNewRow = !row;
    if (!row) {
      row = document.createElement("div");
      row.dataset.uid = uid;
    }

    row.className = `gmPartyPanel__row${isNewRow ? " list-stagger-item" : ""}${isNpc ? " gmPartyPanel__row--npc" : ""}${p.id === state.currentTurnUid ? " is-active-turn" : ""}`;
    row.style.setProperty("--stagger-index", String(index));
    if (row.dataset.renderSig !== rowSignature) {
      row.innerHTML = rowMarkup;
      row.dataset.renderSig = rowSignature;
    }

    if (isNpc) {
      const _npcHandoutId = String(p?.npcHandoutId || "").trim();
      const _linked = _npcHandoutId
        ? (state.gmHandoutsRaw || []).find((e) => e?.id === _npcHandoutId)
        : (state.gmHandoutsRaw || []).find((e) =>
            String(e?.type || "").toLowerCase() === "npc" &&
            normalizeNpcSyncKey(e?.title) === normalizeNpcSyncKey(p?.nickname)
          );
      const _accent = String(_linked?.accentColor || "").trim();
      if (_accent) row.style.borderLeft = `4px solid ${_accent}`;
      else row.style.borderLeft = "";
    } else {
      const _playerAvatar = resolveDisplayAvatar(avatarUrl, uid);
      if (_playerAvatar) {
        extractDominantColor(_playerAvatar).then((color) => {
          if (color && row.isConnected) row.style.borderLeft = `4px solid ${color}`;
          else if (row.isConnected) row.style.borderLeft = "";
        });
      } else {
        row.style.borderLeft = "";
      }
    }
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    if (!row.dataset.wired) {
      row.addEventListener("click", (event) => {
        const fromNpcToggle = event.target instanceof Element && event.target.closest("[data-toggle-npc]");
        if (fromNpcToggle) return;
        const uidFromRow = String(row.dataset.uid || "");
        if (!uidFromRow) return;
        const latestMember = (state.partyRoster || []).find((entry) => (entry?.id || entry?.uid) === uidFromRow);
        if (!latestMember) return;
        const rowIsGMList = row.closest("#gmPartyInlineList") != null;
        openPlayerCard(uidFromRow, { member: latestMember, viewerRole: rowIsGMList ? "dm" : "player" });
      });
      row.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const uidFromRow = String(row.dataset.uid || "");
        if (!uidFromRow) return;
        const latestMember = (state.partyRoster || []).find((entry) => (entry?.id || entry?.uid) === uidFromRow);
        if (!latestMember) return;
        const rowIsGMList = row.closest("#gmPartyInlineList") != null;
        openPlayerCard(uidFromRow, { member: latestMember, viewerRole: rowIsGMList ? "dm" : "player" });
      });
      row.addEventListener("click", async (event) => {
        const toggleBtn = event.target instanceof Element ? event.target.closest("[data-toggle-npc]") : null;
        if (!toggleBtn) return;
        event.preventDefault();
        event.stopPropagation();

        const uidFromRow = String(row.dataset.uid || "");
        if (!uidFromRow || !state.sessionId) return;
        const latestMember = (state.partyRoster || []).find((entry) => (entry?.id || entry?.uid) === uidFromRow);
        if (!latestMember || latestMember?.isNpc !== true) return;

        const nextReveal = !(latestMember?.isRevealed === true);
        const matchedNpcHandout = (state.gmHandoutsRaw || []).find((handout) => {
          if (String(handout?.type || "").toLowerCase() !== "npc") return false;
          if (latestMember?.npcHandoutId && handout?.id === latestMember.npcHandoutId) return true;
          return normalizeNpcSyncKey(handout?.title) === normalizeNpcSyncKey(latestMember?.nickname);
        });
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, "sessions", state.sessionId, "players", uidFromRow), {
            isRevealed: nextReveal,
            ...(matchedNpcHandout?.id ? { npcHandoutId: matchedNpcHandout.id } : {}),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          if (matchedNpcHandout?.id) {
            batch.set(doc(db, "sessions", state.sessionId, "handouts", matchedNpcHandout.id), {
              revealed: nextReveal,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
          await batch.commit();
        } catch (err) {
          console.error("Toggle NPC reveal failed:", err);
          showToast("Could not update NPC reveal state.", "error");
        }
      });
      row.dataset.wired = "1";
    }

    orderedRows.push(row);
  });

  const fragment = document.createDocumentFragment();
  orderedRows.forEach((row) => fragment.appendChild(row));
  listEl.appendChild(fragment);
}

function getSortedInitiativeCombatants() {
  const combatants = (state.partyRoster || []).filter((p) => p?.id);
  return sortCombatantsByInitiative(combatants);
}

function normalizeCurrentTurn(sortedCombatants) {
  const sorted = Array.isArray(sortedCombatants) ? sortedCombatants : getSortedInitiativeCombatants();
  if (sorted.length === 0) {
    state.currentTurnUid = null;
    state.turnRound = 1;
    return sorted;
  }
  const currentIdx = sorted.findIndex((p) => p.id === state.currentTurnUid);
  if (currentIdx < 0) {
    state.currentTurnUid = sorted[0].id;
  }
  return sorted;
}

function updateTurnNav() {
  if (!gmTurnNav) return;
  const sorted = normalizeCurrentTurn(getSortedInitiativeCombatants());
  const hasInit = sorted.length > 0;
  gmTurnNav.classList.toggle("hidden", !hasInit);
  if (!hasInit) return;
  const idx = sorted.findIndex(p => p.id === state.currentTurnUid);
  const current = idx >= 0 ? sorted[idx] : sorted[0];
  const currentProfile = current?.isNpc ? null : getCachedProfile(current?.id, "player");
  const nick = current
    ? String(currentProfile?.displayName || current.displayName || current.nickname || (current.isNpc ? "Enemy" : "Adventurer")).trim()
    : "—";
  const pos = idx >= 0 ? `${idx + 1} / ${sorted.length}` : "?";
  if (gmTurnLabel) gmTurnLabel.textContent = `Round ${state.turnRound} · ${nick} (${pos})`;
}

function persistTurnState() {
  if (state.role !== "dm" || !state.sessionId) return;
  updateDoc(doc(db, "sessions", state.sessionId), {
    currentTurnUid: state.currentTurnUid || null,
    turnRound: state.turnRound || 1,
    updatedAt: serverTimestamp(),
  }).catch((err) => console.warn("Turn state persist failed:", err));
}

async function resetInitiative() {
  if (state.role !== "dm" || !state.sessionId) return;
  const roster = state.partyRoster || [];
  if (roster.length === 0) return;
  state.currentTurnUid = null;
  state.turnRound = 1;
  try {
    const batch = writeBatch(db);
    roster.forEach(p => {
      if (!p?.id) return;
      const ref = doc(db, "sessions", state.sessionId, "players", p.id);
      batch.update(ref, { initiative: null, updatedAt: serverTimestamp() });
    });
    batch.update(doc(db, "sessions", state.sessionId), {
      currentTurnUid: null,
      turnRound: 1,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    // Firestore listener will update partyRoster via renderGMPlayers
  } catch (err) {
    console.error("Reset initiative failed:", err);
    showToast("Could not reset initiative.", "error");
    return;
  }
  updateTurnNav();
}

function advanceTurn(dir) {
  const sorted = normalizeCurrentTurn(getSortedInitiativeCombatants());
  if (sorted.length === 0) return;

  const direction = dir === -1 ? -1 : 1;
  const currentIdx = sorted.findIndex((p) => p.id === state.currentTurnUid);
  let nextIdx = currentIdx;

  if (currentIdx < 0) {
    nextIdx = direction === 1 ? 0 : sorted.length - 1;
  } else {
    nextIdx = (currentIdx + direction + sorted.length) % sorted.length;
    if (direction === 1 && nextIdx === 0 && sorted.length > 1) {
      state.turnRound = Math.max(1, state.turnRound + 1);
    }
    if (direction === -1 && currentIdx === 0 && sorted.length > 1) {
      state.turnRound = Math.max(1, state.turnRound - 1);
    }
  }

  state.currentTurnUid = sorted[nextIdx].id;
  
  // Create a visual sweep effect when the turn changes
  requestAnimationFrame(() => {
    document.documentElement.style.setProperty("--turn-sweep-active", "1");
    setTimeout(() => {
      document.documentElement.style.removeProperty("--turn-sweep-active");
    }, 400);
  });

  persistTurnState();
  renderGMPartyPanel(state.partyRoster);
  updateTurnNav();
}

function renderGMPartyPanel(players) {
  normalizeCurrentTurn(getSortedInitiativeCombatants());
  // GM should not see themselves in their own party list
  const visiblePlayers = players.filter(p => (p?.id || p?.uid) !== state.uid || p?.isNpc === true);
  renderPartyPanel(visiblePlayers, gmPartyInlineList, gmPartyInlineEmpty);
  updateRailBadge(gmPartyBadge, visiblePlayers.length);
  if (isWideGMDashboard() && gmRailTabs) {
    switchRailTab(gmRailTabs, state.gmActiveRailTab || "party", "gmActiveRailTab");
  } else {
    gmPartyPanel?.classList.toggle("hidden", false);
  }
  updateTurnNav();
}

function renderPlayerPartyPanel(players) {
  renderPartyPanel(players, playerPartyInlineList, playerPartyInlineEmpty);
  updateRailBadge(plPartyBadge, players.length);
  if (isWideGMDashboard() && plRailTabs) {
    switchRailTab(plRailTabs, state.plActiveRailTab || "party", "plActiveRailTab");
  } else {
    playerPartyPanel?.classList.toggle("hidden", false);
  }
  updatePlayerTurnNav();
}

function updatePlayerTurnNav() {
  if (!playerTurnNav) return;
  const sorted = getSortedInitiativeCombatants();
  const hasInit = sorted.length > 0 && state.currentTurnUid;
  playerTurnNav.classList.toggle("hidden", !hasInit);
  if (!hasInit) return;
  const idx = sorted.findIndex(p => p.id === state.currentTurnUid);
  const current = idx >= 0 ? sorted[idx] : null;
  if (!current) { playerTurnNav.classList.add("hidden"); return; }
  const isNpc = current?.isNpc === true;
  const isHiddenNpc = isNpc && current?.isRevealed === false;
  const profile = !isNpc ? getCachedProfile(current?.id, "player") : null;
  const nick = isHiddenNpc
    ? "Unknown Enemy"
    : String(profile?.displayName || current.displayName || current.nickname || (isNpc ? "Enemy" : "Adventurer")).trim();
  const pos = `${idx + 1} / ${sorted.length}`;
  if (playerTurnLabel) playerTurnLabel.textContent = `Round ${state.turnRound} \u00b7 ${nick} (${pos})`;
}

async function createNpcCombatant() {
  if (state.role !== "dm" || !state.sessionId) return;

  const nameInput = window.prompt("NPC name", "Unknown Enemy");
  if (nameInput === null) return;
  const name = String(nameInput || "").trim() || "Unknown Enemy";

  const dexInput = window.prompt("DEX modifier (e.g. +2)", "0");
  if (dexInput === null) return;
  const dexMod = parseNumericStat(dexInput);
  if (dexMod === null) {
    showToast("Enter a valid numeric DEX modifier.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "sessions", state.sessionId, "players"), {
      nickname: name,
      isNpc: true,
      isRevealed: false,
      initiative: null,
      dexterityMod: dexMod,
      quickStats: {
        dexterityMod: dexMod,
      },
      joinedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast(`${name} added to initiative tracker.`, "success");
  } catch (err) {
    console.error("Add NPC failed:", err);
    showToast("Could not add NPC.", "error");
  }
}

async function rollInitiativeForAll() {
  if (state.role !== "dm" || !state.sessionId) return;
  const combatants = (state.partyRoster || []).filter((entry) => entry?.id);
  if (combatants.length === 0) {
    showToast("No combatants in party yet.", "error");
    return;
  }

  const enemies = combatants.filter(e => e.isNpc);
  const players = combatants.filter(e => !e.isNpc);
  state.turnRound = 1;
  state.currentTurnUid = null;

  // Auto-roll for all enemies (NPCs)
  if (enemies.length > 0) {
    setPartyRollLoading(true);
    try {
      const batch = writeBatch(db);
      enemies.forEach((entry) => {
        const roll = rollD20();
        const dexMod = getDexterityModifier(entry);
        const initiative = roll + dexMod;
        const ref = doc(db, "sessions", state.sessionId, "players", entry.id);
        batch.set(ref, {
          initiative,
          initiativeRoll: roll,
          initiativeModUsed: dexMod,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
      showToast(`Initiative rolled for ${enemies.length} enemy${enemies.length !== 1 ? "s" : ""}.`, "success");
    } catch (err) {
      console.error("Roll enemy initiative failed:", err);
      showToast("Failed to roll enemy initiative.", "error");
    } finally {
      setPartyRollLoading(false);
    }
  }

  // Prompt GM to enter player initiative rolls via modal
  openPlayerInitiativeModal(players);
}

// ---- Player initiative input modal ----
const playerInitiativeModal = $("playerInitiativeModal");
const playerInitList = $("playerInitList");
const playerInitModalTitle = $("playerInitModalTitle");
const playerInitModalHint = $("playerInitModalHint");
const btnConfirmInitiatives = $("btnConfirmInitiatives");
const btnCancelInitModal = $("btnCancelInitModal");
const btnCloseInitModal = $("btnCloseInitModal");

// Holds pending player entries while modal is open
let _pendingInitPlayers = [];
let _initiativeModalMode = "gm-batch";
let _pendingInitRoll = null;
let _pendingInitDexMod = null;

function openPlayerInitiativeModal(players, options = {}) {
  if (!playerInitiativeModal || !playerInitList) return;
  _pendingInitPlayers = players || [];
  _initiativeModalMode = options?.mode === "player-self" ? "player-self" : "gm-batch";
  _pendingInitRoll = Number.isFinite(options?.roll) ? Number(options.roll) : null;
  _pendingInitDexMod = Number.isFinite(options?.dexMod) ? Number(options.dexMod) : null;

  if (playerInitModalTitle) {
    playerInitModalTitle.textContent = _initiativeModalMode === "player-self" ? "Your Initiative" : "Player Initiative";
  }
  if (playerInitModalHint) {
    if (_initiativeModalMode === "player-self") {
      if (options?.fromRoll && _pendingInitRoll !== null) {
        const signedMod = _pendingInitDexMod === null
          ? ""
          : (_pendingInitDexMod >= 0 ? ` + ${_pendingInitDexMod}` : ` - ${Math.abs(_pendingInitDexMod)}`);
        playerInitModalHint.textContent = `Rolled ${_pendingInitRoll}${signedMod}. Adjust if needed, then save.`;
      } else {
        playerInitModalHint.textContent = "Set or update your initiative value.";
      }
    } else {
      playerInitModalHint.textContent = "Enemies rolled automatically. Enter each player's initiative result below.";
    }
  }
  if (btnConfirmInitiatives) {
    btnConfirmInitiatives.textContent = _initiativeModalMode === "player-self" ? "Save Initiative" : "Set Initiatives";
  }
  if (btnCancelInitModal) {
    btnCancelInitModal.textContent = _initiativeModalMode === "player-self" ? "Cancel" : "Skip";
  }

  // Build a row per player: name label + number input
  playerInitList.innerHTML = _pendingInitPlayers.length === 0
    ? `<p class="muted small" style="text-align:center;padding:8px 0">No players joined yet.</p>`
    : _pendingInitPlayers.map((p) => {
        const name = p.nickname || p.displayName || "Player";
        const current = Number.isFinite(options?.prefillInitiative)
          ? Number(options.prefillInitiative)
          : ((p.initiative != null && !isNaN(Number(p.initiative))) ? p.initiative : "");
        return `<div class="playerInitRow">
          <span class="playerInitRow__name">${escapeHtml(name)}</span>
          <input class="input playerInitRow__input" type="number" inputmode="numeric"
            placeholder="—" value="${escapeHtml(String(current))}"
            data-player-id="${escapeHtml(p.id)}" aria-label="Initiative for ${escapeHtml(name)}">
        </div>`;
      }).join("");

  animateModalIn(playerInitiativeModal);
}

function closePlayerInitiativeModal() {
  animateModalOut(playerInitiativeModal);
  _pendingInitPlayers = [];
  _initiativeModalMode = "gm-batch";
  _pendingInitRoll = null;
  _pendingInitDexMod = null;
}

async function confirmPlayerInitiatives() {
  if (!playerInitList || !state.sessionId) return;
  const inputs = playerInitList.querySelectorAll(".playerInitRow__input");
  if (inputs.length === 0) { closePlayerInitiativeModal(); return; }

  if (_initiativeModalMode === "player-self") {
    if (isPlayerInitiativeLocked()) {
      showToast("Battle mode is active. Only the GM can change initiative now.", "error");
      closePlayerInitiativeModal();
      return;
    }
    const input = inputs[0];
    if (!input) { closePlayerInitiativeModal(); return; }
    const playerId = String(input.dataset.playerId || state.uid || "").trim();
    const val = input.value.trim();
    const num = Number(val);
    if (!playerId || val === "" || isNaN(num)) {
      showToast("Enter a valid initiative value.", "error");
      return;
    }
    try {
      await setDoc(doc(db, "sessions", state.sessionId, "players", playerId), {
        initiative: num,
        ...(_pendingInitRoll !== null ? { initiativeRoll: _pendingInitRoll } : {}),
        ...(_pendingInitDexMod !== null ? { initiativeModUsed: _pendingInitDexMod } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast("Initiative saved.", "success");
      closePlayerInitiativeModal();
    } catch (err) {
      console.error("Save player initiative failed:", err);
      showToast("Failed to save initiative.", "error");
    }
    return;
  }

  const batch = writeBatch(db);
  let count = 0;
  inputs.forEach((input) => {
    const playerId = input.dataset.playerId;
    const val = input.value.trim();
    if (!playerId || val === "") return;
    const num = Number(val);
    if (isNaN(num)) return;
    const ref = doc(db, "sessions", state.sessionId, "players", playerId);
    batch.set(ref, { initiative: num, updatedAt: serverTimestamp() }, { merge: true });
    count++;
  });

  if (count === 0) { closePlayerInitiativeModal(); return; }

  try {
    await batch.commit();
    state.turnRound = 1;
    state.currentTurnUid = null;
    showToast(`Initiative set for ${count} player${count !== 1 ? "s" : ""}.`, "success");
  } catch (err) {
    console.error("Set player initiative failed:", err);
    showToast("Failed to save player initiatives.", "error");
  }
  closePlayerInitiativeModal();
}

function openSelfInitiativeModal({ fromRoll = false, prefillInitiative = null, roll = null, dexMod = null } = {}) {
  const selfEntry = getSelfCombatant();
  if (!selfEntry) {
    showToast("You are not in the party roster yet.", "error");
    return;
  }
  const fallbackCurrent = getInitiativeValue(selfEntry);
  openPlayerInitiativeModal([selfEntry], {
    mode: "player-self",
    fromRoll,
    prefillInitiative: Number.isFinite(prefillInitiative) ? prefillInitiative : fallbackCurrent,
    roll,
    dexMod,
  });
}

btnCloseInitModal?.addEventListener("click", closePlayerInitiativeModal);
btnCancelInitModal?.addEventListener("click", closePlayerInitiativeModal);
btnConfirmInitiatives?.addEventListener("click", () => {
  confirmPlayerInitiatives().catch((err) => {
    console.error("Confirm initiatives error:", err);
    showToast("Failed to save initiatives.", "error");
  });
});

btnAddNpc?.addEventListener("click", () => {
  createNpcCombatant().catch((err) => {
    console.error("Add NPC action failed:", err);
    showToast("Could not add NPC.", "error");
  });
});

btnRollInitiative?.addEventListener("click", () => {
  btnRollInitiative.classList.add("is-rolling");
  window.setTimeout(() => btnRollInitiative.classList.remove("is-rolling"), UI_TIMERS.ROLL_ANIM_MS);
  rollInitiativeForAll().catch((err) => {
    console.error("Roll initiative action failed:", err);
    showToast("Failed to roll initiative.", "error");
    setPartyRollLoading(false);
  });
});

btnResetInitiative?.addEventListener("click", () => {
  if (!window.confirm("Reset all initiative values? This cannot be undone.")) return;
  resetInitiative().catch((err) => {
    console.error("Reset initiative failed:", err);
    showToast("Failed to reset initiative.", "error");
  });
});

btnPartyBattle?.addEventListener("click", async () => {
  if (state.role !== "dm" || !state.sessionId) return;
  const nextValue = !(state.battleActive === true);
  const previousValue = state.battleActive === true;
  state.battleActive = nextValue;
  syncPartyBattleUi();
  btnPartyBattle.disabled = true;
  try {
    await updateDoc(doc(db, "sessions", state.sessionId), {
      battleActive: nextValue,
      updatedAt: serverTimestamp(),
    });
    showToast(nextValue ? "Battle mode enabled." : "Battle mode disabled.", "success");
  } catch (err) {
    state.battleActive = previousValue;
    syncPartyBattleUi();
    console.error("Toggle battle mode failed:", err);
    showToast("Could not update battle mode.", "error");
  } finally {
    btnPartyBattle.disabled = false;
  }
});

btnPlayerInitiativeEdit?.addEventListener("click", () => {
  if (isPlayerInitiativeLocked()) {
    showToast("Battle mode is active. Only the GM can change initiative now.", "error");
    return;
  }
  openSelfInitiativeModal();
});

btnPlayerInitiativeRoll?.addEventListener("click", () => {
  if (isPlayerInitiativeLocked()) {
    showToast("Battle mode is active. Only the GM can change initiative now.", "error");
    return;
  }
  const selfEntry = getSelfCombatant();
  if (!selfEntry) {
    showToast("You are not in the party roster yet.", "error");
    return;
  }
  const roll = rollD20();
  const dexMod = getDexterityModifier(selfEntry);
  const initiative = roll + dexMod;
  const selfUid = String(selfEntry?.id || state.uid || "").trim();
  if (!selfUid || !state.sessionId) {
    showToast("Could not resolve your player record.", "error");
    return;
  }
  setDoc(doc(db, "sessions", state.sessionId, "players", selfUid), {
    initiative,
    initiativeRoll: roll,
    initiativeModUsed: dexMod,
    updatedAt: serverTimestamp(),
  }, { merge: true }).then(() => {
    const signedMod = dexMod >= 0 ? `+${dexMod}` : String(dexMod);
    showToast(`Initiative set to ${initiative} (d20 ${roll} ${signedMod}).`, "success");
  }).catch((err) => {
    console.error("Player roll initiative failed:", err);
    showToast("Failed to set initiative.", "error");
  });
});

syncPartyBattleUi();

btnTurnNext?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  advanceTurn(1);
});

btnTurnPrev?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  advanceTurn(-1);
});

// Discord-style player profile card popup
const playerCardOverlay = $("playerCardOverlay");
const pcAvatar = $("pcAvatar");
const pcName = $("pcName");
const pcRole = $("pcRole");
const pcStatus = $("pcStatus");
const pcStatusDot = $("pcStatusDot");
const pcItems = $("pcItems");
const pcCoins = $("pcCoins");
const pcItemsLabel = $("pcItemsLabel");
const pcCoinsLabel = $("pcCoinsLabel");
const pcLoreSection = $("pcLoreSection");
const pcLoreText = $("pcLoreText");
const pcLoreToggle = $("pcLoreToggle");
const pcLoreLabel = $("pcLoreLabel");
const pcSecretSection = $("pcSecretSection");
const pcSecretText = $("pcSecretText");
const pcSecretToggle = $("pcSecretToggle");
const pcSecretLabel = $("pcSecretLabel");
const pcClose = $("pcClose");
const btnRemoveNpcProfile = $("btnRemoveNpcProfile");

const playerCardDetailExpanded = { uid: null, lore: false, secret: false };

function playerCardDetailCanExpand(text) {
  const value = String(text || "").trim();
  return value.length > 90 || /[\r\n]/.test(value);
}

function syncPlayerCardDetailUI(textEl, toggleEl, expanded) {
  if (!textEl || !toggleEl) return;
  const canExpand = playerCardDetailCanExpand(textEl.textContent || "");
  textEl.classList.toggle("playerCard__detailText--expanded", !!canExpand && !!expanded);
  toggleEl.classList.toggle("hidden", !canExpand);
  toggleEl.setAttribute("aria-expanded", canExpand && expanded ? "true" : "false");
  toggleEl.textContent = canExpand && expanded ? "Show less" : "Read more";
}

function setPlayerCardDetailBlock(sectionEl, textEl, toggleEl, config = {}) {
  if (!sectionEl || !textEl || !toggleEl) return;
  const text = config?.text;
  const expanded = config?.expanded;
  const locked = config?.locked === true;
  const labelEl = config?.labelEl || null;
  const labelText = String(config?.label || "").trim();
  const value = String(text || "").trim();
  const hasText = value.length > 0;
  sectionEl.classList.toggle("hidden", !hasText);
  sectionEl.classList.toggle("playerCard__detail--locked", hasText && locked);
  if (labelEl && labelText) labelEl.textContent = labelText;
  textEl.textContent = hasText ? value : "";
  textEl.classList.toggle("playerCard__detailText--locked", hasText && locked);
  syncPlayerCardDetailUI(textEl, toggleEl, expanded);
}

function openPlayerCard(uid, options = {}) {
  if (!playerCardOverlay) return;
  const explicitMember = options?.member || null;
  const rosterMember = (state.partyRoster || []).find((entry) => (entry.id || entry.uid) === uid) || null;
  const player = explicitMember || rosterMember || (state.activePlayers || []).find(p => (p.id || p.uid) === uid) || null;
  const viewerRole = options?.viewerRole || state.role || "player";
  const viewerIsGM = viewerRole === "dm";
  const isNpc = player?.isNpc === true;
  const isRevealedNpc = player?.isRevealed === true;
  const isGM = uid === state.gmUid;
  const profile = !isNpc
    ? (
      getCachedProfile(uid, isGM ? "dm" : "player")
      || getCachedProfile(uid, isGM ? "player" : "dm")
    )
    : null;

  const nick = (() => {
    if (isNpc) {
      if (viewerIsGM || isRevealedNpc) {
        return String(player?.nickname || "Unknown Enemy").trim() || "Unknown Enemy";
      }
      return "Unknown";
    }
    return String(profile?.displayName || player?.nickname || player?.displayName || "Unknown").trim() || "Unknown";
  })();

  const avatarUrl = (() => {
    if (isNpc) {
      return viewerIsGM || isRevealedNpc ? String(player?.avatarUrl || "").trim() : "";
    }
    return String(profile?.avatarUrl || player?.avatarUrl || "").trim();
  })();

  // If profile data is not cached yet, fetch it once and refresh the open card.
  if (!isNpc && (!profile || !String(profile?.avatarUrl || "").trim())) {
    const preferredRole = isGM ? "dm" : "player";
    const alternateRole = preferredRole === "dm" ? "player" : "dm";
    Promise.all([
      loadUserProfile(uid, { role: preferredRole, force: true }),
      loadUserProfile(uid, { role: alternateRole, force: true }),
    ])
      .then(() => {
        if (playerCardOverlay && !playerCardOverlay.classList.contains("hidden") && playerCardOverlay._viewingUid === uid) {
          openPlayerCard(uid, options);
        }
      })
      .catch(() => {});
  }

  const status = (() => {
    if (isNpc) {
      if (!viewerIsGM && !isRevealedNpc) return { cls: "offline", label: "Unknown" };
      return { cls: "dead", label: isRevealedNpc ? "NPC" : "Hidden NPC" };
    }
    return getOnlineStatus(player?.lastSeenAt, player?.id || player?.uid);
  })();

  const linkedNpcHandout = (() => {
    if (!isNpc) return null;
    const npcHandoutId = String(player?.npcHandoutId || "").trim();
    if (npcHandoutId) {
      return (state.gmHandoutsRaw || []).find((entry) => entry?.id === npcHandoutId) || null;
    }
    return findLinkedNpcHandoutByName(nick) || null;
  })();

  // Banner color: use handout accentColor for NPCs
  const pcBanner = playerCardOverlay?.querySelector(".playerCard__banner");
  if (pcBanner) {
    if (isNpc) {
      const accent = String(linkedNpcHandout?.accentColor || "").trim() || "#5b4d8a";
      pcBanner.style.background = `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`;
    } else {
      pcBanner.style.background = "";
      const _bannerAvatarSrc = resolveDisplayAvatar(avatarUrl, uid);
      if (_bannerAvatarSrc) {
        const _capturedUid = uid;
        extractDominantColor(_bannerAvatarSrc).then((color) => {
          if (color && playerCardOverlay._viewingUid === _capturedUid) {
            const m = color.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
            if (m) {
              const [, r, g, b] = m;
              const start = vibrantizeRgbColorString(color, { minSat: 0.74, satBoost: 0.32, minLight: 0.58, lightBoost: 0.22 }) || color;
              const end = vibrantizeRgbColorString(color, { minSat: 0.66, satBoost: 0.22, minLight: 0.5, lightBoost: 0.1 }) || color;
              pcBanner.style.background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
            }
          }
        });
      }
    }
  }

  // Avatar: show image or initial
  if (pcAvatar) {
    const resolvedAvatarUrl = resolveDisplayAvatar(avatarUrl, uid);
    pcAvatar.innerHTML = resolvedAvatarUrl
      ? `<img src="${escapeHtml(resolvedAvatarUrl)}" alt="${escapeHtml(nick)}" />`
      : escapeHtml((nick.charAt(0) || "?").toUpperCase());
  }

  if (pcName) pcName.textContent = nick;
  if (pcRole) {
    if (isNpc) pcRole.textContent = "NPC";
    else pcRole.textContent = uid === state.gmUid ? "GM" : "PLAYER";
  }
  if (pcStatus) {
    if (isNpc) {
      pcStatus.textContent = (!viewerIsGM && !isRevealedNpc)
        ? "Identity hidden"
        : (isRevealedNpc ? "Revealed NPC" : "Hidden NPC");
    } else {
      pcStatus.textContent = status.label === "Online" ? "Online" : `Last seen: ${formatLastSeenDate(player?.lastSeenAt)}`;
    }
  }
  if (pcStatusDot) pcStatusDot.className = `status-dot status-dot--${status.cls}`;

  const normalizedUid = String(uid || "").trim();
  if (playerCardDetailExpanded.uid !== normalizedUid) {
    playerCardDetailExpanded.uid = normalizedUid;
    playerCardDetailExpanded.lore = false;
    playerCardDetailExpanded.secret = false;
  }

  const playerPublicBio = String(profile?.bio || player?.bio || "").trim();
  const npcPublicBio = String(linkedNpcHandout?.publicContent || player?.bio || "").trim();
  const npcSecretBio = String(linkedNpcHandout?.secretContent || "").trim();
  const canShowNpcBio = isNpc && (viewerIsGM || isRevealedNpc);
  const canShowPlayerBio = !isNpc && playerPublicBio.length > 0;
  const hasNpcSecret = isNpc && npcSecretBio.length > 0;
  const canShowNpcSecret = isNpc && (viewerIsGM || linkedNpcHandout?.secretRevealed === true);
  const showLockedNpcSecret = hasNpcSecret && !canShowNpcSecret;
  setPlayerCardDetailBlock(
    pcLoreSection,
    pcLoreText,
    pcLoreToggle,
    {
      text: isNpc ? (canShowNpcBio ? npcPublicBio : "") : (canShowPlayerBio ? playerPublicBio : ""),
      expanded: playerCardDetailExpanded.lore,
      labelEl: pcLoreLabel,
      label: isNpc ? "Lore" : "Bio",
      locked: false,
    }
  );
  setPlayerCardDetailBlock(
    pcSecretSection,
    pcSecretText,
    pcSecretToggle,
    {
      text: canShowNpcSecret ? npcSecretBio : (showLockedNpcSecret ? "Hidden until revealed by the GM." : ""),
      expanded: playerCardDetailExpanded.secret,
      labelEl: pcSecretLabel,
      label: "Hidden Intel",
      locked: showLockedNpcSecret,
    }
  );

  if (pcItemsLabel) pcItemsLabel.textContent = isNpc ? "Initiative" : "Items";
  if (pcCoinsLabel) pcCoinsLabel.textContent = isNpc ? "Intel" : "Coins";

  if (isNpc) {
    const initiativeValue = getInitiativeValue(player);
    if (pcItems) pcItems.textContent = initiativeValue === null ? "-" : String(initiativeValue);
    if (pcCoins) pcCoins.textContent = (!viewerIsGM && !isRevealedNpc) ? "Unknown" : "Revealed";
  } else {
    const itemCount = (state.inventoryItems || []).filter((i) => i.ownerUid === uid).length;
    const wallet = state.wallets?.[uid] || {};
    const totalCoins = (wallet.platinum || 0) + (wallet.gold || 0) + (wallet.silver || 0) + (wallet.bronze || 0);
    if (pcItems) pcItems.textContent = itemCount;
    if (pcCoins) pcCoins.textContent = totalCoins;
  }

  // GM-only: show Edit Stats button and quick stat editor
  const btnEditPlayerStats = $("btnEditPlayerStats");
  const pcQuickStatsWrap = $("pcQuickStatsWrap");
  const pcQuickStatsGrid = $("pcQuickStatsGrid");
  const btnSavePcStats = $("btnSavePcStats");
  const canEditStats = viewerIsGM && !isNpc;
  if (btnEditPlayerStats) btnEditPlayerStats.classList.toggle("hidden", !canEditStats);
  if (pcQuickStatsWrap) pcQuickStatsWrap.classList.add("hidden");

  // Store currently viewed player uid for stat saving
  playerCardOverlay._viewingUid = uid;

  if (canEditStats && pcQuickStatsGrid) {
    const qs = player?.quickStats || {};
    pcQuickStatsGrid.innerHTML = PROFILE_STAT_KEYS.map(k =>
      `<div class="profileStatRow"><label class="label small">${k}</label><input class="input input--small pcStat" data-key="${k}" type="number" min="0" value="${qs[k] ?? ""}"></div>`
    ).join("");
  }

  if (btnEditPlayerStats) {
    btnEditPlayerStats.onclick = () => {
      pcQuickStatsWrap?.classList.toggle("hidden");
    };
  }

  if (btnSavePcStats) {
    btnSavePcStats.onclick = async () => {
      const stats = {};
      pcQuickStatsGrid?.querySelectorAll(".pcStat").forEach(inp => {
        const val = inp.value.trim();
        if (val) stats[inp.dataset.key] = Number(val);
      });
      await savePlayerQuickStats(playerCardOverlay._viewingUid, stats);
    };
  }

  // GM-only: show Message button for players (not for the GM themselves)
  const showMsg = viewerIsGM && !isNpc && uid !== state.uid;
  const showKick = viewerIsGM && !isNpc && uid !== state.uid;
  const showRemoveNpc = viewerIsGM && isNpc;
  const hasInitiative = getInitiativeValue(player) !== null;
  const showClearInit = viewerIsGM && hasInitiative;
  const showReaddInit = viewerIsGM && !hasInitiative;
  const btnClearInitiative = $("btnClearInitiative");
  const btnReaddInitiative = $("btnReaddInitiative");
  if (btnMessagePlayer) btnMessagePlayer.classList.toggle("hidden", !showMsg);
  if (btnKickPlayer) btnKickPlayer.classList.toggle("hidden", !showKick);
  if (btnRemoveNpcProfile) btnRemoveNpcProfile.classList.toggle("hidden", !showRemoveNpc);
  if (btnClearInitiative) btnClearInitiative.classList.toggle("hidden", !showClearInit);
  if (btnReaddInitiative) btnReaddInitiative.classList.toggle("hidden", !showReaddInit);
  if (pcMessageWrap) pcMessageWrap.classList.add("hidden");
  if (pcMessageInput) pcMessageInput.value = "";

  if (showClearInit && btnClearInitiative) {
    btnClearInitiative.onclick = async () => {
      try {
        const ref = doc(db, "sessions", state.sessionId, "players", uid);
        await updateDoc(ref, { initiative: null, updatedAt: serverTimestamp() });
        if (state.currentTurnUid === uid) {
          state.currentTurnUid = null;
          state.turnRound = Math.max(1, state.turnRound);
        }
        closePlayerCard();
        showToast(`${nick}'s initiative cleared.`, "success");
      } catch (err) {
        console.error("Clear initiative failed:", err);
        showToast("Failed to clear initiative.", "error");
      }
    };
  } else if (btnClearInitiative) {
    btnClearInitiative.onclick = null;
  }

  if (showReaddInit && btnReaddInitiative) {
    btnReaddInitiative.onclick = async () => {
      const defaultInit = (() => {
        if (isNpc) return "";
        const quick = parseNumericStat(player?.quickStats?.initiative);
        return quick === null ? "" : String(quick);
      })();
      const raw = window.prompt(`Set initiative for ${nick}`, defaultInit || "");
      if (raw === null) return;
      const value = parseNumericStat(raw);
      if (value === null) {
        showToast("Enter a valid initiative value.", "error");
        return;
      }
      try {
        const ref = doc(db, "sessions", state.sessionId, "players", uid);
        await updateDoc(ref, { initiative: value, updatedAt: serverTimestamp() });
        if (!state.currentTurnUid) {
          state.currentTurnUid = uid;
          state.turnRound = Math.max(1, state.turnRound || 1);
          persistTurnState();
        }
        closePlayerCard();
        showToast(`${nick} re-added to initiative.`, "success");
      } catch (err) {
        console.error("Re-add initiative failed:", err);
        showToast("Failed to re-add initiative.", "error");
      }
    };
  } else if (btnReaddInitiative) {
    btnReaddInitiative.onclick = null;
  }

  if (showKick && btnKickPlayer) {
    btnKickPlayer.onclick = () => {
      kickPartyMember(uid);
    };
  } else if (btnKickPlayer) {
    btnKickPlayer.onclick = null;
  }

  if (showRemoveNpc && btnRemoveNpcProfile) {
    btnRemoveNpcProfile.onclick = () => {
      removeNpcPartyMember(uid);
    };
  } else if (btnRemoveNpcProfile) {
    btnRemoveNpcProfile.onclick = null;
  }

  if (showMsg && btnMessagePlayer) {
    btnMessagePlayer.onclick = () => {
      pcMessageWrap?.classList.toggle("hidden");
      if (!pcMessageWrap?.classList.contains("hidden")) pcMessageInput?.focus();
    };
  }
  if (showMsg && btnSendPlayerMessage) {
    btnSendPlayerMessage.onclick = async () => {
      const text = pcMessageInput?.value?.trim();
      if (!text) { pcMessageInput?.focus(); return; }
      try {
        const statusNow = getOnlineStatus(player?.lastSeenAt, player?.id || player?.uid).label;
        await createNotification(uid, "gmMessage", text);
        const statusHint = statusNow === "Online"
          ? "player is online now"
          : "player may receive it when they return";
        showToast(`Message sent to ${nick} (${statusHint}).`, "success", 2400);
        if (pcMessageInput) pcMessageInput.value = "";
        if (pcMessageWrap) pcMessageWrap.classList.add("hidden");
      } catch (err) {
        console.error("GM message failed:", err);
        showToast("Failed to send message.", "error");
      }
    };
  }

  playerCardOverlay.classList.remove("hidden");
  playerCardOverlay.setAttribute("aria-hidden", "false");
}

function closePlayerCard() {
  if (!playerCardOverlay) return;
  playerCardOverlay.classList.add("hidden");
  playerCardOverlay.setAttribute("aria-hidden", "true");
}

pcClose?.addEventListener("click", closePlayerCard);
pcLoreToggle?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  playerCardDetailExpanded.lore = !playerCardDetailExpanded.lore;
  syncPlayerCardDetailUI(pcLoreText, pcLoreToggle, playerCardDetailExpanded.lore);
});
pcSecretToggle?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  playerCardDetailExpanded.secret = !playerCardDetailExpanded.secret;
  syncPlayerCardDetailUI(pcSecretText, pcSecretToggle, playerCardDetailExpanded.secret);
});
playerCardOverlay?.addEventListener("click", (e) => {
  if (e.target === playerCardOverlay) closePlayerCard();
});

if (playerListContent) {
  playerListContent.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const trigger = target.closest(".playerCard-mini");
    if (!(trigger instanceof HTMLElement)) return;

    const uid = String(trigger.dataset.uid || "").trim();
    if (!uid) return;
    openPlayerCard(uid);
    playerListDropdown?.classList.add("hidden");
  });
}

// ---- 14) GM: ambience controls ----
// TODO: SOUND REMINDER - User will provide additional sound files for the
// sound/ambience system later. Currently only Forest.mp3 exists in audio/.
// When new sounds are added, update the track selector options in index.html
// and add corresponding URL mappings in the ambience track resolution code.
//
// BEGINNER NOTE - How ambience syncs across devices:
// The GM writes ambience state {track, volume, isPlaying} to Firestore.
// Every player's onSnapshot listener picks up the change and calls
// applyAmbience() locally. The track name maps to an audio file URL.
// Play/pause and volume are applied to a shared <audio> element.

// GM play/pause controls (explicit)
if (btnGMPlay) {
  // Writes "isPlaying=true" so all listeners (GM + players) start audio.
  btnGMPlay.onclick = async () => {
    const desired = {
      track: gmAmbience.value,
      volume: Number(gmVolume.value),
      isPlaying: true,
    };

    // Prime source + volume inside this user gesture for stricter autoplay policies.
    try {
      ensureAmbienceAudioMounted();
      setAmbienceTrack(desired.track);
      const ok = await attemptAmbiencePlay(desired.volume);
      if (!ok) throw new Error("play-blocked");
    } catch {
      requestAmbienceResume();
      showToast("Audio blocked by browser. Tap anywhere and press Play again.", "info", 2200);
    }

    // Apply instantly for local responsiveness, then persist to Firestore.
    applyAmbience(desired);
    syncAmbienceButtonState(true);

    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return;
    await updateDoc(sessionRef, {
      ambience: desired,
      updatedAt: serverTimestamp(),
    });
  };
}

if (btnGMPause) {
  // Writes "isPlaying=false" so all listeners pause audio.
  btnGMPause.onclick = async () => {
    const desired = {
      track: gmAmbience.value,
      volume: Number(gmVolume.value),
      isPlaying: false,
    };

    applyAmbience(desired);
    syncAmbienceButtonState(false);

    const sessionRef = doc(db, "sessions", state.sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return;
    await updateDoc(sessionRef, {
      ambience: desired,
      updatedAt: serverTimestamp(),
    });
  };
}

gmAmbience && (gmAmbience.onchange = async () => {
  // Selecting a new ambience track immediately updates session ambience state.
  const sessionRef = doc(db, "sessions", state.sessionId);
  await updateDoc(sessionRef, {
    ambience: {
      track: gmAmbience.value,
      volume: Number(gmVolume.value),
      isPlaying: true,
    },
    updatedAt: serverTimestamp(),
  });
});

gmVolume && (gmVolume.oninput = async () => {
  // Slider updates volume while preserving current play/pause status.
  const sessionRef = doc(db, "sessions", state.sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return;
  const cur = snap.data().ambience?.isPlaying ?? false;

  await updateDoc(sessionRef, {
    ambience: {
      track: gmAmbience.value,
      volume: Number(gmVolume.value),
      isPlaying: cur,
    },
    updatedAt: serverTimestamp(),
  });
});

// ---- 15) Player: join + live view ----
// The player joins by entering a joinTag (or session ID), nickname, and PIN.
// BEGINNER NOTE � PIN verification flow:
// 1. Player types the plaintext PIN
// 2. We hash it with SHA-256 (same algorithm used when creating the session)
// 3. We compare the hash against the one stored in Firestore
// 4. If they match, the player is allowed in
// This way, even if someone reads the Firestore database directly,
// they see a hash � not the actual PIN digits.
async function joinPlayerSession(joinTagRaw, nickRaw, pinRaw) {
  // Clear previous message for cleaner validation feedback.
  plJoinMsg.textContent = "";

  const joinTagVariants = getJoinTagLookupVariants(joinTagRaw);
  const joinTagInput = joinTagVariants[0] || "";
  const nick = String(nickRaw || "").trim();
  const pinPlain = String(pinRaw || "").trim();

  if (!joinTagInput) { plJoinMsg.textContent = "Session tag is required."; return false; }
  if (!nick) { plJoinMsg.textContent = "Nickname is required."; return false; }
  if (!/^\d{4,8}$/.test(pinPlain)) { plJoinMsg.textContent = "PIN must be 4�8 digits."; return false; }

  try {
    showAuthLoading("Joining session...");

    let sessionDoc = null;

    // Resolve by joinTag first (supports both legacy `#` and current `-`).
    for (const candidate of joinTagVariants) {
      const tagSnap = await getDocs(query(collection(db, "sessions"), where("joinTag", "==", candidate)));
      if (!tagSnap.empty) {
        sessionDoc = tagSnap.docs[0];
        break;
      }
    }

    if (!sessionDoc) {
      // Backward compatibility: allow raw session doc id if pasted.
      for (const candidate of joinTagVariants) {
        const legacyRef = doc(db, "sessions", candidate);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          sessionDoc = legacySnap;
          break;
        }
      }
    }

    if (!sessionDoc) { plJoinMsg.textContent = "Session not found."; return false; }

    // Compare hashes, not raw pin strings.
    const pinHash = await sha256(pinPlain);
    const s = sessionDoc.data();
    const sessionId = sessionDoc.id;

    if (isExpiredOneShotSession(s)) {
      await tryDeleteExpiredOneShotSession(sessionId, s);
      plJoinMsg.textContent = "This one-shot has expired.";
      return false;
    }

    if (s.pinHash !== pinHash) { plJoinMsg.textContent = "Incorrect PIN."; return false; }

    state.role = "player";
    state.sessionId = sessionId;
    state.joinTag = toLegacyHashJoinTag(s.joinTag || joinTagInput);
    state.joinLink = buildSessionJoinLink(state.joinTag);
    state.playerNick = nick;
    state._isOneShotSession = !!s.isOneShot;
    persistLocal();

    // Upsert player profile for this session.
    const playerRef = doc(db, "sessions", sessionId, "players", state.uid);
    await setDoc(playerRef, {
      nickname: nick,
      joinedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      isNpc: false,
      isRevealed: true,
      initiative: null,
    }, { merge: true });

    // Player clients cannot create notifications by rules; GM listener broadcasts join notices.

    if (s.isOneShot) {
      rememberRecentOneShotJoin({
        sessionId,
        joinTag: state.joinTag,
        nickname: nick,
        pin: pinPlain,
        sessionName: s.name || "",
        expiresAtMs: getOneShotExpiryMs(s),
      });
    }

    rememberJoinedSession({
      sessionId,
      joinTag: state.joinTag,
      sessionName: s.name || "",
      pin: pinPlain,
    });

    try {
      const ownProfile = await loadUserProfile(state.uid, { role: "player" });
      if (!ownProfile.displayName) {
        const merged = {
          ...ownProfile,
          displayName: nick,
        };
        await setDoc(getUserProfileRef(state.uid), {
          displayName: nick,
          roleProfiles: {
            player: {
              displayName: nick,
            },
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setCachedProfile(state.uid, "player", merged);
      }
    } catch (profileErr) {
      if (!isPermissionDenied(profileErr)) throw profileErr;
      console.warn("Profile seed skipped due to permissions.");
    }

    await openPlayerView(s.name ?? "Session");
    showToast("Joined session!", "success");

    // Write Firestore membership for cross-device session discovery
    writeMembership({ role: "player", sessionName: s.name || "", joinTag: state.joinTag }).catch(() => {});

    return true;
  } catch (e) {
    console.error(e);
    plJoinMsg.textContent = "Join failed. Check internet/Firebase/rules.";
    return false;
  } finally {
    hideAuthLoading();
  }
}

btnJoin && (btnJoin.onclick = async () => {
  const existingNick = String(plNick?.value || "").trim() || getPlayerNickname();
  const hadNickname = !!existingNick;
  const nick = existingNick || getGuestNicknameFallback();
  if (plNick && !String(plNick.value || "").trim()) {
    plNick.value = nick;
  }

  const joined = await joinPlayerSession(plSessionId?.value || "", nick, plPin?.value || "");
  if (joined && !hadNickname) {
    await requireNickname({ forcePrompt: true });
  }
});

plRecentList?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".joinRecentItem");
  if (!(button instanceof HTMLElement)) return;
  const sessionId = String(button.dataset.recentSession || "").trim();
  if (!sessionId) return;

  const entry = getRecentOneShotEntries().find((item) => item.sessionId === sessionId);
  if (!entry) return;

  plSessionId && (plSessionId.value = entry.joinTag || sessionId);
  plNick && (plNick.value = entry.nickname || "");
  plPin && (plPin.value = entry.pin || "");
  joinPlayerSession(plSessionId?.value || "", plNick?.value || "", plPin?.value || "");
});

async function openPlayerView(sessionName) {
  requestWakeLock();
  // Player view subscribes to:
  // - handouts collection (then filters revealed items client-side)
  // - session doc (for ambience changes)
  // This gives instant updates when GM reveals content or changes audio.
  cleanupListeners();

  // Player can hear audio immediately after joining.
  soundEnabled = true;
  localStorage.setItem("tv_soundEnabled", "1");
  try { syncSoundToggleUI(); } catch (_) {}

  // Session name stored for Settings display; dashboard uses static wordmark.
  state.sessionName = sessionName || "Session";

// Handouts listener:
// we receive all docs then filter locally to revealed items for player UI.
// (Server-side rules should still enforce security for truly sensitive data.)
const handoutsRef = collection(db, "sessions", state.sessionId, "handouts");
showSkeletonCards(plHandoutList, 3);

function getPlayerVisibleHandouts() {
  const raw = state.gmHandoutsRaw || [];
  const revealed = raw.filter((h) => h.revealed === true);
  const unclaimedFiltered = revealed.filter((h) => {
    const claimedByUid = String(h?.claimedByUid || "").trim();
    return !claimedByUid;
  });
  const mapFiltered = unclaimedFiltered.filter((h) => {
    if (!isMapHandoutType(h?.type)) return true;
    const mapVisibleUid = String(h?.mapVisibleToUid || "").trim();
    if (!mapVisibleUid) return true;
    return mapVisibleUid === state.uid;
  });
  const npcFiltered = mapFiltered.filter((h) => {
    // Hide NPC handouts that are currently in initiative (active combatants)
    if (String(h.type || "").toLowerCase() !== "npc") return true;
    const roster = state.partyRoster || [];
    return !roster.some((p) =>
      p?.isNpc === true &&
      p?.initiative != null &&
      (p?.npcHandoutId === h.id ||
        (!p?.npcHandoutId && normalizeNpcSyncKey(p?.nickname) === normalizeNpcSyncKey(h?.title)))
    );
  });
  const sorted = npcFiltered.sort((a, b) => {
    const ams = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
    const bms = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
    return bms - ams;
  });
  if (sorted.length > 0) return sorted;

  // Defensive fallback for legacy / mismatched data states:
  // never show an empty handout feed if revealed items are present.
  return unclaimedFiltered.sort((a, b) => {
    const ams = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
    const bms = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
    return bms - ams;
  });
}

state.unsubHandouts = onSnapshot(handoutsRef, (snap) => {
  setLiveTick();

  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  state.gmHandoutsRaw = all;
  const visibleItems = hydratePlayerHandoutSearchIndex(getPlayerVisibleHandouts());
  state.playerVisibleHandoutsCache = visibleItems;
  renderPlayerHandouts(visibleItems);
  if (currentScreenKey === SCREEN_KEYS.PLAYER_INVENTORY) {
    renderInventoryScreen();
  }
}, (err) => {
  console.error("Player handouts listener error:", err);
});


  // Session listener provides ambience changes in realtime.
  // Also detects session deletion (when the doc disappears).
  const sessionRef = doc(db, "sessions", state.sessionId);
  state.unsubSession = onSnapshot(sessionRef, (snap) => {
    if (!snap.exists()) {
      // Session was deleted by GM � show blocking overlay.
      if (sessionDeletedModal) animateModalIn(sessionDeletedModal);
      return;
    }
    setLiveTick();
    const s = snap.data();
    state.gmUid = String(s?.gmUid || "").trim() || null;
    state.battleActive = s?.battleActive === true;
    state.currentTurnUid = s.currentTurnUid || null;
    state.turnRound = s.turnRound || 1;
    syncPartyBattleUi();
    updatePlayerTurnNav();
    if (state.partyRoster) renderPlayerPartyPanel(state.partyRoster);
    renderAtmospherePanel(s.ambience);
    applyAmbience(s.ambience);
  });

  // Players listener so player-side can show online count and profiles.
  const plPlayersRef = collection(db, "sessions", state.sessionId, "players");
  let hasSeenOwnPlayerRow = false;
  state.unsubPlayers = onSnapshot(query(plPlayersRef, orderBy("lastSeenAt", "desc")), (snap) => {
    const roster = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const selfPresent = roster.some((entry) => (entry.id || entry.uid) === state.uid);
    if (selfPresent) {
      hasSeenOwnPlayerRow = true;
    } else if (hasSeenOwnPlayerRow) {
      leaveCurrentSessionLocally("You were removed from this session by the GM.", "error");
      return;
    }

    state.partyRoster = roster;
    state.activePlayers = roster.filter((entry) => entry?.isNpc !== true);
    hydrateActivePlayerProfiles(state.activePlayers).catch(() => {});
    renderPlayerPartyPanel(roster);
    // Re-filter handouts: NPC handouts in initiative should be hidden from players
    if (state.gmHandoutsRaw) {
      const visibleItems = hydratePlayerHandoutSearchIndex(getPlayerVisibleHandouts());
      state.playerVisibleHandoutsCache = visibleItems;
      renderPlayerHandouts(visibleItems);
    }
  });

  // Subscribe to inventory & wallet data for the inventory screen.
  subscribeInventory();

  // Show bell and subscribe to notifications.
  btnNotifBell?.classList.remove("hidden");
  subscribeNotifications();

  // Subscribe to nugget balance.
  subscribeNuggets();

  showOnly(SCREEN_KEYS.PLAYER_VIEW);
  ensureOwnProfileLoaded().catch(() => {});
  startHeartbeat();

  // "Enter the Tavern" overlay � optional cinematic step after successful join.
  // This is not authentication; it is shown in player flow and can be skipped per-session.
  const _tavernOverlay = $("enterTavernOverlay");
  const _enterBtn = $("btnEnterTavern");
  const _skipCheckbox = $("tavernSkipSession");
  const _skipKey = `tv:tavern-skip:${state.sessionId || "unknown"}`;
  const _skipForThisSession = sessionStorage.getItem(_skipKey) === "1";

  if (_tavernOverlay && !_tavernOverlay._hasEntered && !_skipForThisSession) {
    _tavernOverlay.classList.remove("hidden");
    if (_skipCheckbox) _skipCheckbox.checked = false;
    if (_enterBtn) {
      _enterBtn.onclick = () => {
        if (_skipCheckbox?.checked) {
          sessionStorage.setItem(_skipKey, "1");
        }
        _tavernOverlay.classList.add("tavern-overlay--leaving");
        const _onEnd = () => {
          _tavernOverlay.classList.add("hidden");
          _tavernOverlay.classList.remove("tavern-overlay--leaving");
        };
        _tavernOverlay.addEventListener("animationend", _onEnd, { once: true });
        setTimeout(_onEnd, UI_TIMERS.ANIMATION_FALLBACK_MS); // fallback if animationend doesn't fire
        _tavernOverlay._hasEntered = true;
      };
    }
  }

  // First-time onboarding tour
  setTimeout(startOnboarding, 1000);

  // Auto-apply character template from QR scan
  if (state._pendingTemplateId && state.sessionId && state.uid) {
    const tid = state._pendingTemplateId;
    state._pendingTemplateId = null;
    try {
      const tSnap = await getDoc(doc(db, "sessions", state.sessionId, "characterTemplates", tid));
      if (tSnap.exists()) {
        const t = tSnap.data();
        const profileData = {};
        if (t.name) profileData.displayName = t.name;
        if (t.bio) profileData.bio = t.bio;
        if (t.quickStats) {
          PROFILE_STAT_KEYS.forEach(k => { if (t.quickStats[k] != null) profileData[k] = t.quickStats[k]; });
        }
        if (Object.keys(profileData).length > 0) {
          await setDoc(doc(db, "users", state.uid), profileData, { merge: true });
        }
        if (t.name) {
          applyResolvedNicknameState(t.name, { overwriteInput: true });
          await syncNicknameToProfile(t.name);
        }
        await updateDoc(doc(db, "sessions", state.sessionId, "characterTemplates", tid), {
          assignedToUid: state.uid,
          assignmentStatus: "accepted"
        });
        showToast(`Character "${t.name}" applied!`, "info");
      }
    } catch (e) { console.warn("autoApplyTemplate:", e); }
  }
}

// ---- 16) Player: render list ----
// BEGINNER NOTE: Rendering pattern:
// Every time data changes (via onSnapshot), we rebuild the entire list HTML.
// This is simpler than tracking individual DOM diffs. For small lists (<100
// items), full re-render is fast enough that users don't notice a flicker.
// Larger apps use virtual DOM libraries (React, Vue) for this, but plain
// innerHTML is perfectly fine at TomeVault's scale.

const playerHandoutExpandedIds = new Set();
let playerHandoutRenderToken = 0;
const PLAYER_HANDOUT_RENDER_CHUNK_SIZE = 18;

function scheduleIdleWork(task) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(task, { timeout: 180 });
    return;
  }
  setTimeout(task, 0);
}

function queuePlayerPlaceholderRefinement({ handout, imgEl, renderToken, fallbackUrl }) {
  if (!imgEl || !handout) return;
  const context = {
    title: String(handout.title || ""),
    publicContent: String(handout.publicContent || ""),
    type: String(handout.type || "").toLowerCase(),
    npcDisposition: String(handout.npcDisposition || "").toLowerCase(),
  };

  scheduleIdleWork(() => {
    if (!imgEl.isConnected) return;
    if (String(imgEl.dataset.renderToken || "") !== String(renderToken)) return;
    const best = selectBestPlaceholderImage(context);
    const resolved = String(best?.url || fallbackUrl || "placeholders/Prompt1image1_1.png").trim();
    if (!resolved) return;
    if (imgEl.src.endsWith(resolved)) return;
    imgEl.src = resolved;
  });
}

function getPlayerHandoutPreviewText(handout) {
  return String(handout?.publicContent || "").trim();
}

function playerHandoutPreviewCanExpand(previewText) {
  return previewText.length > 90 || /[\r\n]/.test(previewText);
}

function isPlayerHandoutPreviewExpanded(handoutId) {
  const normalizedId = String(handoutId || "").trim();
  return normalizedId ? playerHandoutExpandedIds.has(normalizedId) : false;
}

function setPlayerHandoutPreviewExpanded(handoutId, isExpanded) {
  const normalizedId = String(handoutId || "").trim();
  if (!normalizedId) return;
  if (isExpanded) playerHandoutExpandedIds.add(normalizedId);
  else playerHandoutExpandedIds.delete(normalizedId);
}

function hydratePlayerHandoutSearchIndex(items) {
  if (!Array.isArray(items)) return [];
  items.forEach((handout) => {
    if (!handout || typeof handout !== "object") return;
    const title = String(handout.title || "").toLowerCase();
    const description = String(handout.publicContent || "").toLowerCase();
    handout._playerSearchText = `${title}\n${description}`;
  });
  return items;
}

function getCurrentPlayerVisibleHandouts({ forceRebuild = false } = {}) {
  if (!forceRebuild && Array.isArray(state.playerVisibleHandoutsCache)) {
    return state.playerVisibleHandoutsCache;
  }
  const visibleItems = hydratePlayerHandoutSearchIndex(getPlayerVisibleHandouts());
  state.playerVisibleHandoutsCache = visibleItems;
  return visibleItems;
}

function renderPlayerHandouts(items) {
  // Player list intentionally mirrors GM rendering for a consistent visual model.
  // Player list renderer mirrors GM renderer style for consistency.
  const queryText = String(state.playerHandoutSearchQuery || "").trim().toLowerCase();
  const renderToken = ++playerHandoutRenderToken;
  const sourceItems = Array.isArray(items) ? items : [];
  const filteredItems = queryText
    ? sourceItems.filter((handout) => {
        const indexedText = String(handout?._playerSearchText || "");
        return indexedText.includes(queryText);
      })
    : sourceItems;

  if (plHandoutList._playerRenderRaf) {
    cancelAnimationFrame(plHandoutList._playerRenderRaf);
    plHandoutList._playerRenderRaf = 0;
  }

  plHandoutList.innerHTML = "";
  plHandoutEmpty.classList.toggle("hidden", filteredItems.length > 0);

  // Reset empty-state hint to the standard player-facing copy.
  const emptyHint = plHandoutEmpty.querySelector(".emptyState__hint");
  if (emptyHint && filteredItems.length === 0) {
    emptyHint.textContent = sourceItems.length === 0
      ? "The GM will reveal handouts as your adventure unfolds."
      : "No handouts match your search.";
  }

  let renderedCount = 0;
  const finalizePlayerHandoutRender = () => {
    // Safety net: if items existed but every one failed to render, show empty state.
    if (filteredItems.length > 0 && renderedCount === 0) {
      plHandoutEmpty.classList.remove("hidden");
      if (emptyHint) {
        emptyHint.textContent = "Some handouts could not be rendered on this device.";
      }
    }
    if (queryText) {
      if (plHandoutList._virtualSetupRaf) {
        cancelAnimationFrame(plHandoutList._virtualSetupRaf);
        plHandoutList._virtualSetupRaf = 0;
      }
      if (plHandoutList._virtualObserver) {
        plHandoutList._virtualObserver.disconnect();
        plHandoutList._virtualObserver = null;
      }
    } else {
      initVirtualScroll(plHandoutList);
    }
  };

  if (filteredItems.length === 0) {
    finalizePlayerHandoutRender();
    return;
  }

  let cursor = 0;
  const renderChunk = () => {
    if (renderToken !== playerHandoutRenderToken) return;
    const fragment = document.createDocumentFragment();
    const limit = Math.min(cursor + PLAYER_HANDOUT_RENDER_CHUNK_SIZE, filteredItems.length);

    for (; cursor < limit; cursor += 1) {
      const h = filteredItems[cursor];
      try {
        const row = document.createElement("div");
        row.className = "item";
        row.style.borderLeft = `4px solid ${h.accentColor || "#f5c82f"}`;
        const primaryImageUrl = String(getVisibleHandoutImageUrl(h, "player", state.uid) || "").trim();
        const avatarImageUrl = String(getHandoutAvatarImageUrl(h) || "").trim();
        const fallbackUrl = "placeholders/Prompt1image1_1.png";
        const visibleImageUrl = primaryImageUrl || avatarImageUrl || fallbackUrl;
        const displayTitle = getSafeHandoutTitle(h);
        // Same compatibility strategy as GM list.
        let iconMarkup = '<span class="itemIconSvg" aria-hidden="true">📜</span>';
        try {
          const normalizedIcon = normalizeIconKey(h.iconKey || h.iconEmoji);
          if (/\p{Extended_Pictographic}/u.test(String(normalizedIcon || ""))) {
            iconMarkup = `<span class="itemIconSvg" aria-hidden="true">${escapeHtml(normalizedIcon)}</span>`;
          } else {
            iconMarkup = getHeroIconSvg(normalizedIcon, "itemIconSvg");
          }
        } catch (_) {
          iconMarkup = getHeroIconSvg("document", "itemIconSvg");
        }
        const visibilityMeta = `<span class="handoutMetaIcon handoutMetaIcon--visible" title="Visible" aria-label="Visible"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3.2"></circle></svg></span>`;
        const secretMeta = h.secretRevealed
          ? `<span class="handoutMetaIcon handoutMetaIcon--secret" title="Secret revealed" aria-label="Secret revealed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path></svg></span>`
          : `<span class="handoutMetaIcon handoutMetaIcon--secretOff" title="Secret hidden" aria-label="Secret hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="15.5" r="3.5"></circle><path d="M12 15.5h8"></path><path d="M17 12.5v6"></path><path d="M20 13.5v4"></path><path d="M4 20 20 4"></path></svg></span>`;
        const typeTag = `<span class="tag">${escapeHtml((h.type ?? "handout").toUpperCase())}</span>`;
        const previewText = getPlayerHandoutPreviewText(h);
        const hasPreview = previewText.length > 0;
        const previewCanExpand = hasPreview && playerHandoutPreviewCanExpand(previewText);
        if (!previewCanExpand) setPlayerHandoutPreviewExpanded(h.id, false);
        const previewExpanded = false;
        const previewId = `playerHandoutPreview-${String(h.id || "handout")}`;
        const previewHtml = hasPreview
          ? `<p id="${escapeHtml(previewId)}" class="item__preview${previewExpanded ? " item__preview--expanded" : ""}">${escapeHtml(previewText)}</p>`
          : "";
        const previewToggleHtml = "";
        // Set meta/text content via innerHTML, then attach the thumbnail using
        // DOM APIs so it cannot be dropped by the HTML parser under any circumstances.
        row.innerHTML = `
          <div class="item__meta">
            <span class="itemEmoji">${iconMarkup}</span>
            <div class="item__body">
              <div class="handoutMetaRow">
                ${typeTag}
                ${visibilityMeta}
                ${secretMeta}
              </div>
              <div class="item__title"><strong>${escapeHtml(displayTitle)}</strong></div>
              ${previewHtml}
              ${previewToggleHtml}
            </div>
          </div>
        `;
        // Claim button + thumb: grouped in a right-column container using DOM APIs.
        const claimStateCard = getCardClaimState(h, "player");
        const claimBtnEl = document.createElement("button");
        claimBtnEl.type = "button";
        claimBtnEl.className = `cardClaimBtn${claimStateCard.isActive ? " is-claimable" : (claimStateCard.icon === "claim" ? " is-mine" : "")}`;
        claimBtnEl.disabled = !claimStateCard.isActive;
        claimBtnEl.setAttribute("aria-label", claimStateCard.label);
        claimBtnEl.title = claimStateCard.title;
        claimBtnEl.innerHTML = getHeroIconSvg(claimStateCard.icon, "cardClaimBtnIcon");
        if (claimStateCard.isActive) {
          claimBtnEl.addEventListener("click", (e) => {
            e.stopPropagation();
            claimHandoutByCard(h.id, claimBtnEl);
          });
        }
        // Thumbnail + claim button are wrapped together in a right column so
        // the button always appears anchored below the thumb, never floating mid-card.
        const rightCol = document.createElement("div");
        rightCol.className = "item__right";
        const thumbDiv = document.createElement("div");
        thumbDiv.className = "item__thumb";
        const thumbImg = document.createElement("img");
        thumbImg.src = visibleImageUrl;
        thumbImg.dataset.renderToken = String(renderToken);
        thumbImg.alt = `${displayTitle} portrait`;
        thumbImg.addEventListener("error", () => {
          if (!thumbImg.src.endsWith("Prompt1image1_1.png")) {
            thumbImg.src = "placeholders/Prompt1image1_1.png";
          }
        }, { once: true });
        if (!primaryImageUrl && !avatarImageUrl) {
          queuePlayerPlaceholderRefinement({
            handout: h,
            imgEl: thumbImg,
            renderToken,
            fallbackUrl,
          });
        }
        thumbDiv.appendChild(thumbImg);
        rightCol.appendChild(thumbDiv);
        rightCol.appendChild(claimBtnEl);
        row.appendChild(rightCol);
        row.onclick = () => openModal({ ...h, id: h.id }, "player");
        fragment.appendChild(row);
        renderedCount += 1;
      } catch (renderErr) {
        console.error("[TV] renderPlayerHandouts item skipped:", {
          handoutId: h?.id || null,
          title: h?.title || null,
          error: renderErr,
        });

        // Render a robust fallback row so malformed fields cannot blank the list.
        // Use DOM APIs (not template HTML) to avoid parser edge-cases on mobile.
        try {
          const fallbackRow = document.createElement("div");
          fallbackRow.className = "item";
          fallbackRow.style.borderLeft = `4px solid ${h?.accentColor || "#f5c82f"}`;

          const fallbackMeta = document.createElement("div");
          fallbackMeta.className = "item__meta";

          const fallbackBody = document.createElement("div");
          fallbackBody.className = "item__body";

          const fallbackMetaRow = document.createElement("div");
          fallbackMetaRow.className = "handoutMetaRow";

          const fallbackTag = document.createElement("span");
          fallbackTag.className = "tag";
          fallbackTag.textContent = String(h?.type ?? "handout").toUpperCase();
          fallbackMetaRow.appendChild(fallbackTag);

          const fallbackTitleWrap = document.createElement("div");
          fallbackTitleWrap.className = "item__title";
          const fallbackStrong = document.createElement("strong");
          fallbackStrong.textContent = getSafeHandoutTitle(h);
          fallbackTitleWrap.appendChild(fallbackStrong);

          fallbackBody.appendChild(fallbackMetaRow);
          fallbackBody.appendChild(fallbackTitleWrap);
          fallbackMeta.appendChild(fallbackBody);

          const fallbackThumb = document.createElement("div");
          fallbackThumb.className = "item__thumb";
          const fallbackImg = document.createElement("img");
          const fallbackThumbUrl = String(
            getVisibleHandoutImageUrl(h, "player", state.uid)
            || getHandoutAvatarImageUrl(h)
            || selectBestPlaceholderImage({
              title: String(h?.title || ""),
              publicContent: String(h?.publicContent || ""),
              type: String(h?.type || "").toLowerCase(),
              npcDisposition: String(h?.npcDisposition || "").toLowerCase(),
            })?.url
            || "placeholders/Prompt1image1_1.png"
          ).trim();
          fallbackImg.src = fallbackThumbUrl;
          fallbackImg.alt = `${getSafeHandoutTitle(h)} portrait`;
          fallbackImg.addEventListener("error", () => {
            fallbackImg.src = "placeholders/Prompt1image1_1.png";
          }, { once: true });
          fallbackThumb.appendChild(fallbackImg);

          fallbackRow.appendChild(fallbackMeta);
          fallbackRow.appendChild(fallbackThumb);
          fallbackRow.onclick = () => openModal({ ...h, id: h.id }, "player");
          fragment.appendChild(fallbackRow);
          renderedCount += 1;
        } catch (fallbackErr) {
          console.error("[TV] renderPlayerHandouts fallback failed:", fallbackErr);
        }
      }
    }

    if (fragment.childNodes.length > 0) {
      plHandoutList.appendChild(fragment);
    }

    if (cursor < filteredItems.length) {
      plHandoutList._playerRenderRaf = requestAnimationFrame(renderChunk);
      return;
    }

    plHandoutList._playerRenderRaf = 0;
    finalizePlayerHandoutRender();
  };

  renderChunk();
}

if (plHandoutSearch) {
  const runPlayerHandoutSearch = (trigger = "input") => {
    const startedAt = performance.now();
    state.playerHandoutSearchQuery = plHandoutSearch.value || "";
    const visibleItems = getCurrentPlayerVisibleHandouts();
    renderPlayerHandouts(visibleItems);
    logHandoutSearchPerf({
      scope: "player",
      trigger,
      query: state.playerHandoutSearchQuery,
      totalItems: visibleItems.length,
      shownItems: plHandoutList?.childElementCount || 0,
      elapsedMs: performance.now() - startedAt,
    });
  };
  let playerSearchFrame = 0;
  const schedulePlayerSearch = (trigger = "input") => {
    if (playerSearchFrame) cancelAnimationFrame(playerSearchFrame);
    playerSearchFrame = requestAnimationFrame(() => {
      playerSearchFrame = 0;
      runPlayerHandoutSearch(trigger);
    });
  };
  plHandoutSearch.addEventListener("input", () => schedulePlayerSearch("input"));
  plHandoutSearch.addEventListener("search", () => schedulePlayerSearch("search"));
  plHandoutSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (playerSearchFrame) {
      cancelAnimationFrame(playerSearchFrame);
      playerSearchFrame = 0;
    }
    runPlayerHandoutSearch("enter");
  });
}

// Old renderPlayerInventory removed � replaced by the new inventory system below.

// ---- 16b) Inventory System ----
// Manages custom inventory items, wallets (per-player + party treasury),
// and claimed handout display in the unified inventory screen.

let inventoryAvatarIndex = 0;
let inventoryAvatarUrls = [];
let pendingInventoryImageUrl = null; // custom uploaded image URL

// Deferred from earlier � must run after these let declarations to avoid TDZ error
setupInventoryAvatarNav();

// -- Inventory custom image upload --
btnInvUploadImage?.addEventListener("click", () => inventoryImageUpload?.click());
inventoryImageUpload?.addEventListener("change", async () => {
  const file = inventoryImageUpload.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (inventoryImageStatus) inventoryImageStatus.textContent = "Please select an image file.";
    return;
  }
  if (inventoryImageStatus) inventoryImageStatus.textContent = "Uploading...";
  let uploadFile;
  try { uploadFile = await compressImageToMaxSize(file); } catch (_) { if (inventoryImageStatus) inventoryImageStatus.textContent = "Could not process image."; return; }
  const ext = (uploadFile.name.split(".").pop() || "png").toLowerCase();
  const path = `users/${state.uid}/inventory/${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);
  try {
    await uploadBytes(ref, uploadFile, { contentType: uploadFile.type });
    pendingInventoryImageUrl = await getDownloadURL(ref);
    setInventoryAvatarPreview(pendingInventoryImageUrl);
    if (inventoryImageStatus) inventoryImageStatus.textContent = "Uploaded (1 ?? on save).";
    pendingInventoryNugget = true;
  } catch (e) {
    console.error("Inventory image upload:", e);
    if (inventoryImageStatus) inventoryImageStatus.textContent = "Upload failed.";
  }
});

function getItemPlaceholderImages() {
  // Collect all item-style placeholder images for the inventory avatar picker.
  // Only generates paths that exist on disk (81 total):
  //   Prompts 1-3: image1 & image2, variants 1-9 each (18 per prompt = 54)
  //   Prompt 4:    image1, image2 & image3, variants 1-9 each (27)
  if (inventoryAvatarUrls.length > 0) return inventoryAvatarUrls;
  const all = [];
  const imageCountPerPrompt = { 1: 2, 2: 2, 3: 2, 4: 3 };
  for (let p = 1; p <= 4; p++) {
    const maxImage = imageCountPerPrompt[p];
    for (let n = 1; n <= maxImage; n++) {
      for (let v = 1; v <= 9; v++) {
        all.push(`placeholders/itemsPrompt${p}image${n}_${v}.png`);
      }
    }
  }
  inventoryAvatarUrls = all;
  return all;
}

function setInventoryAvatarPreview(url) {
  if (!inventoryItemAvatarPreview || !inventoryItemAvatarPlaceholder) return;
  if (url) {
    inventoryItemAvatarPreview.src = url;
    inventoryItemAvatarPreview.classList.remove("hidden");
    inventoryItemAvatarPlaceholder.classList.add("hidden");
    inventoryItemAvatarPreview.onerror = () => {
      inventoryItemAvatarPreview.classList.add("hidden");
      inventoryItemAvatarPlaceholder.classList.remove("hidden");
    };
  } else {
    inventoryItemAvatarPreview.classList.add("hidden");
    inventoryItemAvatarPlaceholder.classList.remove("hidden");
  }
}

function setupInventoryAvatarNav() {
  const images = getItemPlaceholderImages();
  if (!images.length) return;
  inventoryAvatarIndex = Math.floor(Math.random() * images.length);
  setInventoryAvatarPreview(images[inventoryAvatarIndex]);

  btnInvAvatarPrev?.addEventListener("click", () => {
    inventoryAvatarIndex = (inventoryAvatarIndex - 1 + images.length) % images.length;
    setInventoryAvatarPreview(images[inventoryAvatarIndex]);
  });
  btnInvAvatarNext?.addEventListener("click", () => {
    inventoryAvatarIndex = (inventoryAvatarIndex + 1) % images.length;
    setInventoryAvatarPreview(images[inventoryAvatarIndex]);
  });
  btnInvAvatarRandom?.addEventListener("click", () => {
    inventoryAvatarIndex = Math.floor(Math.random() * images.length);
    setInventoryAvatarPreview(images[inventoryAvatarIndex]);
  });

  btnInvAvatarGallery?.addEventListener("click", () => {
    const opening = invGalleryPanel?.classList.contains("hidden");
    invGalleryPanel?.classList.toggle("hidden", !opening);
    btnInvAvatarGallery?.classList.toggle("is-active", !!opening);
    if (opening) renderInvGallery();
  });

  invGalleryGrid?.addEventListener("click", (e) => {
    const tile = e.target.closest(".invGalleryTile");
    if (!tile) return;
    const url = tile.dataset.url;
    if (!url) return;
    const idx = images.indexOf(url);
    if (idx >= 0) inventoryAvatarIndex = idx;
    setInventoryAvatarPreview(url);
    renderInvGallery();
  });
}

function renderInvGallery() {
  if (!invGalleryGrid) return;
  const images = getItemPlaceholderImages();
  const currentUrl = images[inventoryAvatarIndex] || "";
  invGalleryGrid.innerHTML = images.map((url) => {
    const active = url === currentUrl;
    return `<button class="invGalleryTile${active ? " is-active" : ""}" type="button" role="option" aria-selected="${active}" data-url="${url}"><img src="${url}" alt="Item image" loading="lazy" /></button>`;
  }).join("");
  const sel = invGalleryGrid.querySelector(".invGalleryTile.is-active");
  if (sel) sel.scrollIntoView({ block: "center", inline: "nearest" });
}

function openCreateInventoryModal(ownerUid) {
  if (!createInventoryModal) return;
  pendingInventoryImageUrl = null;
  inventoryItemId.value = "";
  inventoryItemOwner.value = ownerUid || state.uid;
  inventoryItemName.value = "";
  inventoryItemDesc.value = "";
  inventoryItemAmount.value = "1";
  inventoryModalTitle.textContent = "New Item";
  btnSaveInventoryItem.textContent = "Create Item";

  const images = getItemPlaceholderImages();
  inventoryAvatarIndex = Math.floor(Math.random() * images.length);
  setInventoryAvatarPreview(images[inventoryAvatarIndex]);

  invGalleryPanel?.classList.add("hidden");
  btnInvAvatarGallery?.classList.remove("is-active");
  if (inventoryImageStatus) inventoryImageStatus.textContent = "";
  if (inventoryImageUpload) inventoryImageUpload.value = "";
  animateModalIn(createInventoryModal);
}

function openEditInventoryModal(item) {
  if (!createInventoryModal) return;
  pendingInventoryImageUrl = null;
  inventoryItemId.value = item.id;
  inventoryItemOwner.value = item.ownerUid;
  inventoryItemName.value = item.name || "";
  inventoryItemDesc.value = item.description || "";
  inventoryItemAmount.value = String(item.amount || 1);
  inventoryModalTitle.textContent = "Edit Item";
  btnSaveInventoryItem.textContent = "Save Item";

  if (item.avatarUrl) {
    const images = getItemPlaceholderImages();
    const idx = images.indexOf(item.avatarUrl);
    if (idx >= 0) inventoryAvatarIndex = idx;
    setInventoryAvatarPreview(item.avatarUrl);
  } else {
    setInventoryAvatarPreview(null);
  }

  invGalleryPanel?.classList.add("hidden");
  btnInvAvatarGallery?.classList.remove("is-active");
  if (inventoryImageStatus) inventoryImageStatus.textContent = "";
  if (inventoryImageUpload) inventoryImageUpload.value = "";
  animateModalIn(createInventoryModal);
}

function closeInventoryModal() {
  invGalleryPanel?.classList.add("hidden");
  btnInvAvatarGallery?.classList.remove("is-active");
  animateModalOut(createInventoryModal);
}

btnCloseInventoryModal?.addEventListener("click", closeInventoryModal);

btnSaveInventoryItem?.addEventListener("click", async () => {
  const name = inventoryItemName?.value?.trim();
  if (!name) { showToast("Item name is required.", "error"); return; }

  if (pendingInventoryNugget) {
    const ok = await spendNuggetWithFeedback("item image");
    if (!ok) return;
    pendingInventoryNugget = false;
  }

  const description = inventoryItemDesc?.value?.trim() || "";
  const amount = Math.max(1, parseInt(inventoryItemAmount?.value, 10) || 1);
  const ownerUid = inventoryItemOwner?.value || state.uid;
  const images = getItemPlaceholderImages();
  const avatarUrl = pendingInventoryImageUrl || images[inventoryAvatarIndex] || "";
  const existingId = inventoryItemId?.value?.trim();

  try {
    const inventoryCol = collection(db, "sessions", state.sessionId, "inventory");
    if (existingId) {
      // Update existing item
      await updateDoc(doc(db, "sessions", state.sessionId, "inventory", existingId), {
        name, description, amount, avatarUrl,
        updatedAt: serverTimestamp(),
      });
      showToast("Item updated.", "success");
    } else {
      // Create new item
      const ownerNick = getOwnerNick(ownerUid);
      await addDoc(inventoryCol, {
        ownerUid,
        ownerNick,
        type: "custom",
        name, description, amount, avatarUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast("Item created.", "success");
    }
    closeInventoryModal();
  } catch (e) {
    console.error("Save inventory item failed:", e);
    showToast("Could not save item.", "error");
  }
});

function getOwnerNick(uid) {
  // Try to find a display name from profileCache, activePlayers, or state.
  if (uid === state.uid && state.playerNick) return state.playerNick;
  const profile = getCachedProfile(uid, "player");
  if (profile?.displayName) return profile.displayName;
  const player = state.activePlayers.find(p => (p.id || p.uid) === uid);
  if (player?.nickname) return player.nickname;
  return "Unknown";
}

async function deleteInventoryItem(itemId) {
  showUndoToast("Item deleted.", async () => {
    try {
      await deleteDoc(doc(db, "sessions", state.sessionId, "inventory", itemId));
    } catch (e) {
      console.error("Delete inventory item failed:", e);
      showToast("Could not delete item.", "error");
    }
  });
}

async function updateWallet(walletId, denom, delta) {
  // Increment or decrement a coin denomination in a wallet document.
  // BEGINNER NOTE � Wallet architecture:
  // Each wallet is a Firestore document at `sessions/{id}/wallets/{walletId}`.
  //   walletId = "party" for the shared party treasury
  //   walletId = player UID for individual coin pouches
  // Each document has {platinum, gold, silver, bronze} integer fields.
  // We use Math.max(0, ...) to prevent negative coin counts.
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
  try {
    const snap = await getDoc(walletRef);
    if (!snap.exists()) {
      // Create wallet if it doesn't exist yet.
      await setDoc(walletRef, {
        platinum: 0, gold: 0, silver: 0, bronze: 0,
        [denom]: Math.max(0, delta),
        updatedAt: serverTimestamp(),
      });
    } else {
      const current = snap.data()[denom] || 0;
      const newVal = Math.max(0, current + delta);
      await updateDoc(walletRef, {
        [denom]: newVal,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.error("Update wallet failed:", e);
    showToast("Could not update coins.", "error");
  }
}

function canEditInventoryFor(ownerUid) {
  return state.role === "dm" || ownerUid === state.uid;
}

function canEditWallet(walletId) {
  if (walletId === "party") return state.role === "dm";
  return state.role === "dm" || walletId === state.uid;
}

const COIN_VALUES_IN_BRONZE = {
  bronze: 1,
  silver: 10,
  gold: 100,
  platinum: 10000,
};

function normalizeCoinAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function walletToBronzeValue(wallet = {}) {
  return (Object.keys(COIN_VALUES_IN_BRONZE)).reduce((total, denom) => {
    return total + normalizeCoinAmount(wallet[denom]) * COIN_VALUES_IN_BRONZE[denom];
  }, 0);
}

function bronzeValueToWallet(totalBronze) {
  let remaining = normalizeCoinAmount(totalBronze);
  const wallet = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  ["platinum", "gold", "silver", "bronze"].forEach((denom) => {
    const value = COIN_VALUES_IN_BRONZE[denom];
    wallet[denom] = Math.floor(remaining / value);
    remaining %= value;
  });
  return wallet;
}

// ---- Distribute coins from party treasury to a player ----
// BEGINNER NOTE � Firestore transactions:
// A transaction reads data, computes new values, then writes them atomically.
// "Atomic" means ALL reads and writes succeed or NONE do � no partial updates.
// This prevents a race condition where two GMs could overdraw the treasury if
// they clicked "Send" at the same time. The transaction retries automatically
// if another write happens between our read and write.
async function distributeFromTreasury(targetUid, denom, amount) {
  if (state.role !== "dm") { showToast("Only the GM can distribute coins.", "error"); return; }
  if (!targetUid || !denom || !amount || amount <= 0) { showToast("Invalid transfer.", "error"); return; }
  if (!Object.prototype.hasOwnProperty.call(COIN_VALUES_IN_BRONZE, denom)) {
    showToast("Invalid coin type.", "error");
    return;
  }
  const partyRef = doc(db, "sessions", state.sessionId, "wallets", "party");
  const playerRef = doc(db, "sessions", state.sessionId, "wallets", targetUid);
  try {
    await runTransaction(db, async (transaction) => {
      const partySnap = await transaction.get(partyRef);
      const partyData = partySnap.exists() ? partySnap.data() : { platinum: 0, gold: 0, silver: 0, bronze: 0 };
      const transferAmount = normalizeCoinAmount(amount);
      const transferValue = transferAmount * COIN_VALUES_IN_BRONZE[denom];
      const availableValue = walletToBronzeValue(partyData);
      if (availableValue < transferValue) throw new Error("Not enough total coins in treasury.");
      const updatedPartyWallet = bronzeValueToWallet(availableValue - transferValue);

      const playerSnap = await transaction.get(playerRef);
      const playerData = playerSnap.exists() ? playerSnap.data() : { platinum: 0, gold: 0, silver: 0, bronze: 0 };
      transaction.set(partyRef, { ...partyData, ...updatedPartyWallet, updatedAt: serverTimestamp() });
      transaction.set(playerRef, { ...playerData, [denom]: normalizeCoinAmount(playerData[denom]) + transferAmount, updatedAt: serverTimestamp() });
    });
    const nick = getOwnerNick(targetUid);
    showToast(`Sent ${amount} ${denom} to ${nick}.`, "success");
    // Notify the receiving player.
    try {
      await createNotification(targetUid, "coinsReceived", `You received ${amount} ${denom} from the treasury.`);
    } catch (notifyErr) {
      console.warn("coinsReceived notification failed:", notifyErr);
      showToast("Coins sent, but player notification failed.", "error");
    }
  } catch (e) {
    console.error("Distribute from treasury failed:", e);
    showToast(e.message || "Could not transfer coins.", "error");
  }
}

// ---- Grant arbitrary coins to a player (no treasury deduction) ----
async function grantCoinsToPlayer(targetUid, denom, amount) {
  if (state.role !== "dm") { showToast("Only the GM can grant coins.", "error"); return; }
  if (!targetUid || !denom || !amount || amount <= 0) { showToast("Invalid grant.", "error"); return; }
  const walletRef = doc(db, "sessions", state.sessionId, "wallets", targetUid);
  try {
    const snap = await getDoc(walletRef);
    if (!snap.exists()) {
      await setDoc(walletRef, { platinum: 0, gold: 0, silver: 0, bronze: 0, [denom]: amount, updatedAt: serverTimestamp() });
    } else {
      const current = snap.data()[denom] || 0;
      await updateDoc(walletRef, { [denom]: current + amount, updatedAt: serverTimestamp() });
    }
    const nick = getOwnerNick(targetUid);
    showToast(`Granted ${amount} ${denom} to ${nick}.`, "success");
    // Notify the receiving player.
    try {
      await createNotification(targetUid, "coinsReceived", `The GM granted you ${amount} ${denom}.`);
    } catch (notifyErr) {
      console.warn("coinsReceived notification failed:", notifyErr);
      showToast("Coins granted, but player notification failed.", "error");
    }
  } catch (e) {
    console.error("Grant coins failed:", e);
    showToast("Could not grant coins.", "error");
  }
}

function subscribeInventory() {
  if (!state.sessionId) return;

  // Clean up any existing inventory/wallet subscriptions to prevent leaks.
  if (state.unsubInventory) { state.unsubInventory(); state.unsubInventory = null; }
  if (state.unsubWallets) { state.unsubWallets(); state.unsubWallets = null; }

  // Subscribe to inventory items
  const inventoryRef = collection(db, "sessions", state.sessionId, "inventory");
  const invQuery = query(inventoryRef, orderBy("createdAt", "asc"));
  state.unsubInventory = onSnapshot(invQuery, (snap) => {
    state.inventoryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderInventoryScreen();
  }, (err) => {
    console.error("Inventory listener error:", err);
    showToast("Could not load inventory. Check connection.", "error");
    // Still render what we can so the screen is not blank.
    renderInventoryScreen();
  });

  // Subscribe to wallets
  const walletsRef = collection(db, "sessions", state.sessionId, "wallets");
  state.unsubWallets = onSnapshot(walletsRef, (snap) => {
    const w = {};
    snap.docs.forEach(d => { w[d.id] = d.data(); });
    state.wallets = w;
    renderInventoryScreen();
  }, (err) => {
    console.error("Wallets listener error:", err);
    // Still render what we can.
    renderInventoryScreen();
  });

  // Render immediately with current state so the screen is not blank
  // while waiting for the first onSnapshot callback.
  renderInventoryScreen();
}

function renderWalletCoins(containerEl, walletId, walletData) {
  if (!containerEl) return;
  const denoms = ["bronze", "silver", "gold", "platinum"];
  const editable = canEditWallet(walletId);

  denoms.forEach(denom => {
    const valueEl = containerEl.querySelector(`.coinValue[data-wallet="${walletId}"][data-denom="${denom}"]`);
    if (valueEl) {
      const newVal = String((walletData && walletData[denom]) || 0);
      if (valueEl.textContent !== newVal) {
        valueEl.textContent = newVal;
        // Pulse the coin badge so the player notices the change.
        valueEl.classList.remove("coin-pulse");
        void valueEl.offsetWidth;
        valueEl.classList.add("coin-pulse");
        // Haptic feedback on mobile devices.
        if (navigator.vibrate) try { navigator.vibrate(40); } catch {}
      }
    }

    const controlsEl = containerEl.querySelector(`.coinItem[data-coin="${denom}"] .coinControls`);
    if (controlsEl) controlsEl.classList.toggle("hidden", !editable);
  });
}

function renderInventoryScreen() {
  if (!inventoryPlayersContainer) return;
  const isGM = state.role === "dm";

  // Party treasury: GM-only. Players never see it.
  if (partyTreasurySection) {
    partyTreasurySection.classList.toggle("hidden", !isGM);
  }
  if (isGM) {
    renderWalletCoins(partyTreasuryCoins, "party", state.wallets.party);
    // Render or refresh the distribute UI inside the treasury section.
    let distWrap = partyTreasurySection?.querySelector(".treasuryDistributeWrap");
    if (!distWrap && partyTreasurySection) {
      distWrap = document.createElement("div");
      distWrap.className = "treasuryDistributeWrap";
      partyTreasurySection.appendChild(distWrap);
    }
    if (distWrap) {
      let players = (state.activePlayers || []).filter(p => (p.id || p.uid) !== state.uid || state.activePlayers.length === 1);
      // If activePlayers is empty (listener hasn't fired yet), try a one-time fetch
      // so the dropdown isn't blank the first time GM opens inventory.
      if (players.length === 0 && state.sessionId && !distWrap._fetchingPlayers) {
        distWrap._fetchingPlayers = true;
        getDocs(query(collection(db, "sessions", state.sessionId, "players"), orderBy("lastSeenAt", "desc")))
          .then(snap => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!state.activePlayers || state.activePlayers.length === 0) {
              state.activePlayers = fetched;
            }
            renderInventoryScreen();
          })
          .catch(() => {})
          .finally(() => { distWrap._fetchingPlayers = false; });
      }
      distWrap.innerHTML = `
        <div class="treasuryDistribute">
          <span class="label small">Distribute to player</span>
          <select class="input input--small treasuryDistribute__player">
            ${players.map(p => `<option value="${p.id || p.uid}">${escapeHtml(p.nickname || getOwnerNick(p.id || p.uid))}</option>`).join("")}
          </select>
          <div class="treasuryDistribute__row">
            <select class="input input--small treasuryDistribute__denom">
              <option value="platinum">Platinum</option>
              <option value="gold" selected>Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
            <input class="input input--small treasuryDistribute__amount" type="number" min="1" value="1" placeholder="1">
            <button class="btn btn--small treasuryDistribute__send" type="button">Send</button>
          </div>
        </div>
      `;
    }
  }

  // Collect all player UIDs who have items or wallets or are active
  const playerUids = new Set();
  const knownPlayerUids = new Set();
  state.activePlayers.forEach((p) => {
    const pid = String(p?.id || p?.uid || "").trim();
    if (pid) knownPlayerUids.add(pid);
  });
  (state.partyRoster || []).forEach((p) => {
    const pid = String(p?.id || p?.uid || "").trim();
    if (pid) knownPlayerUids.add(pid);
  });
  if (state.uid) knownPlayerUids.add(String(state.uid));
  if (state.gmUid) knownPlayerUids.add(String(state.gmUid));

  // Apply inventory search filter
  const filteredItems = inventorySearchQuery
    ? state.inventoryItems.filter(item => {
        const name = (item.name || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        return name.includes(inventorySearchQuery) || desc.includes(inventorySearchQuery);
      })
    : state.inventoryItems;
  const ownersWithItems = new Set();
  filteredItems.forEach((item) => {
    const ownerUid = String(item?.ownerUid || "").trim();
    if (!ownerUid) return;
    ownersWithItems.add(ownerUid);
    playerUids.add(ownerUid);
  });
  Object.keys(state.wallets).forEach((k) => {
    if (k === "party") return;
    if (knownPlayerUids.has(k) || ownersWithItems.has(k)) playerUids.add(k);
  });
  state.activePlayers.forEach(p => playerUids.add(p.id || p.uid));
  if (state.uid) playerUids.add(state.uid);

  // Group items by owner
  const itemsByOwner = {};
  filteredItems.forEach(item => {
    if (!itemsByOwner[item.ownerUid]) itemsByOwner[item.ownerUid] = [];
    itemsByOwner[item.ownerUid].push(item);
  });

  // Also gather claimed handouts for each player
  const claimedByOwner = {};
  (state.gmHandoutsRaw || []).forEach(h => {
    if (h.claimedByUid) {
      if (!claimedByOwner[h.claimedByUid]) claimedByOwner[h.claimedByUid] = [];
      claimedByOwner[h.claimedByUid].push(h);
    }
  });

  inventoryPlayersContainer.innerHTML = "";

  const sortedUids = [...playerUids].sort((a, b) => {
    // Current user first, then alphabetical by name
    if (a === state.uid) return -1;
    if (b === state.uid) return 1;
    return (getOwnerNick(a) || "").localeCompare(getOwnerNick(b) || "");
  });

  let totalItems = 0;

  sortedUids.forEach((uid, ownerIndex) => {
    const items = itemsByOwner[uid] || [];
    const claimed = claimedByOwner[uid] || [];
    if (!knownPlayerUids.has(uid) && items.length === 0 && claimed.length === 0) return;
    const wallet = state.wallets[uid];
    const nick = getOwnerNick(uid);
    if (nick === "Unknown" && items.length === 0 && claimed.length === 0) return;
    const isMe = uid === state.uid;
    const canEdit = canEditInventoryFor(uid);

    // GM doesn't get a personal wallet section � they manage party treasury instead.
    const isGMSelf = isGM && isMe;
    const showWallet = !isGMSelf;

    // Skip rendering the GM's own section entirely if they have no items.
    // The GM manages gold via party treasury, so an empty personal section is clutter.
    if (isGMSelf && items.length === 0 && claimed.length === 0) return;

    totalItems += items.length + claimed.length;

    const section = document.createElement("div");
    section.className = "inventoryPlayerSection list-stagger-item";
    section.style.setProperty("--stagger-index", String(ownerIndex));

    // Header with collapse toggle
    // Keep only the viewer's own section expanded by default.
    const startCollapsed = !isMe;
    const header = document.createElement("div");
    header.className = "inventoryPlayerHeader";
    header.innerHTML = `
      <h3>${escapeHtml(nick)}${isMe ? ' <span class="muted small">(You)</span>' : ""}</h3>
      <svg class="inventoryPlayerHeader__chevron${startCollapsed ? "" : " is-open"}" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    `;

    const body = document.createElement("div");
    body.className = "inventoryPlayerBody";
    if (startCollapsed) body.style.display = "none";

    // Per-player wallet (Coin Pouch) � hidden for the GM's own section
    if (showWallet) {
    const walletSection = document.createElement("div");
    walletSection.className = "inventoryPlayerCoins coinSection";
    const walletEditable = canEditWallet(uid);
    const denoms = ["bronze", "silver", "gold", "platinum"];
    const denomLabels = { platinum: "P", gold: "G", silver: "S", bronze: "B" };
    const denomColors = { platinum: "coinIcon--platinum", gold: "coinIcon--gold", silver: "coinIcon--silver", bronze: "coinIcon--bronze" };

    walletSection.innerHTML = `
      <div class="coinSection__head"><span class="muted small">Coin Pouch</span></div>
      <div class="coinRow">
        ${denoms.map(d => `
          <div class="coinItem" data-coin="${d}">
            <div class="coinItem__center">
              <span class="coinIcon ${denomColors[d]}" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">${denomLabels[d]}</text></svg>
              </span>
              <span class="coinValue">${(wallet && wallet[d]) || 0}</span>
            </div>
            ${walletEditable ? `
              <div class="coinControls">
                <button class="coinBtn coinBtn--minus" data-wallet-id="${uid}" data-denom="${d}" type="button" aria-label="Remove ${d}" title="Click or hold to remove ${d}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/></svg></button>
                <button class="coinBtn coinBtn--plus" data-wallet-id="${uid}" data-denom="${d}" type="button" aria-label="Add ${d}" title="Click or hold to add ${d}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg></button>
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;
    body.appendChild(walletSection);
    }

    // GM-only: inline "Grant Coins" form for each player (not for own wallet)
    if (isGM && uid !== state.uid) {
      const grantDiv = document.createElement("div");
      grantDiv.className = "grantCoinsRow";
      grantDiv.innerHTML = `
        <select class="input input--small grantCoins__denom">
          <option value="gold" selected>Gold</option>
          <option value="platinum">Platinum</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
        <input class="input input--small grantCoins__amount" type="number" min="1" value="1" placeholder="Amt" style="width:70px">
        <button class="btn btn--small btn--ghost grantCoins__btn" data-target-uid="${uid}" type="button">Grant</button>
      `;
      body.appendChild(grantDiv);
    }

    // Custom inventory items
    const itemList = document.createElement("div");
    itemList.className = "inventoryItemList";

    items.forEach((item, itemIndex) => {
      const card = document.createElement("div");
      card.className = "inventoryCard list-stagger-item";
      card.style.setProperty("--stagger-index", String(itemIndex));
      const avatarHtml = item.avatarUrl
        ? `<img src="${escapeHtml(item.avatarUrl)}" alt="${escapeHtml(item.name)}">`
        : `<svg viewBox="0 0 24 24" fill="none"><path d="M7 8H17L18 20H6L7 8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8V7C9 5.343 10.343 4 12 4C13.657 4 15 5.343 15 7V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

      card.innerHTML = `
        <div class="inventoryCard__avatar">${avatarHtml}</div>
        <div class="inventoryCard__body">
          <div class="inventoryCard__name">${escapeHtml(item.name)}</div>
          ${item.description ? `<div class="inventoryCard__desc">${escapeHtml(item.description)}</div>` : ""}
        </div>
        <div class="inventoryCard__right">
          <span class="inventoryCard__amount">�${item.amount || 1}</span>
          ${canEdit ? `
            <div class="inventoryCard__actions">
              <button class="inventoryCard__actionBtn inventoryCard__actionBtn--edit" data-item-id="${item.id}" type="button" aria-label="Edit item" title="Edit">
                <svg viewBox="0 0 24 24" fill="none"><path d="M15.232 5.232l3.536 3.536M9 13l-2 6 6-2 9.5-9.5a2.121 2.121 0 00-3-3L10 14z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="inventoryCard__actionBtn inventoryCard__actionBtn--delete" data-item-id="${item.id}" type="button" aria-label="Delete item" title="Delete">
                <svg viewBox="0 0 24 24" fill="none"><path d="M19 7L5 7M10 11V17M14 11V17M4 7H20L18.5 20.5H5.5L4 7ZM8 7V4H16V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          ` : ""}
        </div>
      `;
      itemList.appendChild(card);
    });

    body.appendChild(itemList);

    // Claimed handouts section
    if (claimed.length > 0) {
      const claimedDiv = document.createElement("div");
      claimedDiv.className = "inventoryClaimedSection";
      claimedDiv.innerHTML = `<h4>Claimed Handouts</h4>`;
      claimed.forEach((h, claimedIndex) => {
        const row = document.createElement("div");
        row.className = "inventoryCard inventoryCard--claimed list-stagger-item";
        row.style.setProperty("--stagger-index", String(items.length + claimedIndex));
        const frameStyle = buildImageFrameInlineStyle(h.imageFrame);
        const thumbHtml = h.imageUrl
          ? `<img src="${escapeHtml(h.imageUrl)}" alt="${escapeHtml(h.title)}"${frameStyle}>`
          : getHeroIconSvg("document", "");
        row.innerHTML = `
          <div class="inventoryCard__avatar">${thumbHtml}</div>
          <div class="inventoryCard__body">
            <div class="inventoryCard__name">${escapeHtml(h.title)}</div>
            <div class="inventoryCard__desc">${escapeHtml((h.type ?? "handout").toUpperCase())}</div>
          </div>
          ${isMe ? `<div class="inventoryClaimedCard__right"><button class="btn btn--ghost btn--small inventoryClaimedCard__unclaim" type="button">Unclaim</button></div>` : ""}
        `;
        row.style.cursor = "pointer";
        const unclaimBtn = row.querySelector(".inventoryClaimedCard__unclaim");
        if (unclaimBtn instanceof HTMLButtonElement) {
          unclaimBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            unclaimHandout(h.id, unclaimBtn, { closeModalOnSuccess: false });
          });
        }
        row.onclick = () => openModal({ ...h, id: h.id }, state.role === "dm" ? "dm" : "player");
        claimedDiv.appendChild(row);
      });
      body.appendChild(claimedDiv);
    }

    // Add item button for editable users
    if (canEdit) {
      const addBtn = document.createElement("button");
      addBtn.className = "btn btn--ghost btn--small";
      addBtn.type = "button";
      addBtn.style.marginTop = "8px";
      addBtn.innerHTML = `<svg style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:4px" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg> Add Item`;
      addBtn.addEventListener("click", () => openCreateInventoryModal(uid));
      body.appendChild(addBtn);
    }

    header.addEventListener("click", () => {
      const chevron = header.querySelector(".inventoryPlayerHeader__chevron");
      const isOpen = body.style.display !== "none";
      body.style.display = isOpen ? "none" : "";
      chevron?.classList.toggle("is-open", !isOpen);
    });

    section.appendChild(header);
    section.appendChild(body);
    inventoryPlayersContainer.appendChild(section);
  });

  // Show/hide empty state
  if (inventoryEmptyMsg) {
    inventoryEmptyMsg.classList.toggle("hidden", totalItems > 0 || sortedUids.length > 0);
  }
}

// Delegated click handler for inventory screen actions.
//
// BEGINNER NOTE � Event Delegation:
// Instead of attaching individual onclick handlers to every dynamically-created
// button (which would have to be re-attached every time the list re-renders),
// we attach ONE listener on `document` and inspect `e.target`. The `.closest()`
// method walks up the DOM tree to find the nearest ancestor matching a selector.
// This pattern is both faster (fewer listeners) and simpler (no re-wiring).
document.addEventListener("click", (e) => {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  // Coin button clicks � hold-to-repeat supported via pointerdown/up
  // (single clicks still work; delegation just prevents default)
  const coinBtn = target.closest(".coinBtn");
  if (coinBtn) {
    e.preventDefault();
    return; // actual logic handled by pointerdown listener below
  }

  // Edit inventory item
  const editBtn = target.closest(".inventoryCard__actionBtn--edit");
  if (editBtn) {
    e.preventDefault();
    const itemId = editBtn.dataset.itemId;
    const item = state.inventoryItems.find(i => i.id === itemId);
    if (item) openEditInventoryModal(item);
    return;
  }

  // Delete inventory item
  const deleteBtn = target.closest(".inventoryCard__actionBtn--delete");
  if (deleteBtn) {
    e.preventDefault();
    const itemId = deleteBtn.dataset.itemId;
    if (itemId) deleteInventoryItem(itemId);
    return;
  }

  // Treasury distribute: GM sends coins from party treasury to a player
  const sendBtn = target.closest(".treasuryDistribute__send");
  if (sendBtn) {
    e.preventDefault();
    const row = sendBtn.closest(".treasuryDistribute__row");
    if (!row) return;
    const playerUid = row.closest(".treasuryDistribute")?.querySelector(".treasuryDistribute__player")?.value
        || row.querySelector(".treasuryDistribute__player")?.value;
    const denom = row.querySelector(".treasuryDistribute__denom")?.value;
    const amount = parseInt(row.querySelector(".treasuryDistribute__amount")?.value, 10);
    if (!playerUid) { showToast("Select a player to send coins to.", "error"); return; }
    if (denom && amount > 0) distributeFromTreasury(playerUid, denom, amount);
    return;
  }

  // GM grants coins to a player (no treasury deduction)
  const grantBtn = target.closest(".grantCoins__btn");
  if (grantBtn) {
    e.preventDefault();
    const targetUid = grantBtn.dataset.targetUid;
    const row = grantBtn.closest(".grantCoinsRow");
    if (!row) return;
    const denom = row.querySelector(".grantCoins__denom")?.value;
    const amount = parseInt(row.querySelector(".grantCoins__amount")?.value, 10);
    if (!targetUid) { showToast("No player selected � choose a player first.", "error"); return; }
    if (denom && amount > 0) grantCoinsToPlayer(targetUid, denom, amount);
    return;
  }
});

// -- Hold-to-repeat for coin buttons --
// First click fires immediately. After a 400ms delay, coins repeat at 100ms intervals
// until the pointer is released. Works with both mouse and touch.
(function setupCoinHoldToRepeat() {
  let repeatTimer = null;
  let repeatDelay = null;

  function fireCoin(btn) {
    const walletId = btn.dataset.walletId || btn.dataset.wallet;
    const denom = btn.dataset.denom;
    if (!walletId || !denom) return;
    if (!canEditWallet(walletId)) { showToast("You can't edit this wallet.", "error"); return; }
    const delta = btn.classList.contains("coinBtn--plus") ? 1 : -1;
    // TODO: play coin click sound here when sound files are provided
    updateWallet(walletId, denom, delta);
  }

  function stopRepeat() {
    clearTimeout(repeatDelay);
    clearInterval(repeatTimer);
    repeatDelay = null;
    repeatTimer = null;
  }

  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".coinBtn");
    if (!btn) return;
    e.preventDefault();
    fireCoin(btn);
    repeatDelay = setTimeout(() => {
      repeatTimer = setInterval(() => fireCoin(btn), 50);
    }, 200);
  });

  document.addEventListener("pointerup", stopRepeat);
  document.addEventListener("pointercancel", stopRepeat);
  document.addEventListener("pointerleave", (e) => {
    if (e.target.closest && e.target.closest(".coinBtn")) stopRepeat();
  });
})();

// ---- 17) Modal (GM + player) ----
// The shared modal displays a single handout in detail.
// GM gets edit fields, reveal toggles, delete button, and claim management.
// Players get a read-only view plus a "Claim" button for loot-type handouts.
//
// BEGINNER NOTE � modalDraft pattern:
// When the GM opens a handout, we copy the current data into `modalDraft`.
// Edits modify the draft in memory. Only when the GM clicks "Save" do we
// write back to Firestore. This prevents accidental half-edits from being
// broadcast to players in realtime. The "Unsaved changes" indicator compares
// draft values against the originals to know if anything changed.
let modalCtx = { role: null, handoutId: null };
// `modalCtx` tracks which handout is currently being edited/viewed in the modal.
let modalDraft = null;

function isModalDraftDirty() {
  if (!modalDraft) return false;
  syncModalTextIntoDraft();
  return modalDraft.title !== modalDraft.original.title
    || modalDraft.publicContent !== modalDraft.original.publicContent
    || modalDraft.secretContent !== modalDraft.original.secretContent
    || !!modalDraft.revealed !== !!modalDraft.original.revealed
    || !!modalDraft.secretRevealed !== !!modalDraft.original.secretRevealed
    || !!modalDraft.claimable !== !!modalDraft.original.claimable
    || modalDraft.iconKey !== modalDraft.original.iconKey
    || String(modalDraft.imageUrl || "") !== String(modalDraft.original.imageUrl || "");
}

function refreshModalSaveState() {
  if (!modalSaveState || !btnSaveHandout || !modalDraft) return;
  const dirty = isModalDraftDirty();

  modalSaveState.textContent = dirty ? "Unsaved changes" : "All changes saved";
  modalSaveState.classList.toggle("is-dirty", dirty);
  btnSaveHandout.disabled = !dirty;
  btnSaveHandout.classList.toggle("btn--active", dirty);
}

function syncRevealButtons() {
  if (!modalDraft) return;

  if (btnToggleReveal) {
    btnToggleReveal.classList.toggle("revealStarBtn--active", !!modalDraft.revealed);
    btnToggleReveal.setAttribute("aria-pressed", modalDraft.revealed ? "true" : "false");
    const label = btnToggleReveal.querySelector(".revealStarBtn__text");
    if (label) label.textContent = modalDraft.revealed ? "Handout Revealed" : "Reveal Handout";
  }

  if (btnToggleRevealSecret) {
    btnToggleRevealSecret.classList.toggle("revealStarBtn--active", !!modalDraft.secretRevealed);
    btnToggleRevealSecret.setAttribute("aria-pressed", modalDraft.secretRevealed ? "true" : "false");
    const label = btnToggleRevealSecret.querySelector(".revealStarBtn__text");
    if (label) label.textContent = modalDraft.secretRevealed ? "Secret Revealed" : "Reveal Secret";
  }
}

function syncClaimableButton() {
  if (!modalDraft || !btnToggleClaimable) return;
  const enabled = !!modalDraft.claimable;
  btnToggleClaimable.classList.toggle("btn--active", enabled);
  btnToggleClaimable.setAttribute("aria-pressed", enabled ? "true" : "false");
  btnToggleClaimable.textContent = enabled ? "Claimable On" : "Claimable Off";
}

function setModalEditing(isEditing) {
  if (!modalDraft) return;
  modalDraft.isEditing = !!isEditing;

  modalTitle.contentEditable = modalDraft.isEditing ? "true" : "false";
  modalPublic.contentEditable = modalDraft.isEditing ? "true" : "false";
  modalSecret.contentEditable = modalDraft.isEditing ? "true" : "false";

  modalTitle.classList.toggle("modalTextEditable", modalDraft.isEditing);
  modalPublic.classList.toggle("modalTextEditable", modalDraft.isEditing);
  modalSecret.classList.toggle("modalTextEditable", modalDraft.isEditing);

  if (btnEditHandout) {
    btnEditHandout.textContent = modalDraft.isEditing ? "Done" : "Edit";
    btnEditHandout.classList.toggle("btn--active", modalDraft.isEditing);
  }

  refreshModalSaveState();
}


// BEGINNER NOTE: Manual Data Binding
// In modern frameworks like React/Vue, typing in an input automatically updates your JS variables.
// In Vanilla JS, we must construct "Two-Way Binding" manually. 
// When the user edits text, the DOM changes. We must call this sync function to scrape the 
// DOM's inner text back into our JavaScript 'modalDraft' object before saving to the database.
function syncModalTextIntoDraft() {
  if (!modalDraft) return;
  modalDraft.title = String(modalTitle.textContent || "").trim();
  modalDraft.publicContent = String(modalPublic.textContent || "").trim();
  modalDraft.secretContent = String(modalSecret.textContent || "").trim();
}

function closeModalDiscardChanges() {
  animateModalOut(modal);
  modalTitle.contentEditable = "false";
  modalPublic.contentEditable = "false";
  modalSecret.contentEditable = "false";
  modalTitle.classList.remove("modalTextEditable");
  modalPublic.classList.remove("modalTextEditable");
  modalSecret.classList.remove("modalTextEditable");
  if (modalSaveState) {
    modalSaveState.textContent = "All changes saved";
    modalSaveState.classList.remove("is-dirty");
  }
  if (btnSaveHandout) {
    btnSaveHandout.disabled = false;
    btnSaveHandout.classList.remove("btn--active");
  }
  if (modalMapUploadStatus) modalMapUploadStatus.textContent = "";
  if (modalMapImageUpload) modalMapImageUpload.value = "";
  modalCtx = { role: null, handoutId: null };
  modalDraft = null;
}


function renderModalContent(h, role) {
  modalCtx = { role, handoutId: h.id };
  if (modalCard) modalCard.scrollTop = 0;

  modalTag.textContent = (h.type ?? "handout").toUpperCase();
  modalTitle.textContent = h.title ?? "";
  modalTitle.classList.toggle("modalTitleEditablePrompt", role === "dm");
  const _curIcon = String(h.iconKey || h.iconEmoji || "").trim();
  const _isEmojiIcon = _curIcon && /\p{Extended_Pictographic}/u.test(_curIcon);
  if (modalIconPreview) modalIconPreview.textContent = _isEmojiIcon ? _curIcon : "🎭";
  if (modalIconInput) modalIconInput.value = _isEmojiIcon ? _curIcon : "";
  resolveModalImage(h);
  modalPublic.textContent = h.publicContent ?? "";

  const showSecret = role === "dm" || h.secretRevealed === true;
  const hasSecret = (h.secretContent ?? "").trim().length > 0;
  modalSecretWrap.classList.toggle("hidden", role === "dm" ? false : !showSecret || !hasSecret);
  modalSecret.textContent = h.secretContent ?? "";

  // Claim panel is shared, but only meaningful for loot.
  // We show status to everyone; action availability depends on role/state.
  modalClaimWrap.classList.toggle("hidden", String(h.type || "").toLowerCase() !== "loot");

  modalGMControls.classList.toggle("hidden", role !== "dm");
  modalMapUploadWrap?.classList.toggle("hidden", !isMapHandoutType(h.type));
  const mapBtnRow = modalMapUploadWrap?.querySelector(".mapBtnRow");
  if (mapBtnRow) mapBtnRow.classList.toggle("hidden", role !== "dm");
  if (modalMapUploadStatus) modalMapUploadStatus.classList.toggle("hidden", role !== "dm");

  syncModalMapPreview(h, role);
  if (modalMapUploadStatus) modalMapUploadStatus.textContent = "";
  if (modalMapImageUpload) modalMapImageUpload.value = "";
  modalGMClaimControls.classList.toggle("hidden", role !== "dm" || String(h.type || "").toLowerCase() !== "loot");
  modalImageWrap?.classList.toggle("is-editable", role === "dm" && !isMapHandoutType(h.type));
  const isNpcType = String(h.type || "").toLowerCase() === "npc";
  if (btnAddHandoutToInitiativeModal) {
    btnAddHandoutToInitiativeModal.classList.toggle("hidden", role !== "dm" || !isNpcType);
    if (role === "dm" && isNpcType) {
      const linkedId = String(h.id || "").trim();
      const alreadyInInitiative = (state.partyRoster || []).some((entry) =>
        entry?.isNpc === true &&
        (linkedId && String(entry?.npcHandoutId || "").trim() === linkedId ||
         normalizeNpcSyncKey(entry?.nickname) === normalizeNpcSyncKey(h.title))
      );
      btnAddHandoutToInitiativeModal.textContent = alreadyInInitiative ? "Remove from Initiative" : "Add for Initiative";
      btnAddHandoutToInitiativeModal.dataset.inInitiative = alreadyInInitiative ? "1" : "";
    }
  }

  setupClaimUI(h, role);
}

function resolveModalImage(h) {
  if (!modalImage) return;
  const hardFallbackUrl = "placeholders/Prompt1image1_1.png";
  const storedImageUrl = String(getHandoutAvatarImageUrl(h) || "").trim();
  const semanticFallbackUrl = selectBestPlaceholderImage({
    title: String(h.title || ""),
    publicContent: String(h.publicContent || ""),
    type: String(h.type || "").toLowerCase(),
    npcDisposition: String(h.npcDisposition || "").toLowerCase(),
  })?.url || "";
  const chronologicalPool = getChronologicalPlaceholderImages();
  const seededFallbackUrl = chronologicalPool.length
    ? chronologicalPool[stableHash(`${String(h.id || "")}|${String(h.title || "")}`) % chronologicalPool.length].url
    : "";

  const fallbackImageUrl = String(semanticFallbackUrl || seededFallbackUrl || hardFallbackUrl).trim();
  const resolvedImageUrl = String(storedImageUrl || fallbackImageUrl).trim();
  const showImage = !!resolvedImageUrl;
  modalImageWrap?.classList.toggle("hidden", !showImage);
  if (showImage) {
    modalImage.onerror = () => {
      if (modalImage.src.includes(hardFallbackUrl)) return;
      modalImage.src = hardFallbackUrl;
      modalImageWrap?.classList.remove("hidden");
    };
    modalImage.src = resolvedImageUrl;
    // Keep detail modal composition stable: ignore per-card frame zoom/offset
    // that can make artwork appear oversized in the fullscreen modal.
    modalImage.style.removeProperty("transform");
    modalImage.style.removeProperty("transform-origin");
    modalImageWrap?.classList.remove("hidden");
  } else {
    modalImage.removeAttribute("src");
  }
}

function initModalState(h, role) {
  if (role === "dm") {
    modalDraft = {
      revealed: !!h.revealed,
      secretRevealed: !!h.secretRevealed,
      claimable: !!h.claimable,
      title: String(h.title || "").trim(),
      publicContent: String(h.publicContent || "").trim(),
      secretContent: String(h.secretContent || "").trim(),
      iconKey: String(h.iconKey || h.iconEmoji || "").trim(),
      imageUrl: String(getHandoutAvatarImageUrl(h) || "").trim(),
      type: String(h.type || "").toLowerCase(),
      isEditing: false,
      original: {
        revealed: !!h.revealed,
        secretRevealed: !!h.secretRevealed,
        claimable: !!h.claimable,
        title: String(h.title || "").trim(),
        publicContent: String(h.publicContent || "").trim(),
        secretContent: String(h.secretContent || "").trim(),
        iconKey: String(h.iconKey || h.iconEmoji || "").trim(),
        imageUrl: String(getHandoutAvatarImageUrl(h) || "").trim(),
      },
    };

    syncRevealButtons();
    syncClaimableButton();
    setModalEditing(false);
    refreshModalSaveState();
  }
}


// ============================================================================
// GLOBAL EVENT LISTENERS (Initialized Once)
// ============================================================================
// ---- Lightbox logic ----
const lightboxModal = $("imageLightboxModal");
const lightboxImage = $("lightboxImage");
const btnCloseLightbox = $("btnCloseLightbox");
let lightboxScale = 1;

function openLightbox(src) {
  if (!src) return;
  lightboxImage.src = src;
  lightboxScale = 1;
  lightboxImage.style.transform = `scale(${lightboxScale})`;
  lightboxModal.classList.remove("hidden");
  lightboxModal.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightboxModal.classList.add("hidden");
  lightboxModal.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
}

lightboxImage?.addEventListener("click", () => {
  lightboxScale = lightboxScale === 1 ? 2 : 1;
  lightboxImage.style.transform = `scale(${lightboxScale})`;
  lightboxImage.style.cursor = lightboxScale === 1 ? "zoom-in" : "zoom-out";
});
btnCloseLightbox?.addEventListener("click", closeLightbox);
lightboxModal?.addEventListener("click", (e) => {
  if (e.target === lightboxModal || e.target.classList.contains("lightboxModal__zoomWrap")) closeLightbox();
});

if (modalMapDisplayFrame) {
  modalMapDisplayFrame.addEventListener("click", () => {
    if (modalMapPreviewImg && modalMapPreviewImg.src && !modalMapPreviewImg.classList.contains("hidden")) {
      openLightbox(modalMapPreviewImg.src);
    }
  });
}

if (modalImageWrap) {
  modalImageWrap.addEventListener("click", () => {
    if (modalCtx.role === "dm" && modalDraft && modalDraft.type !== "map") {
      const confirmed = confirmNuggetCost("Changing this handout portrait");
      if (!confirmed) {
        editHandoutImageUploadConfirmed = false;
        if (modalSaveState) modalSaveState.textContent = "Handout portrait update canceled.";
        return;
      }
      editHandoutImageUploadConfirmed = true;
      modalHandoutImageUpload?.click();
      return;
    }
    if (modalImage?.src) openLightbox(modalImage.src);
  });
}

modalHandoutImageUpload?.addEventListener("change", async () => {
  const file = modalHandoutImageUpload.files?.[0];
  if (!file || modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft || modalDraft.type === "map") {
    editHandoutImageUploadConfirmed = false;
    return;
  }
  if (!editHandoutImageUploadConfirmed) {
    const confirmed = confirmNuggetCost("Changing this handout portrait");
    if (!confirmed) {
      if (modalSaveState) modalSaveState.textContent = "Handout portrait update canceled.";
      modalHandoutImageUpload.value = "";
      return;
    }
    editHandoutImageUploadConfirmed = true;
  }
  if (modalSaveState) modalSaveState.textContent = "Uploading image...";

  const uploaded = await uploadHandoutImageToStorage(file, { handoutId: modalCtx.handoutId });
  if (!uploaded.ok || !uploaded.url) {
    if (modalSaveState) modalSaveState.textContent = uploaded.message || "Upload failed.";
    editHandoutImageUploadConfirmed = false;
    modalHandoutImageUpload.value = "";
    return;
  }

  modalDraft.imageUrl = uploaded.url;
  const current = (state.gmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || {};
  resolveModalImage({ ...current, imageUrl: uploaded.url, type: modalDraft.type });
  refreshModalSaveState();
  showToast("Image updated. Save to apply changes.", "info");
  editHandoutImageUploadConfirmed = false;
  modalHandoutImageUpload.value = "";
});

modalTitle?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalDraft || modalDraft.isEditing) return;
  setModalEditing(true);
  modalTitle.focus();
});

modalPublic?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalDraft || modalDraft.isEditing) return;
  setModalEditing(true);
  modalPublic.focus();
});

modalSecret?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalDraft || modalDraft.isEditing) return;
  setModalEditing(true);
  modalSecret.focus();
});

modalIconInput?.addEventListener("input", () => {
  if (!modalDraft) return;
  const val = String(modalIconInput.value || "").trim();
  const segments = val ? [...new Intl.Segmenter().segment(val)] : [];
  const firstEmoji = segments.length ? segments[0].segment : "";
  const resolved = firstEmoji && /\p{Extended_Pictographic}/u.test(firstEmoji) ? firstEmoji : "";
  if (modalIconPreview) modalIconPreview.textContent = resolved || "🎭";
  modalDraft.iconKey = resolved || modalDraft.original.iconKey || "";
  refreshModalSaveState();
});

modalIconPreview?.addEventListener("click", () => modalIconInput?.focus());

modalTitle?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  syncModalTextIntoDraft();
  refreshModalSaveState();
});

btnModalMapUpload?.addEventListener("click", () => {
  if (modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft || modalDraft.type !== "map") return;
  modalMapImageUpload?.click();
});

modalMapImageUpload?.addEventListener("change", async () => {
  const file = modalMapImageUpload.files?.[0];
  if (!file || modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft || modalDraft.type !== "map") return;
  if (modalMapUploadStatus) modalMapUploadStatus.textContent = "Uploading map...";

  const uploaded = await uploadMapImageToStorage(file, { handoutId: modalCtx.handoutId });
  if (!uploaded.ok || !uploaded.url) {
    if (modalMapUploadStatus) modalMapUploadStatus.textContent = uploaded.message || "Upload failed.";
    modalMapImageUpload.value = "";
    return;
  }

  try {
    const handoutRef = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    const current = (state.gmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || {};
    const visibleUid = String(current?.claimedByUid || "").trim() || null;
    await updateDoc(handoutRef, {
      mapImageUrl: uploaded.url,
      mapVisibleToUid: visibleUid,
      imageUrl: MAP_HANDOUT_AVATAR_URL,
      updatedAt: serverTimestamp(),
    });
    if (modalMapUploadStatus) modalMapUploadStatus.textContent = "Map replaced (1 nugget spent).";
    syncModalMapPreview({ ...current, type: "map", mapImageUrl: uploaded.url, mapVisibleToUid: visibleUid }, modalCtx.role || state.role);
    resolveModalImage({ ...current, type: "map", mapImageUrl: uploaded.url, imageUrl: MAP_HANDOUT_AVATAR_URL, mapVisibleToUid: visibleUid });
  } catch (err) {
    console.error("Modal map update failed:", err);
    if (modalMapUploadStatus) modalMapUploadStatus.textContent = "Upload succeeded but update failed.";
  } finally {
    modalMapImageUpload.value = "";
  }
});

if (modalClose) {
  modalClose.onclick = () => closeModalDiscardChanges();
}
if (modal) {
  modal.onclick = (e) => {
    if (e.target === modal) closeModalDiscardChanges();
  };
}

if (btnToggleReveal) {
  btnToggleReveal.onclick = () => {
    if (!modalDraft) return;
    modalDraft.revealed = !modalDraft.revealed;
    syncRevealButtons();
    refreshModalSaveState();
  };
}

if (btnToggleRevealSecret) {
  btnToggleRevealSecret.onclick = () => {
    if (!modalDraft) return;
    modalDraft.secretRevealed = !modalDraft.secretRevealed;
    syncRevealButtons();
    refreshModalSaveState();
  };
}

if (btnEditHandout) {
  btnEditHandout.onclick = () => {
    if (!modalDraft) return;
    if (modalDraft.isEditing) syncModalTextIntoDraft();
    setModalEditing(!modalDraft.isEditing);
    refreshModalSaveState();
  };
}

if (btnSaveHandout) {
  btnSaveHandout.onclick = () => saveCurrentHandout();
}

if (btnDeleteHandout) {
  btnDeleteHandout.onclick = () => deleteCurrentHandout();
}

if (btnAddHandoutToInitiativeModal) {
  btnAddHandoutToInitiativeModal.onclick = async () => {
    if (state.role !== "dm") return;
    if (!modalDraft || String(modalDraft.type || "").toLowerCase() !== "npc") return;
    const npcName = String(modalDraft.title || modalTitle?.textContent || "").trim();
    if (!npcName) {
      showToast("NPC name is required before adding to initiative.", "error");
      return;
    }
    const linkedById = (state.gmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || null;
    const linkedId = String(modalCtx.handoutId || "").trim();
    if (btnAddHandoutToInitiativeModal.dataset.inInitiative === "1") {
      // Remove the NPC from initiative
      const entry = (state.partyRoster || []).find((e) =>
        e?.isNpc === true &&
        (linkedId && String(e?.npcHandoutId || "").trim() === linkedId ||
         normalizeNpcSyncKey(e?.nickname) === normalizeNpcSyncKey(npcName))
      );
      if (entry?.id) {
        try {
          await deleteDoc(doc(db, "sessions", state.sessionId, "players", entry.id));
          showToast(`${npcName} removed from initiative.`, "info");
          btnAddHandoutToInitiativeModal.textContent = "Add for Initiative";
          btnAddHandoutToInitiativeModal.dataset.inInitiative = "";
        } catch (err) {
          console.error("Remove from initiative failed:", err);
          showToast("Could not remove from initiative.", "error");
        }
      }
    } else {
      await addNpcToInitiativeFromHandoutName(npcName, linkedById);
      btnAddHandoutToInitiativeModal.textContent = "Remove from Initiative";
      btnAddHandoutToInitiativeModal.dataset.inInitiative = "1";
    }
  };
}

if (btnToggleClaimable) {
  btnToggleClaimable.onclick = () => {
    if (!modalDraft) return;
    modalDraft.claimable = !modalDraft.claimable;
    syncClaimableButton();
    refreshModalSaveState();
  };
}

if (btnResetClaim) {
  btnResetClaim.onclick = () => resetClaim();
}

function openModal(h, role) {
  // BEGINNER NOTE:
  // Instead of one massive function, we split into "Render DOM" and "Init State".
  renderModalContent(h, role);
  initModalState(h, role);
  animateModalIn(modal);
}

async function saveCurrentHandout() {
  if (modalCtx.role !== "dm" || !modalCtx.handoutId || !modalDraft) return;
  if (btnSaveHandout) btnSaveHandout.disabled = true;
  let spentForEdit = false;
  try {
    syncModalTextIntoDraft();
    const validationError = validateHandoutCoreFields({
      title: modalDraft.title,
      publicContent: modalDraft.publicContent,
      type: modalDraft.type,
    });
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    if (!isModalDraftDirty()) {
      closeModalDiscardChanges();
      return;
    }

    const spent = await spendNuggetWithFeedback("handout edit");
    if (!spent) return;
    spentForEdit = true;

    const ref = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    const payload = {
      title: modalDraft.title,
      publicContent: modalDraft.publicContent,
      secretContent: modalDraft.secretContent,
      revealed: !!modalDraft.revealed,
      secretRevealed: !!modalDraft.secretRevealed,
      updatedAt: serverTimestamp(),
    };
    if (modalDraft.iconKey && modalDraft.iconKey !== modalDraft.original.iconKey) {
      payload.iconKey = modalDraft.iconKey;
      payload.iconEmoji = modalDraft.iconKey;
    }

    if (String(modalDraft.imageUrl || "") !== String(modalDraft.original.imageUrl || "")) {
      payload.imageUrl = modalDraft.imageUrl || null;
      payload.imageFrame = null;
    }

    if (modalDraft.type === "loot") {
      payload.claimable = !!modalDraft.claimable;
    }

    await updateDoc(ref, payload);
    showToast("Handout saved.", "success");
    closeModalDiscardChanges();
  } catch (e) {
    console.error(e);
    if (spentForEdit && state.sessionId && state.uid) {
      const walletId = state.role === "dm" ? "dm" : state.uid;
      const walletRef = doc(db, "sessions", state.sessionId, "wallets", walletId);
      try { await updateDoc(walletRef, { nuggets: increment(1) }); } catch (_) {}
    }
    showToast("Saving handout failed. Check Console (F12).", "error");
  } finally {
    if (btnSaveHandout) btnSaveHandout.disabled = false;
  }
}

async function deleteCurrentHandout() {
  const handoutId = modalCtx.handoutId;
  if (!handoutId) return;
  closeModalDiscardChanges();
  showUndoToast("Handout deleted.", async () => {
    try {
      const ref = doc(db, "sessions", state.sessionId, "handouts", handoutId);
      await deleteDoc(ref);
    } catch (e) {
      console.error(e);
      showToast("Delete handout failed.", "error");
    }
  });
}

function setupClaimUI(handout, role) {
  // -------------------------------------------------------------------------
  // CLAIM UI EXPLANATION (important for fairness + UX)
  // -------------------------------------------------------------------------
  // "Fairness" is enforced at write-time with Firestore transactions.
  // This setup function only decides what the user can SEE/CLICK right now.
  // -------------------------------------------------------------------------
  const isLoot = String(handout.type || "").toLowerCase() === "loot";
  if (!isLoot || !modalClaimWrap || !btnClaim || !btnUnclaim || !claimStatus) return;

  const claimable = !!handout.claimable;
  const claimedByNick = String(handout.claimedByNick || "").trim();
  const claimedByUid = String(handout.claimedByUid || "").trim();
  const isClaimed = Boolean(claimedByUid);
  const isMine = isClaimed && claimedByUid === state.uid;

  // Populate GM assignment dropdown with current active players.
  populateAssignablePlayers(claimedByUid);

  if (btnAssignClaim) {
    btnAssignClaim.disabled = role !== "dm" || state.activePlayers.length === 0;
    btnAssignClaim.onclick = () => assignClaimToSelectedPlayer();
  }

  btnClaim.classList.add("hidden");
  btnClaim.disabled = false;
  btnClaim.textContent = "Claim loot";
  btnClaim.onclick = null;
  btnUnclaim.classList.add("hidden");
  btnUnclaim.disabled = false;
  btnUnclaim.textContent = "Unclaim";
  btnUnclaim.onclick = null;

  if (!claimable) {
    claimStatus.textContent = role === "dm"
      ? "Claiming is disabled for this loot."
      : "This loot cannot be claimed right now.";
    return;
  }

  if (isClaimed) {
    claimStatus.textContent = isMine
      ? "You claimed this loot. Unclaiming returns it to the revealed handouts overview."
      : `Claimed by ${claimedByNick || "another player"}.`;
    if (isMine && role === "player") {
      btnUnclaim.classList.remove("hidden");
      btnUnclaim.onclick = () => unclaimHandout(modalCtx.handoutId, btnUnclaim, { closeModalOnSuccess: true });
    }
    return;
  }

  claimStatus.textContent = role === "dm"
    ? "Unclaimed. Players can claim this loot."
    : "Unclaimed. First successful claim gets the loot.";

  if (role === "player") {
    btnClaim.classList.remove("hidden");

    // Offline rule for fairness:
    // We intentionally disable claiming while offline.
    // Reason: offline queued writes cannot guarantee true first-come-first-serve.
    if (!navigator.onLine) {
      btnClaim.disabled = true;
      claimStatus.textContent = "Reconnect to claim fairly (claiming is disabled while offline).";
      return;
    }

    btnClaim.onclick = () => claimCurrentHandout();
  }
}

async function unclaimHandout(handoutId, triggerBtn, { closeModalOnSuccess = false } = {}) {
  if (!state.uid || !state.sessionId || !handoutId) {
    showToast("Missing unclaim context.", "error");
    return false;
  }
  if (!navigator.onLine) {
    showToast("Reconnect to unclaim right now.", "error");
    return false;
  }

  if (triggerBtn) triggerBtn.disabled = true;
  const handoutRef = doc(db, "sessions", state.sessionId, "handouts", handoutId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(handoutRef);
      if (!snap.exists()) return { ok: false, reason: "missing" };

      const data = snap.data();
      const isLoot = String(data.type || "").toLowerCase() === "loot";
      if (!isLoot) return { ok: false, reason: "not-loot" };

      const claimedByUid = String(data.claimedByUid || "").trim();
      const claimedByNick = String(data.claimedByNick || "").trim();
      if (!claimedByUid) return { ok: false, reason: "already-open" };
      if (claimedByUid !== state.uid) {
        return { ok: false, reason: "not-yours", by: claimedByNick || "another player" };
      }

      tx.update(handoutRef, {
        claimedByUid: null,
        claimedByNick: null,
        mapVisibleToUid: null,
        claimedAt: null,
        updatedAt: serverTimestamp(),
      });
      return { ok: true };
    });

    if (result?.ok) {
      if (currentScreenKey === SCREEN_KEYS.PLAYER_INVENTORY) {
        renderInventoryScreen();
      }
      if (closeModalOnSuccess) closeModalDiscardChanges();
      showToast("Loot returned to revealed handouts.", "success");
      return true;
    }
    if (result?.reason === "already-open") {
      showToast("This loot is already unclaimed.", "info");
      return false;
    }
    if (result?.reason === "not-yours") {
      showToast(`Only ${result.by} can unclaim this loot.`, "error");
      return false;
    }

    showToast("Could not unclaim this loot right now.", "error");
    return false;
  } catch (e) {
    console.error("[TV] Unclaim transaction failed:", e);
    showToast("Unclaim failed. Check your connection and try again.", "error");
    return false;
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

async function resetClaim() {
  // GM moderation action: clear existing claim lock and reopen claim race.
  if (!modalCtx.handoutId || !state.sessionId) return;
  if (!confirm("Reset current claim?")) return;
  try {
    const ref = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    await updateDoc(ref, {
      claimedByUid: null,
      claimedByNick: null,
      mapVisibleToUid: null,
      claimedAt: null,
      updatedAt: serverTimestamp(),
    });
    // Refresh modal claim UI immediately so GM sees the change
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const updated = { id: snap.id, ...snap.data() };
      setupClaimUI(updated, "dm");
    }
    showToast("Claim reset.", "success");
  } catch (e) {
    console.error(e);
    showToast("Reset claim failed.", "error");
  }
}

function populateAssignablePlayers(selectedUid = "") {
  // Fill select box for GM assignment action.
  if (!gmAssignPlayer) return;
  gmAssignPlayer.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = state.activePlayers.length > 0 ? "Select player..." : "No players available";
  gmAssignPlayer.appendChild(defaultOption);

  state.activePlayers.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.nickname || "Adventurer";
    gmAssignPlayer.appendChild(option);
  });

  if (selectedUid && state.activePlayers.some((p) => p.id === selectedUid)) {
    gmAssignPlayer.value = selectedUid;
  }
}

async function assignClaimToSelectedPlayer() {
  // -------------------------------------------------------------------------
  // GM MANUAL ASSIGNMENT (supports online and offline play)
  // -------------------------------------------------------------------------
  // Why this method uses updateDoc instead of transaction:
  // - Transactions are best for online race arbitration.
  // - GM assignment must also work offline.
  // - updateDoc writes locally and syncs to cloud once online.
  // -------------------------------------------------------------------------
  if (!gmAssignPlayer) return;

  const targetUid = gmAssignPlayer.value;
  if (!targetUid) {
    showToast("Select a player first.", "error");
    return;
  }

  const targetPlayer = state.activePlayers.find((p) => p.id === targetUid);
  if (!targetPlayer) {
    showToast("Selected player is not available.", "error");
    return;
  }

  try {
    const handoutCurrent = (state.gmHandoutsRaw || []).find((entry) => entry?.id === modalCtx.handoutId) || null;
    const isMap = isMapHandoutType(handoutCurrent?.type);
    const handoutRef = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
    await updateDoc(handoutRef, {
      claimable: true,
      revealed: true,
      claimedByUid: targetUid,
      claimedByNick: targetPlayer.nickname || "Adventurer",
      mapVisibleToUid: isMap ? targetUid : null,
      claimedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const assignedName = targetPlayer.nickname || "Adventurer";
    claimStatus.textContent = navigator.onLine
      ? `Assigned to ${assignedName}.`
      : `Assigned locally to ${assignedName}. Will sync when online.`;
    btnClaim?.classList.add("hidden");
    showToast(`Assigned and revealed to ${assignedName}!`, "success");
  } catch (e) {
    console.error("Assign claim failed:", e);
    showToast("Could not assign this handout right now.", "error");
  }
}

async function claimCurrentHandout() {
  // -------------------------------------------------------------------------
  // FAIR CLAIM TRANSACTION (server-authoritative first-wins)
  // -------------------------------------------------------------------------
  // Why transaction?
  // - Multiple players can click at nearly the same time.
  // - Transaction re-reads latest server state and retries safely.
  // - Exactly one successful commit gets to set claimedByUid first.
  // -------------------------------------------------------------------------
  // Preconditions:
  // - user identity must exist
  // - session + handout context must exist
  // - browser must be online for fairness guarantee
  if (!state.uid || !state.sessionId || !modalCtx.handoutId) {
    showToast("Missing claim context. Re-open the handout and try again.", "error");
    return;
  }

  if (!navigator.onLine) {
    showToast("You are offline. Reconnect to claim fairly.", "error");
    return;
  }

  const handoutRef = doc(db, "sessions", state.sessionId, "handouts", modalCtx.handoutId);
  const nickname = getPlayerNickname();

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(handoutRef);
      if (!snap.exists()) return { ok: false, reason: "missing" };

      const data = snap.data();
      const isLoot = String(data.type || "").toLowerCase() === "loot";
      if (!isLoot) return { ok: false, reason: "not-loot" };
      if (!data.claimable) return { ok: false, reason: "not-claimable" };

      const claimedByUid = String(data.claimedByUid || "").trim();
      if (claimedByUid) {
        if (claimedByUid === state.uid) return { ok: false, reason: "already-mine" };
        return { ok: false, reason: "taken", by: data.claimedByNick || "another player" };
      }

      tx.update(handoutRef, {
        claimedByUid: state.uid,
        claimedByNick: nickname,
        mapVisibleToUid: String(data.type || "").toLowerCase() === "map" ? state.uid : null,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { ok: true };
    });

    if (result?.ok) {
      claimStatus.textContent = "Claim successful. This loot is now yours.";
      btnClaim?.classList.add("hidden");
      return;
    }

    if (result?.reason === "taken") {
      claimStatus.textContent = `Too late � claimed by ${result.by}.`;
      btnClaim?.classList.add("hidden");
      return;
    }
    if (result?.reason === "already-mine") {
      claimStatus.textContent = "You already claimed this loot.";
      btnClaim?.classList.add("hidden");
      return;
    }
    if (result?.reason === "not-claimable") {
      claimStatus.textContent = "Claiming is disabled for this loot.";
      btnClaim?.classList.add("hidden");
      return;
    }

    claimStatus.textContent = "Could not claim loot. Please try again.";
  } catch (e) {
    console.error("Claim transaction failed:", e);
    claimStatus.textContent = "Claim failed due to connection/state conflict. Try again.";
  }
}

async function claimHandoutByCard(handoutId, cardBtn) {
  // Card-level immediate claim: same fairness transaction as claimCurrentHandout
  // but uses toast feedback instead of the modal's claimStatus element.
  if (!state.uid || !state.sessionId || !handoutId) {
    showToast("Missing claim context.", "error");
    return;
  }
  if (!navigator.onLine) {
    showToast("You are offline. Reconnect to claim fairly.", "error");
    return;
  }
  if (cardBtn) cardBtn.disabled = true;
  const handoutRef = doc(db, "sessions", state.sessionId, "handouts", handoutId);
  const nickname = getPlayerNickname();
  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(handoutRef);
      if (!snap.exists()) return { ok: false, reason: "missing" };
      const data = snap.data();
      const isLootType = String(data.type || "").toLowerCase() === "loot";
      if (!isLootType) return { ok: false, reason: "not-loot" };
      if (!data.claimable) return { ok: false, reason: "not-claimable" };
      const claimedByUid = String(data.claimedByUid || "").trim();
      if (claimedByUid === state.uid) return { ok: false, reason: "already-mine" };
      if (claimedByUid) return { ok: false, reason: "taken", by: data.claimedByNick || "another player" };
      tx.update(handoutRef, {
        claimedByUid: state.uid,
        claimedByNick: nickname,
        mapVisibleToUid: isLootType ? null : state.uid,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ok: true };
    });
    if (result?.ok) { showToast("Loot claimed!", "success"); return; }
    if (result?.reason === "taken") { showToast(`Too late — claimed by ${result.by}.`, "error"); return; }
    if (result?.reason === "already-mine") { showToast("You already claimed this loot.", "info"); return; }
    if (result?.reason === "not-claimable") { showToast("Claiming is disabled for this loot.", "error"); return; }
    showToast("Could not claim this loot right now.", "error");
  } catch (e) {
    console.error("[TV] Card claim transaction failed:", e);
    showToast("Claim failed. Check your connection and try again.", "error");
  }
  // Card state updates automatically via onSnapshot re-render — no manual re-enable needed.
}

// ---- 18) Leave / end session ----
// BEGINNER NOTE � Cleanup pattern:
// Leaving a session is the reverse of joining: stop background timers,
// unsubscribe Firestore listeners, wipe in-memory state, update
// localStorage, and navigate to the landing screen.
// If you forget any step, you get ghosts: stale data, phantom timers,
// or listeners burning bandwidth for a session you're no longer in.
function leavePlayerSession() {
  rememberCurrentPlayerSessionForList();
  // Player local logout: stop timers/listeners and return to landing UI.
  stopHeartbeat();
  cleanupListeners();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.joinLink = null;
  state.inventoryItems = [];
  state.wallets = {};
  persistLocal();
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
}

btnLeave && (btnLeave.onclick = () => {
  leavePlayerSession();
});

// btnLeaveInventory removed � inventory back button now navigates to dashboard.

btnEndSession && (btnEndSession.onclick = () => {
  // GM local logout: clear local role/session context.
  stopHeartbeat();
  cleanupListeners();
  state.role = null;
  state.sessionId = null;
  state.joinTag = null;
  state.joinLink = null;
  state.gmPinPlain = null;
  state.inventoryItems = [];
  state.wallets = {};
  persistLocal();
  showOnly(SCREEN_KEYS.LANDING);
  loadMySessions();
});

// ---- 19) Ambience playback (player-side) ----
// BEGINNER NOTE � Browser autoplay policy:
// Modern browsers block audio from playing automatically until the user
// has interacted with the page (click, tap, keypress). This is why we
// have a dedicated "Enable Sound" button � clicking it counts as a user
// gesture and unlocks the Audio API. We persist the preference in
// localStorage so the button state survives page reloads.
//
// Single shared audio element used by both GM and players.
const ambienceAudio = new Audio();
ambienceAudio.loop = true;
ambienceAudio.preload = "auto";
ambienceAudio.playsInline = true;
try {
  ambienceAudio.setAttribute("playsinline", "");
  ambienceAudio.setAttribute("webkit-playsinline", "");
} catch {}
ambienceAudio.addEventListener("error", () => {
  const src = ambienceAudio.currentSrc || ambienceAudio.src || "(unknown)";
  console.error("Ambience audio failed to load:", src, ambienceAudio.error);
  try {
    showToast("Audio file failed to load. Check connection or file path.", "error", 2600);
  } catch {}
});

// --- Audio playback strategy ---
// Browsers may reject HTMLMediaElement.play() with NotAllowedError when no
// local user gesture has happened yet. We handle that by setting a pending
// resume flag and retrying on the next gesture (or explicit Enable Audio tap).

function ensureAmbienceAudioMounted() {
  if (ambienceAudio.isConnected) return;
  try {
    ambienceAudio.style.display = "none";
    ambienceAudio.setAttribute("aria-hidden", "true");
    if (document.body) document.body.appendChild(ambienceAudio);
  } catch {}
}

ensureAmbienceAudioMounted();
async function attemptAmbiencePlay(targetVolume = ambienceAudio.volume || 0.6) {
  ensureAmbienceAudioMounted();
  if (!ambienceAudio.src) return false;

  const vol = Math.min(1, Math.max(0, Number(targetVolume ?? 0.6)));

  try {
    // Primary path: normal unmuted playback at target volume.
    ambienceAudio.muted = false;
    ambienceAudio.volume = vol;
    await ambienceAudio.play();
    return true;
  } catch (firstErr) {
    try {
      // Fallback used by some mobile browsers: prime play muted, then unmute.
      // Fallback reminder: backup strategy that runs only if primary path fails.
      // Tip: always await play(); rejected promises are the only reliable
      // signal that autoplay policy blocked audio.
      ambienceAudio.muted = true;
      ambienceAudio.volume = 0;
      await ambienceAudio.play();
      ambienceAudio.muted = false;
      ambienceAudio.volume = vol;
      // Verify audio is still actually playing after unmute.
      // Some browsers silently pause the element when unmuted without a gesture.
      await new Promise((r) => setTimeout(r, 50));
      if (ambienceAudio.paused) return false;
      return true;
    } catch (secondErr) {
      console.warn("Ambience play blocked:", secondErr || firstErr);
      return false;
    }
  }
}
// Browser autoplay restrictions require explicit user action for sound.
// soundEnabled is declared earlier near the state block, persisted in localStorage.

// Settings sound toggle (replaces old inline btnEnableSound)
const btnToggleSound = $("btnToggleSound");

function syncSoundToggleUI() {
  if (btnToggleSound) {
    btnToggleSound.textContent = soundEnabled ? "Sound Enabled" : "Enable Sound";
    btnToggleSound.classList.toggle("btn--active", soundEnabled);
  }
  // Sync mute toggle icon in ambience bar
  const muteIconOn = document.getElementById("muteIconOn");
  const muteIconOff = document.getElementById("muteIconOff");
  if (muteIconOn) muteIconOn.classList.toggle("hidden", !soundEnabled);
  if (muteIconOff) muteIconOff.classList.toggle("hidden", soundEnabled);
  syncHamburgerQuickActions();
}

if (btnToggleSound) {
  syncSoundToggleUI();
  btnToggleSound.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("tv_soundEnabled", soundEnabled ? "1" : "0");
    if (soundEnabled) {
      if (ambienceAudio.src) {
        const ok = await attemptAmbiencePlay();
        if (!ok) requestAmbienceResume();
      }
      showToast("Sound enabled", "success", 1500);
    } else {
      ambienceAudio.pause();
      showToast("Sound muted", "info", 1500);
    }
    syncSoundToggleUI();
  });
}

// Mute toggle button in ambience bar (uniform with play/pause)
const btnMuteToggle = $("btnMuteToggle");
if (btnMuteToggle) {
  syncSoundToggleUI();
  btnMuteToggle.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("tv_soundEnabled", soundEnabled ? "1" : "0");
    if (soundEnabled) {
      if (ambienceAudio.src) {
        const ok = await attemptAmbiencePlay();
        if (!ok) requestAmbienceResume();
      }
      showToast("Sound enabled", "success", 1500);
    } else {
      ambienceAudio.pause();
      showToast("Sound muted", "info", 1500);
    }
    syncSoundToggleUI();
  });
}

// Bottom bar & social toggle handlers
if (btnOpenAmbienceBar) {
  // For GM: opens the full ambience control panel.
  // For players: toggles local audio mute/unmute as a quick listen toggle.
  btnOpenAmbienceBar.addEventListener("click", async (e) => {
    // Player mode: toggle mute/unmute instead of opening GM panel
    if (state.role === "player") {
      // If already enabled but currently paused, try to resume before muting.
      if (!soundEnabled) {
        soundEnabled = true;
      } else if (!ambienceAudio.paused) {
        soundEnabled = false;
      }
      localStorage.setItem("tv_soundEnabled", soundEnabled ? "1" : "0");
      if (soundEnabled) {
        if (ambienceAudio.src) {
          const ok = await attemptAmbiencePlay();
          if (!ok) requestAmbienceResume();
        }
        showToast("Sound enabled", "success", 1500);
      } else {
        ambienceAudio.pause();
        showToast("Sound muted", "info", 1500);
      }
      try { syncSoundToggleUI(); } catch (_) {}
      btnOpenAmbienceBar.classList.toggle("is-active", soundEnabled);
      return;
    }
    // GM mode: open/close ambience control panel on the current session screen.
    // Do not navigate to the handout dashboard; the music panel is an overlay.
    if (!state.sessionId) return;
    if (!ambienceBar) return;
    const isHidden = ambienceBar.classList.contains("hidden");
    if (isHidden) {
      if (currentScreenKey === SCREEN_KEYS.GM_DASH) setGMSocialMode(false);
      ambienceBar.classList.remove("hidden");
      ambienceBar.setAttribute("aria-hidden", "false");
      try { gmAmbience?.focus(); } catch {}
      try { btnOpenAmbienceBar.classList.add("is-active"); } catch (e) {}
    } else {
      ambienceBar.classList.add("hidden");
      ambienceBar.setAttribute("aria-hidden", "true");
      try { btnOpenAmbienceBar.classList.remove("is-active"); } catch (e) {}
    }
  });
}

if (btnCloseAmbienceBar) {
  // Explicit close action for ambience panel.
  btnCloseAmbienceBar.addEventListener("click", (e) => {
    if (!ambienceBar) return;
    ambienceBar.classList.add("hidden");
    ambienceBar.setAttribute("aria-hidden", "true");
  });
}

// ---- Credits modal (music attribution) ----
function openCreditsModal() {
  if (!creditsModal) return;
  animateModalIn(creditsModal);
}

function closeCreditsModal() {
  if (!creditsModal) return;
  animateModalOut(creditsModal);
}

let pendingExternalUrl = "";

function openExternalLinkModal(urlRaw) {
  if (!externalLinkModal) return;
  let parsed;
  try {
    parsed = new URL(String(urlRaw || ""), location.href);
  } catch {
    return;
  }

  pendingExternalUrl = parsed.href;
  if (externalLinkHost) externalLinkHost.textContent = parsed.host;
  animateModalIn(externalLinkModal);
}

function closeExternalLinkModal() {
  if (!externalLinkModal) return;
  animateModalOut(externalLinkModal);
  pendingExternalUrl = "";
}

// Info button in ambience bar
if (btnAmbienceInfo) {
  btnAmbienceInfo.addEventListener("click", (event) => {
    event.preventDefault();
    openCreditsModal();
  });
}

// Credits button in Settings
if (btnShowCredits) {
  btnShowCredits.addEventListener("click", (event) => {
    event.preventDefault();
    openCreditsModal();
  });
}

// Close button inside the modal
if (btnCloseCredits) {
  btnCloseCredits.addEventListener("click", closeCreditsModal);
}

// Clicking the backdrop also closes
creditsModal?.querySelector(".credits-modal__backdrop")?.addEventListener("click", closeCreditsModal);

// Credits links and cards route through the same external-link confirmation.
creditsModal?.addEventListener("click", (event) => {
  const anchor = event.target?.closest?.("a[href]");
  if (anchor && creditsModal.contains(anchor)) {
    event.preventDefault();
    openExternalLinkModal(anchor.href);
    return;
  }

  const card = event.target?.closest?.(".credit-item[data-primary-url]");
  if (card && creditsModal.contains(card)) {
    openExternalLinkModal(card.getAttribute("data-primary-url"));
  }
});

btnExternalLinkConfirm?.addEventListener("click", () => {
  if (pendingExternalUrl) window.open(pendingExternalUrl, "_blank", "noopener,noreferrer");
  closeExternalLinkModal();
});

btnExternalLinkCancel?.addEventListener("click", closeExternalLinkModal);
externalLinkModal?.addEventListener("click", (event) => {
  if (event.target === externalLinkModal) closeExternalLinkModal();
});

function syncAmbienceButtonState(isPlaying) {
  // Visual mode indicator: yellow highlight marks the active transport state.
  btnGMPlay?.classList.toggle("is-active", !!isPlaying);
  btnGMPause?.classList.toggle("is-active", !isPlaying);
  // Animated gold bars � visible only when a track is actively playing.
  $("ambienceAudioBars")?.classList.toggle("hidden", !isPlaying);
  renderAtmospherePanel({
    track: gmAmbience?.value,
    volume: Number(gmVolume?.value ?? 0.6),
    isPlaying: !!isPlaying,
  });
}

if (btnToggleSocial) {
  // Toolbar action: open/close dedicated social view mode.
  btnToggleSocial.addEventListener("click", (e) => {
    if (btnToggleSocial.disabled) return;
    if (currentScreenKey !== SCREEN_KEYS.GM_DASH) {
      showOnly(SCREEN_KEYS.GM_DASH);
      setGMSocialMode(true);
      return;
    }
    const opening = !gmSplit?.classList.contains("social-mode");
    setGMSocialMode(opening);
  });
}

if (btnOpenSocialFromParty) {
  btnOpenSocialFromParty.addEventListener("click", () => {
    if (currentScreenKey !== SCREEN_KEYS.GM_DASH) showOnly(SCREEN_KEYS.GM_DASH);
    if (state.joinLink) {
      openQRInviteModal();
      return;
    }
    setGMSocialMode(true);
  });
}

if (btnOpenCreateHandout) {
  if (!btnOpenCreateHandout.onclick) btnOpenCreateHandout.addEventListener("click", () => {
    if (btnOpenCreateHandout.disabled) return;
    openCreateHandoutModal({ ensureDashboard: true });
  });
}

if (btnOpenInventory) {
  if (!btnOpenInventory.onclick) btnOpenInventory.addEventListener("click", () => {
    if (btnOpenInventory.disabled) return;
    openInventoryScreen();
  });
}

if (btnCloseSocial) {
  btnCloseSocial.addEventListener("click", () => {
    gmSocialPanel?.classList.add("hidden");
    gmSplit?.classList.remove("social-mode");
    gmHandoutsPanel?.classList.remove("hidden");
    setGMSocialMode(false);
  });
}

// Change / set session PIN from the social panel (in-app modal, no prompt())
{
  const changePinModal = $("changePinModal");
  const changePinInput = $("changePinInput");
  const changePinMsg = $("changePinMsg");
  const btnConfirmChangePin = $("btnConfirmChangePin");
  const btnCancelChangePin = $("btnCancelChangePin");

  function openChangePinModal() {
    if (!changePinModal) return;
    if (changePinInput) changePinInput.value = "";
    if (changePinMsg) changePinMsg.textContent = "";
    animateModalIn(changePinModal);
    changePinInput?.focus();
  }
  function closeChangePinModal() {
    if (!changePinModal) return;
    animateModalOut(changePinModal);
  }

  btnChangePin?.addEventListener("click", () => {
    if (!state.sessionId || state.role !== "dm") return;
    openChangePinModal();
  });

  btnConfirmChangePin?.addEventListener("click", async () => {
    const trimmed = (changePinInput?.value || "").trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      if (changePinMsg) changePinMsg.textContent = "PIN must be 4�8 digits.";
      return;
    }
    try {
      const pinHash = await sha256(trimmed);
      await updateDoc(doc(db, "sessions", state.sessionId), { pinHash });
      state.gmPinPlain = trimmed;
      persistLocal();
      if (gmPinShown) gmPinShown.textContent = trimmed;
      if (btnChangePin) btnChangePin.textContent = "Change";
      const qrUrl = `${state.joinLink}&pin=${encodeURIComponent(trimmed)}`;
      renderQR(qrUrl);
      closeChangePinModal();
      showToast("PIN updated!", "success");
    } catch (e) {
      console.error("changePin:", e);
      if (changePinMsg) changePinMsg.textContent = "Failed to update PIN.";
    }
  });

  btnCancelChangePin?.addEventListener("click", closeChangePinModal);

  changePinModal?.querySelector(".blockingModal__backdrop")?.addEventListener("click", closeChangePinModal);
}

// -- GM Transfer PIN modal (separate from session join PIN) --
{
  const changeTransferPinModal = $("changeTransferPinModal");
  const changeTransferPinInput = $("changeTransferPinInput");
  const changeTransferPinMsg = $("changeTransferPinMsg");
  const btnConfirmChangeTransferPin = $("btnConfirmChangeTransferPin");
  const btnRemoveTransferPin = $("btnRemoveTransferPin");
  const btnCancelChangeTransferPin = $("btnCancelChangeTransferPin");

  function openChangeTransferPinModal() {
    if (!changeTransferPinModal) return;
    if (changeTransferPinInput) changeTransferPinInput.value = "";
    if (changeTransferPinMsg) changeTransferPinMsg.textContent = "";
    animateModalIn(changeTransferPinModal);
    changeTransferPinInput?.focus();
  }
  function closeChangeTransferPinModal() {
    if (!changeTransferPinModal) return;
    animateModalOut(changeTransferPinModal);
  }

  btnChangeTransferPin?.addEventListener("click", () => {
    if (!state.sessionId || state.role !== "dm") return;
    openChangeTransferPinModal();
  });

  btnConfirmChangeTransferPin?.addEventListener("click", async () => {
    const trimmed = (changeTransferPinInput?.value || "").trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      if (changeTransferPinMsg) changeTransferPinMsg.textContent = "PIN must be 4�8 digits.";
      return;
    }
    try {
      const pinHash = await sha256(trimmed);
      await updateDoc(doc(db, "sessions", state.sessionId), { gmTransferPinHash: pinHash });
      if (gmTransferPinShown) gmTransferPinShown.textContent = "Set";
      if (btnChangeTransferPin) btnChangeTransferPin.textContent = "Change";
      closeChangeTransferPinModal();
      showToast("GM Transfer PIN set!", "success");
    } catch (e) {
      console.error("changeTransferPin:", e);
      if (changeTransferPinMsg) changeTransferPinMsg.textContent = "Failed to update transfer PIN.";
    }
  });

  btnRemoveTransferPin?.addEventListener("click", async () => {
    if (!state.sessionId || state.role !== "dm") return;
    try {
      await updateDoc(doc(db, "sessions", state.sessionId), { gmTransferPinHash: "" });
      if (gmTransferPinShown) gmTransferPinShown.textContent = "Not set";
      if (btnChangeTransferPin) btnChangeTransferPin.textContent = "Set";
      closeChangeTransferPinModal();
      showToast("GM Transfer PIN removed.", "info");
    } catch (e) {
      console.error("removeTransferPin:", e);
      if (changeTransferPinMsg) changeTransferPinMsg.textContent = "Failed to remove transfer PIN.";
    }
  });

  btnCancelChangeTransferPin?.addEventListener("click", closeChangeTransferPinModal);

  changeTransferPinModal?.querySelector(".blockingModal__backdrop")?.addEventListener("click", closeChangeTransferPinModal);
}

// GM sound is enabled by default when opening the GM dashboard (handled in openGMDashboard)

const AMBIENCE_URLS = {
  // Royalty-free ambience tracks (local audio/ folder).
  tavern:     "audio/Tavern - Music and Ambience.mp3",
  forest:     "audio/Forest - Ambience.mp3",
  dungeon:    "audio/Dungeon - Ambience.mp3",
  battle:     "audio/Battle - Music.mp3",
  ocean:      "audio/Ocean - Ambience.mp3",
  mysterious: "audio/Mysterious - Music and Ambience.mp3",
};

const AMBIENCE_FADE_MS = 900;
let ambienceFadeRaf = 0;
let ambienceFadeToken = 0;

function stopAmbienceFade() {
  if (ambienceFadeRaf) {
    cancelAnimationFrame(ambienceFadeRaf);
    ambienceFadeRaf = 0;
  }
}

function animateAmbienceVolume(from, to, durationMs, onDone) {
  stopAmbienceFade();
  const start = performance.now();
  const dur = Math.max(60, Number(durationMs) || AMBIENCE_FADE_MS);

  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    ambienceAudio.volume = from + (to - from) * t;
    if (t < 1) {
      ambienceFadeRaf = requestAnimationFrame(tick);
      return;
    }
    ambienceFadeRaf = 0;
    if (onDone) onDone();
  };

  ambienceFadeRaf = requestAnimationFrame(tick);
}

function setAmbienceTrack(track) {
  ensureAmbienceAudioMounted();
  const url = AMBIENCE_URLS[track];
  if (!url) return false;
  const abs = new URL(url, location.href).href;
  if (ambienceAudio.src === abs) return false;
  ambienceAudio.src = abs;
  return true;
}

let pendingAmbienceResume = false;
_lastAmbienceState = _lastAmbienceState || null; // cache for gesture-resume replay
let audioUnlockPromptEl = null;

function ensureAudioUnlockPrompt() {
  if (audioUnlockPromptEl) return audioUnlockPromptEl;
  // Build prompt lazily so we only allocate DOM when blocking actually occurs.
  const wrap = document.createElement("div");
  wrap.id = "audioUnlockPrompt";
  wrap.className = "audioUnlockPrompt";
  wrap.style.display = "none";
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
      <span style="color:var(--text);font-size:13px;line-height:1.3;">Browser blocked audio.</span>
      <button id="btnForceEnableAudio" type="button" class="btn btn--small">Enable Audio</button>
    </div>
  `;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector("#btnForceEnableAudio");
  if (btn) {
    btn.addEventListener("click", async () => {
      // Force-enable path:
      // 1) set local sound preference
      // 2) retry the most recent ambience state
      // 3) clear pending flag only on actual playback success
      soundEnabled = true;
      localStorage.setItem("tv_soundEnabled", "1");
      try { syncSoundToggleUI(); } catch (_) {}

      let ok = false;
      if (_lastAmbienceState && _lastAmbienceState.isPlaying) {
        const track = String(_lastAmbienceState.track ?? "tavern");
        const targetVol = Math.min(1, Math.max(0, Number(_lastAmbienceState.volume ?? 0.6)));
        setAmbienceTrack(track);
        ok = await attemptAmbiencePlay(targetVol);
        if (ok) ambienceAudio.volume = targetVol;
      } else if (ambienceAudio.src) {
        ok = await attemptAmbiencePlay();
      }

      if (ok) {
        pendingAmbienceResume = false;
        hideAudioUnlockPrompt();
        showToast("Audio enabled.", "success", 1400);
      } else {
        showToast("Audio still blocked. Tap Enable Audio again.", "info", 2200);
      }
    });
  }
  audioUnlockPromptEl = wrap;
  return wrap;
}

function showAudioUnlockPrompt() {
  const el = ensureAudioUnlockPrompt();
  if (el) el.style.display = "block";
}

function hideAudioUnlockPrompt() {
  if (audioUnlockPromptEl) audioUnlockPromptEl.style.display = "none";
}

function requestAmbienceResume() {
  if (!soundEnabled || !ambienceAudio.src) return;
  // This flag is consumed by gesture listeners below.
  // Autoplay policy reminder: browsers often require a user gesture before audio can start.
  pendingAmbienceResume = true;
  showToast("Audio blocked by browser � tap anywhere to hear sound.", "info", 3000);
  showAudioUnlockPrompt();
}

async function tryResumeAmbienceFromGesture() {
  if (!pendingAmbienceResume || !soundEnabled || !ambienceAudio.src) return;
  // Called from pointer/click/keydown events: these satisfy autoplay policy.
  const ok = await attemptAmbiencePlay();
  if (ok) {
    pendingAmbienceResume = false;
    hideAudioUnlockPrompt();
    // Re-apply full ambience state so volume fades in properly.
    if (_lastAmbienceState) applyAmbience(_lastAmbienceState);
  }
}

function applyAmbience(amb) {
  // Why this is separated into one function:
  // Any listener (GM or player) can call one shared routine for audio updates.
  // This prevents logic duplication and keeps behavior consistent.
  if (!amb) return;
  _lastAmbienceState = amb; // cache for gesture-resume replay
  const track = String(amb.track ?? "tavern");
  const targetVol = Math.min(1, Math.max(0, Number(amb.volume ?? 0.6)));
  const playing = !!amb.isPlaying;
  const sourceChanged = setAmbienceTrack(track);

  // Keep looping enforced even after source changes.
  ambienceAudio.loop = true;

  if (!soundEnabled) {
    stopAmbienceFade();
    ambienceAudio.pause();
    ambienceAudio.volume = 0;
    return;
  }

  if (playing) {
    // If track changed while already playing, fade out old track and fade in the new one.
    if (sourceChanged && !ambienceAudio.paused) {
      const token = ++ambienceFadeToken;
      const halfFade = Math.round(AMBIENCE_FADE_MS * 0.45);
      const startVol = ambienceAudio.volume;

      animateAmbienceVolume(startVol, 0, halfFade, () => {
        // Tip: token checks prevent stale async callbacks from older fades
        // from mutating the current track state after a rapid user change.
        if (token !== ambienceFadeToken) return;
        ambienceAudio.pause();
        ambienceAudio.currentTime = 0;
        ambienceAudio.volume = 0;
        attemptAmbiencePlay(0).then((ok) => {
          if (token !== ambienceFadeToken) return;
          if (!ok) {
            requestAmbienceResume();
            return;
          }
          animateAmbienceVolume(0, targetVol, AMBIENCE_FADE_MS - halfFade);
        });
      });
      return;
    }

    // Fresh start or resume: fade in smoothly.
    if (ambienceAudio.paused || sourceChanged) {
      const token = ++ambienceFadeToken;
      ambienceAudio.currentTime = 0;
      ambienceAudio.volume = 0;
      attemptAmbiencePlay(0).then((ok) => {
        // Same token guard here for quick play/pause/track toggles.
        if (token !== ambienceFadeToken) return;
        if (!ok) {
          requestAmbienceResume();
          return;
        }
        animateAmbienceVolume(0, targetVol, AMBIENCE_FADE_MS);
      });
      return;
    }

    // Already playing same track: smooth volume adjustment instead of jump.
    animateAmbienceVolume(ambienceAudio.volume, targetVol, AMBIENCE_FADE_MS);
    return;
  }

  // Pause path: fade out before pausing to avoid abrupt cutoff.
  if (ambienceAudio.paused) {
    ambienceAudio.volume = 0;
    return;
  }

  const token = ++ambienceFadeToken;
  const startVol = ambienceAudio.volume;
  animateAmbienceVolume(startVol, 0, AMBIENCE_FADE_MS, () => {
    if (token !== ambienceFadeToken) return;
    ambienceAudio.pause();
    ambienceAudio.volume = 0;
  });
}

window.addEventListener("pointerdown", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
window.addEventListener("touchend", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
window.addEventListener("click", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
window.addEventListener("keydown", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
}, { passive: true });
ambienceAudio.addEventListener("canplaythrough", () => {
  tryResumeAmbienceFromGesture().catch(() => {});
});

// ---- 20) Resume helpers (GM + player) ----
// BEGINNER NOTE � Session persistence:
// When the user refreshes the page or reopens TomeVault, we try to
// resume their previous session automatically. localStorage stores the
// sessionId and role; these functions verify the data is still valid
// in Firestore (session exists, user owns it / is a player in it)
// before re-opening the dashboard or player view.
// If the session was one-shot and has expired, we clean it up instead.
async function tryResumeGM(sessionId) {
  // Resume only if current anonymous uid matches stored gmUid ownership.
  const sessionRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return false;

  const s = snap.data();
  if (isExpiredOneShotSession(s)) {
    await tryDeleteExpiredOneShotSession(sessionId, s);
    localStorage.removeItem("tv_lastDmSessionId");
    return false;
  }
  if (s.gmUid !== state.uid) return false;

  state.role = "dm";
  state.sessionId = sessionId;
  state.joinTag = s.joinTag || sessionId;
  state.joinLink = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag)}`;
  state.gmPinPlain = localStorage.getItem("tv_dmPin") || null;
  state._isOneShotSession = !!s.isOneShot;

  if (gmSessionName) gmSessionName.value = s.name || "";
  await openGMDashboard(s.name || "Session");
  persistLocal();
  return true;
}

async function findLatestOwnedGMSessionId(uid) {
  if (!uid) return "";
  try {
    const gmSnap = await getDocs(query(collection(db, "sessions"), where("gmUid", "==", uid)));
    if (gmSnap.empty) return "";
    const sorted = gmSnap.docs
      .map((d) => ({
        id: d.id,
        updatedAtMs: d.data()?.updatedAt?.toMillis ? d.data().updatedAt.toMillis() : 0,
        createdAtMs: d.data()?.createdAt?.toMillis ? d.data().createdAt.toMillis() : 0,
      }))
      .sort((a, b) => (b.updatedAtMs || b.createdAtMs) - (a.updatedAtMs || a.createdAtMs));
    return sorted[0]?.id || "";
  } catch (e) {
    console.warn("findLatestOwnedGMSessionId failed:", e);
    return "";
  }
}

async function tryResumePlayer(sessionId) {
  // Resume only if this uid already exists in players subcollection.
  const sessionRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return false;

  const s = snap.data();
  if (isExpiredOneShotSession(s)) {
    await tryDeleteExpiredOneShotSession(sessionId, s);
    localStorage.removeItem("tv_sessionId");
    localStorage.removeItem("tv_joinTag");
    if (localStorage.getItem("tv_role") === "player") localStorage.removeItem("tv_role");
    return false;
  }

  const playerRef = doc(db, "sessions", sessionId, "players", state.uid);
  const psnap = await getDoc(playerRef);
  if (!psnap.exists()) return false;

  state.role = "player";
  state.sessionId = sessionId;
  state.joinTag = s.joinTag || sessionId;
  state.joinLink = `${location.origin}${location.pathname}?join=${encodeURIComponent(state.joinTag)}`;
  state._isOneShotSession = !!s.isOneShot;

  await openPlayerView(s.name || "Session");
  persistLocal();
  return true;
}

// ---- 21) Main boot ----
// BEGINNER NOTE � Application entry point:
// `main()` is called once when the page loads. It sets up the entire app
// in a specific order (theme ? network status ? auth ? URL parsing ?
// session resume). The order matters because each step depends on the
// previous one: you can't resume a session without knowing who the user is,
// and you can't know who the user is without initializing auth first.
async function main() {
  initializeTheme();
  showAuthLoading("Restoring your session...");
  try {
    await ensureAuthPersistence();
    // Startup order:
    // 1) auth (wait for first auth state � may or may not have user)
    // 2) URL join param (auto-guest for QR links)
    // 3) local resume logic (gm/player) � only if signed in
    // 4) fallback landing screen
    await processRedirectAuthResult();
    const user = await initAuth();


// ================================================================
// ZONE: APP BOOTSTRAP
// Purpose: start app initialization exactly once.
// ================================================================
    // If returning user is signed in, load profile cache
    if (user) {
      updateTopBarAvatar("");
      try { await ensureOwnProfileLoaded(); } catch (e) { console.warn("Profile load:", e); }
      try { await runOneTimeRoleDisplayNameMigration(user); } catch (e) { console.warn("Role name migration:", e); }
      try { await cleanupOwnedExpiredOneShots(user.uid); } catch (e) { console.warn("One-shot cleanup:", e); }
    }

    const joinFromUrl = parseJoinParam();
    const { r, s, dm } = loadLocal();

    // Via QR/join link: require auth first, then join
    if (joinFromUrl) {
      if (!user) {
        state._pendingJoinFromUrl = joinFromUrl;
        showOnly(SCREEN_KEYS.LANDING);
        showAuthMethodScreen();
        if (authCard) authCard.classList.remove("hidden");
        if (authGuestCta) authGuestCta.classList.add("hidden");
        if (landingHome) landingHome.classList.add("hidden");
        showToast("Sign in to join this session.", "info");
        return;
      }
      state.role = "player";
      showOnly(SCREEN_KEYS.PL_JOIN);
      // Attempt instant auto-join when the link carries a valid PIN.
      try {
        const autoJoined = await tryAutoJoinFromDeepLink(joinFromUrl);
        if (autoJoined) return;
      } catch (e) {
        console.warn("Auto-join from deep link failed:", e);
      }
      // Auto-join didn't succeed — guide user to the missing field
      if (plPin && !String(plPin.value || "").trim()) {
        plPin.focus();
      }
      return;
    }

    // If not signed in at all, show landing (auth card visible)
    if (!user) {
      showOnly(SCREEN_KEYS.LANDING);
      return;
    }

    // Resume GM (also recover if role flag is missing but last GM session exists)
    if (r === "dm" || (!r && dm)) {
      const preferredSessionId = s || dm;
      if (preferredSessionId) {
        const ok = await tryResumeGM(preferredSessionId);
        if (ok) return;
      }
      const fallbackDmId = await findLatestOwnedGMSessionId(state.uid);
      if (fallbackDmId && fallbackDmId !== preferredSessionId) {
        const fallbackOk = await tryResumeGM(fallbackDmId);
        if (fallbackOk) return;
      }
    }

    // Resume player
    if (r === "player" && s) {
      const ok = await tryResumePlayer(s);
      if (ok) return;
      showOnly(SCREEN_KEYS.PL_JOIN);
      return;
    }

    // Signed-in user with no active session → show landing home section
    showOnly(SCREEN_KEYS.LANDING);
    updateLandingAuthState();
  } finally {
    hideAuthLoading();
  }
}

main().catch((e) => {
  // Fail-safe startup handling so user still sees UI instead of blank page.
  console.error("Startup error:", e);
  try { showOnly(SCREEN_KEYS.LANDING); } catch {}
  showToast("Startup error. Open F12 ? Console for details.", "error", 4500);
});

[modalTitle, modalPublic, modalSecret].forEach((el) => {
  el?.addEventListener("input", () => {
    if (!modalDraft || modalCtx.role !== "dm") return;
    syncModalTextIntoDraft();
    refreshModalSaveState();
  });
});

// Service worker registration intentionally disabled.









