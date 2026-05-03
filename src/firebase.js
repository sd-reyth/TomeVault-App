import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDWMlq-M1w5-_CFdlkQcggp6GW-EBJZP-o",
  authDomain: "tomevaultapp.firebaseapp.com",
  projectId: "tomevaultapp",
  storageBucket: "tomevaultapp.firebasestorage.app",
  messagingSenderId: "851346918917",
  appId: "1:851346918917:web:bf7cdfc122516a89cf166c",
  measurementId: "G-CV46E2D0RT"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = initializeFirestore(app, {})
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
