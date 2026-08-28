import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { isLocalDevHost } from './lib/runtimeContext.js'

function requiredEnv(name) {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and add your Firebase web app config.`,
    )
  }
  return value
}

function optionalEnv(name) {
  const value = import.meta.env[name]
  return value ? String(value) : undefined
}

function initAppCheck(app) {
  const siteKey = optionalEnv('VITE_FIREBASE_APP_CHECK_SITE_KEY')
  if (!siteKey) return

  const debugToken = optionalEnv('VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN')
  const onLocalDev = typeof window !== 'undefined' && isLocalDevHost(window.location.hostname)

  if (import.meta.env.DEV && onLocalDev) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

const firebaseConfig = {
  apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requiredEnv('VITE_FIREBASE_APP_ID'),
  measurementId: optionalEnv('VITE_FIREBASE_MEASUREMENT_ID'),
}

const app = initializeApp(firebaseConfig)
initAppCheck(app)

function createAuth(appInstance) {
  try {
    return initializeAuth(appInstance, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch (_) {
    return getAuth(appInstance)
  }
}

export const auth = createAuth(app)
export const db = initializeFirestore(app, {})
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
