import React, { useEffect, useState } from 'react'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'
import { useAuth } from '../contexts/AuthContext'

export default function Beneficiaries() {
  const { user } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState([])
  const [newBeneficiaryWalletId, setNewBeneficiaryWalletId] = useState('')
  const { callApi, loading, error } = useApi()
  const [message, setMessage] = useState('')
  const [userProfileExists, setUserProfileExists] = useState(false)

  const loadBeneficiaries = async () => {
    if (!user?.uid) return
    try {
      const data = await callApi(`/api/users/${user.uid}/beneficiaries`)
      setBeneficiaries(data.beneficiaries || [])
      setUserProfileExists(true)
    } catch (err) {
      if (err.status === 404) {
        // User profile doesn't exist yet, create it
        try {
          await callApi('/api/users', {
            method: 'POST',
            body: JSON.stringify({
              id: user.uid,
              name: user.email?.split('@')[0] || 'User',
              cnic: '',
              beneficiaries: []
            })
          })
          setUserProfileExists(true)
          setBeneficiaries([])
        } catch (createErr) {
          console.error('Failed to create user profile:', createErr)
          setMessage('Please create your profile first from the Profile page')
        }
      } else {
        console.error('Failed to load beneficiaries:', err)
      }
    }
  }

  useEffect(() => {
    loadBeneficiaries()
  }, [user])

  const addBeneficiary = async (e) => {
    e.preventDefault()
    if (!newBeneficiaryWalletId.trim()) {
      setMessage('Please enter a wallet ID')
      return
    }
    
    try {
      const data = await callApi(`/api/users/${user.uid}/beneficiaries`, {
        method: 'POST',
        body: JSON.stringify({ beneficiary_wallet_id: newBeneficiaryWalletId.trim() })
      })
      setMessage('Beneficiary added successfully!')
      setNewBeneficiaryWalletId('')
      setBeneficiaries(data.beneficiaries || [])
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Failed to add beneficiary: ' + err.message)
    }
  }

  const removeBeneficiary = async (walletId) => {
    if (!window.confirm('Remove this beneficiary?')) return
    
    try {
      const data = await callApi(`/api/users/${user.uid}/beneficiaries`, {
        method: 'DELETE',
        body: JSON.stringify({ beneficiary_wallet_id: walletId })
      })
      setMessage('Beneficiary removed successfully!')
      setBeneficiaries(data.beneficiaries || [])
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Failed to remove beneficiary: ' + err.message)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMessage('Copied to clipboard!')
    setTimeout(() => setMessage(''), 2000)
  }

  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-slate-600">Please sign in to manage beneficiaries.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">📇 Manage Beneficiaries</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('Failed') || message.includes('Please') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Add Beneficiary Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Add New Beneficiary</h3>
        <form onSubmit={addBeneficiary} className="flex gap-3">
          <input
            type="text"
            value={newBeneficiaryWalletId}
            onChange={(e) => setNewBeneficiaryWalletId(e.target.value)}
            placeholder="Enter beneficiary wallet ID"
            className="flex-1 px-4 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-white rounded font-medium hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: COLOR_PRIMARY }}
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </form>
        <p className="text-sm text-slate-600 mt-2">
          Add wallet IDs of people you frequently send money to for quick access.
        </p>
      </div>

      {/* Beneficiaries List */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Your Beneficiaries ({beneficiaries.length})</h3>
        
        {loading && <div className="flex justify-center p-4"><Spinner /></div>}
        
        {!loading && beneficiaries.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p>No beneficiaries yet.</p>
            <p className="text-sm mt-2">Add wallet IDs above to create your beneficiary list.</p>
          </div>
        )}
        
        {!loading && beneficiaries.length > 0 && (
          <div className="space-y-3">
            {beneficiaries.map((walletId, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition"
              >
                <div className="flex-1 mr-4">
                  <div className="font-mono text-sm break-all text-slate-700">
                    {walletId}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(walletId)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => removeBeneficiary(walletId)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    title="Remove beneficiary"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error?.message || 'An error occurred'}
        </div>
      )}
    </div>
  )
}
