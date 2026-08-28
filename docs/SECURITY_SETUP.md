# TomeVault — security setup checklist

Use this after making the GitHub repository public.

## 1. API key restrictions (Google Cloud)

**Goal:** only your domains may use the Firebase Web API key.

### Option A — script (recommended)

```bash
gcloud auth login
gcloud config set project tomevaultapp
chmod +x scripts/secure-firebase.sh
./scripts/secure-firebase.sh
```

### Option B — Google Cloud Console

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=tomevaultapp)
2. Open the **Browser key** used by Firebase (often named “Browser key (auto created by Google Service)”)
3. **Application restrictions** → HTTP referrers
4. Add:
   - `https://tomevaultapp.web.app/*`
   - `https://tomevaultapp.firebaseapp.com/*`
   - `http://localhost/*`
   - `http://127.0.0.1/*`
5. Save

Firebase-provisioned keys are already limited to Firebase APIs; referrer restriction is the important extra step.

## 2. App Check (Firebase Console + `.env`)

**Goal:** block scripted abuse of your Firebase backend.

### Console

1. [Firebase Console → App Check](https://console.firebase.google.com/project/tomevaultapp/appcheck)
2. Register your **Web** app → provider **reCAPTCHA v3**
3. Copy the **site key** (public) into `.env`:

```env
VITE_FIREBASE_APP_CHECK_SITE_KEY=your-recaptcha-v3-site-key
```

4. Local dev: run the app on `localhost`, open DevTools → Console. Firebase prints an App Check debug token.
5. App Check → **Manage debug tokens** → add that token
6. Optional for stable local dev:

```env
VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN=your-debug-token
```

### Enforce (after testing)

In App Check, enable enforcement for:

- Cloud Firestore
- Cloud Storage

Start with **monitoring** for a few days if unsure.

## 3. GitHub repository

- Enable **Secret scanning** (Settings → Code security)
- Never commit `.env`, service-account JSON, or `.private/`

## 4. Firebase rules

Rules in this repo are deployed with:

```bash
firebase deploy --only firestore:rules,storage
```

Re-deploy after any schema or permission change.

## 5. What is already in the codebase

- Firebase config via gitignored `.env`
- Optional App Check init in `src/firebase.js` (active when site key is set)
- `SECURITY.md` — what must stay out of git
