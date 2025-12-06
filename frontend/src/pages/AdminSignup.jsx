import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'

export default function AdminSignup() {
  const { user } = useAuth()
  const { callApi, loading, error } = useApi()
  const [token, setToken] = useState('')
  const [success, setSuccess] = useState(false)

  const onSubmit = async () => {
    if (!user) return alert('Please sign in first')
    if (!token.trim()) return alert('Please enter the bootstrap token')
    try {
      await callApi('/api/admin/make_admin', { method: 'POST', body: JSON.stringify({ uid: user.uid, token: token.trim() }) })
      setSuccess(true)
    } catch (e) {
      console.error(e)
      setSuccess(false)
      alert('Failed to make admin: ' + (e.message || e))
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-2">Admin Signup (Bootstrap)</h2>
        <p className="text-sm text-slate-600 mb-4">This page lets a signed-in user become an admin using the server's one-time bootstrap token.</p>

        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Signed-in UID</label>
          <input readOnly value={user?.uid || ''} className="w-full px-3 py-2 border rounded bg-slate-50" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Bootstrap Token</label>
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="Enter initial admin token" className="w-full px-3 py-2 border rounded" />
        </div>

        {error && (
          <div className="mb-3 text-red-700">Error: {error.message}</div>
        )}

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700">✓ Admin claim set. Please sign out and sign in again to refresh your token.</div>
        ) : (
          <div className="flex gap-3">
            <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
              {loading ? <><Spinner /> Bootstrapping...</> : 'Make Me Admin'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
