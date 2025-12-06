import React, { useState, useEffect } from 'react'
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebaseConfig'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY, COLOR_ACCENT } from '../config'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, signOut } = useAuth()

  useEffect(() => {
    // check for sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // Retrieve the email from localStorage if available
      let emailForSignIn = window.localStorage.getItem('emailForSignIn')
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Please provide your email for confirmation')
      }
      signInWithEmailLink(auth, emailForSignIn, window.location.href)
        .then(() => {
          window.localStorage.removeItem('emailForSignIn')
          setStatus('Successfully signed in')
        })
        .catch((err) => setStatus('Sign in failed: ' + err.message))
    }
  }, [])

  const sendLink = async () => {
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    }
    try {
      setLoading(true)
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
      window.localStorage.setItem('emailForSignIn', email)
      setStatus('OTP link sent to email')
      setLoading(false)
    } catch (e) {
      setLoading(false)
      setStatus('Failed to send link: ' + e.message)
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    setStatus('Signing in with Google...')
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      await signInWithPopup(auth, provider)
      setStatus('Signed in with Google')
    } catch (e) {
      // Provide actionable guidance for common Firebase errors
      if (e && e.code === 'auth/operation-not-allowed') {
        setStatus('Google sign-in is not enabled for this Firebase project. Enable it in the Firebase Console: https://console.firebase.google.com/project/decentralized-wallet-fd847/authentication/providers')
      } else if (e && e.code === 'auth/unauthorized-domain') {
        setStatus('Sign-in blocked: Unauthorized domain. Add your app domain (e.g. localhost) under Firebase Console → Authentication → Sign-in method → Authorized domains.')
      } else {
        setStatus('Google sign-in failed: ' + (e.message || String(e)))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-lg font-bold">Login / Register (Email OTP)</h2>
      {user && (
        <div className="mb-4">
          <div>Signed in as <strong>{user.email}</strong></div>
          <button onClick={signOut} className="mt-2 px-3 py-1 bg-red-600 text-white rounded">Sign Out</button>
        </div>
      )}
      <div className="mt-4 space-y-2">
        <div className="text-sm text-slate-600">Choose a sign-in method. Email OTP sends a one-time link to your email. Google sign-in uses your Google account.</div>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="p-2 border w-full" />
        <div className="flex gap-2">
          <button onClick={sendLink} className="px-4 py-2 text-white rounded" style={{backgroundColor: COLOR_PRIMARY}} disabled={loading}>{loading && <Spinner />} Send OTP Link</button>
          <button onClick={signInWithGoogle} className="px-4 py-2 rounded border" style={{borderColor: COLOR_ACCENT, color: COLOR_ACCENT}} disabled={loading}>{loading ? <Spinner /> : 'Sign In with Google'}</button>
        </div>
        {loading && <div className="mt-2"><Spinner /></div>}
        <div className="mt-2 text-sm text-slate-600">{status}</div>
        <div className="mt-3 text-xs text-slate-500">Note: Your private key is never uploaded — it stays in your browser. We only store the public key to identify your wallet.</div>
      </div>
    </div>
  )
}
