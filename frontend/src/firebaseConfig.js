// Firebase client initialization for frontend
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

// Replace with your Firebase project config (provided)
export const firebaseConfig = {
  apiKey: "AIzaSyA0h-Ul8af5aHSHxSIhRKEGIXCszxBjjwE",
  authDomain: "decentralized-wallet-fd847.firebaseapp.com",
  projectId: "decentralized-wallet-fd847",
  storageBucket: "decentralized-wallet-fd847.firebasestorage.app",
  messagingSenderId: "312270699164",
  appId: "1:312270699164:web:f6b5476acba220861acb59",
  measurementId: "G-3Z04KY24TS"
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
// analytics may fail in non-browser or if disabled; guard with try/catch
let analytics = null
try {
  analytics = getAnalytics(firebaseApp)
} catch (e) {
  // ignore analytics init errors in non-browser envs
}
export { analytics }

