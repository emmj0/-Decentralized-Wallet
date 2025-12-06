import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'

const AuthContext = createContext({ user: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const getIdToken = useCallback(async (forceRefresh = false) => {
    if (!auth || !auth.currentUser) return null
    try {
      return await auth.currentUser.getIdToken(forceRefresh)
    } catch (e) {
      console.error('getIdToken error', e)
      return null
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth)
    } catch (e) {
      console.error('signOut error', e)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, getIdToken, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext
