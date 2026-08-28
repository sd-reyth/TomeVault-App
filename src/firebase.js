import { initializeApp } from 'firebase/app'
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
