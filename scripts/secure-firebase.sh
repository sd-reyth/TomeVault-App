#!/usr/bin/env bash
# Apply recommended Google Cloud API key restrictions for the TomeVault web app.
# Requires: gcloud CLI authenticated with access to project tomevaultapp.
#
# Usage:
#   gcloud auth login
#   gcloud config set project tomevaultapp
#   ./scripts/secure-firebase.sh
#
# Optional:
#   FIREBASE_API_KEY_ID=projects/tomevaultapp/locations/global/keys/XXXX ./scripts/secure-firebase.sh

set -euo pipefail

PROJECT_ID="${FIREBASE_PROJECT_ID:-tomevaultapp}"
API_KEY_ID="${FIREBASE_API_KEY_ID:-}"

ALLOWED_REFERRERS=(
  "https://${PROJECT_ID}.web.app/*"
  "https://${PROJECT_ID}.firebaseapp.com/*"
  "http://localhost/*"
  "http://127.0.0.1/*"
)

join_by_comma() {
  local IFS=,
  echo "$*"
}

require_gcloud() {
  if ! command -v gcloud >/dev/null 2>&1; then
    echo "gcloud CLI not found. Install Google Cloud SDK first." >&2
    exit 1
  fi

  if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
    echo "No active gcloud account. Run: gcloud auth login" >&2
    exit 1
  fi
}

resolve_api_key_id() {
  if [[ -n "${API_KEY_ID}" ]]; then
    echo "${API_KEY_ID}"
    return
  fi

  echo "Looking up Browser API key for project ${PROJECT_ID}..." >&2
  mapfile -t keys < <(gcloud services api-keys list \
    --project="${PROJECT_ID}" \
    --format='value(name)' 2>/dev/null || true)

  if [[ "${#keys[@]}" -eq 0 ]]; then
    echo "Could not list API keys. Set FIREBASE_API_KEY_ID manually." >&2
    echo "Find it in Google Cloud Console → APIs & Services → Credentials." >&2
    exit 1
  fi

  if [[ "${#keys[@]}" -gt 1 ]]; then
    echo "Multiple API keys found. Using the first one:" >&2
    printf '  %s\n' "${keys[@]}" >&2
    echo "Set FIREBASE_API_KEY_ID if this is not the Firebase Web API key." >&2
  fi

  echo "${keys[0]}"
}

apply_referrer_restrictions() {
  local key_id="$1"
  local referrers
  referrers="$(join_by_comma "${ALLOWED_REFERRERS[@]}")"

  echo "Applying HTTP referrer restrictions to ${key_id}" >&2
  gcloud services api-keys update "${key_id}" \
    --project="${PROJECT_ID}" \
    --allowed-referrers="${referrers}"

  echo "Done. Allowed referrers:" >&2
  printf '  %s\n' "${ALLOWED_REFERRERS[@]}" >&2
}

print_app_check_steps() {
  cat <<EOF

Next manual steps (Firebase Console):
1. Build → App Check → register the Web app with reCAPTCHA v3.
2. Copy the site key into .env as VITE_FIREBASE_APP_CHECK_SITE_KEY.
3. For local dev, open the browser console on localhost and copy the App Check debug token.
4. Register that debug token in App Check → Manage debug tokens.
5. After a few days of monitoring, enforce App Check for Firestore + Storage.

See docs/SECURITY_SETUP.md for the full checklist.
EOF
}

main() {
  require_gcloud
  gcloud config set project "${PROJECT_ID}" >/dev/null
  key_id="$(resolve_api_key_id)"
  apply_referrer_restrictions "${key_id}"
  print_app_check_steps
}

main "$@"
