import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'

export default function Profile() {
  const { user } = useAuth()
  const { callApi, loading, error, setError } = useApi()
  const [profile, setProfile] = useState({ name: '', cnic: '', beneficiaries: [], encrypted_private_key: '' })
  const [newBeneficiary, setNewBeneficiary] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [syncEncryptedKey, setSyncEncryptedKey] = useState(false)
  const [hasEncryptedWallet, setHasEncryptedWallet] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const data = await callApi('/api/users/' + user.uid)
        setProfile({
          name: data.name || '',
          cnic: data.cnic || '',
          beneficiaries: data.beneficiaries || [],
          encrypted_private_key: data.encrypted_private_key || ''
        })
      } catch (e) {
        // 404 means profile not created yet; ignore
        if (e.status !== 404) {
          console.error(e)
        } else {
          // clear api error state in hook so UI doesn't show an error box for missing profile
          try { setError(null) } catch (err) { /* ignore if setter not provided */ }
        }
      }
    }
    // Check if encrypted wallet exists locally
    const encrypted = localStorage.getItem('wallet_private_key_encrypted')
    setHasEncryptedWallet(!!encrypted)
    load()
  }, [user, callApi])

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-slate-600">Please sign in to manage your profile.</p>
      </div>
    )
  }

  const addBeneficiary = () => {
    if (newBeneficiary.trim() && !profile.beneficiaries.includes(newBeneficiary.trim())) {
      setProfile({
        ...profile,
        beneficiaries: [...profile.beneficiaries, newBeneficiary.trim()]
      })
      setNewBeneficiary('')
    }
  }

  const removeBeneficiary = (idx) => {
    setProfile({
      ...profile,
      beneficiaries: profile.beneficiaries.filter((_, i) => i !== idx)
    })
  }

  const onSave = async () => {
    if (!profile.name.trim()) {
      alert('Name is required')
      return
    }
    setSaving(true)
    setSuccess(false)
    try {
      const payload = {
        name: profile.name,
        cnic: profile.cnic,
        beneficiaries: profile.beneficiaries
      }

      // Optionally sync encrypted private key to backend
      if (syncEncryptedKey && hasEncryptedWallet) {
        const encryptedKey = localStorage.getItem('wallet_private_key_encrypted')
        if (encryptedKey) {
          payload.encrypted_private_key = encryptedKey
        }
      }

      // attempt update; if 404, create
      try {
        await callApi('/api/users/' + user.uid, { method: 'PUT', body: JSON.stringify(payload) })
      } catch (e) {
        if (e.status === 404) {
          await callApi('/api/users', { method: 'POST', body: JSON.stringify(Object.assign({ id: user.uid }, payload)) })
        } else throw e
      }
      setSuccess(true)
      setSyncEncryptedKey(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      console.error(e)
      alert('Failed to save profile: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
          <h2 className="text-2xl font-bold text-white">Your Profile</h2>
          <p className="text-blue-100 mt-1">Manage your personal information and beneficiaries</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
              <span className="ml-2 text-slate-600">Loading profile...</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              <p className="font-semibold">✓ Profile saved successfully</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              {/* CNIC Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">CNIC</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={profile.cnic}
                  onChange={e => setProfile({ ...profile, cnic: e.target.value })}
                  placeholder="e.g., 12345-6789012-3"
                />
              </div>

              {/* Beneficiaries Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Beneficiaries</label>
                <div className="space-y-3">
                  {/* Add Beneficiary Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={newBeneficiary}
                      onChange={e => setNewBeneficiary(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addBeneficiary()}
                      placeholder="Enter beneficiary name"
                    />
                    <button
                      onClick={addBeneficiary}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Beneficiaries List */}
                  {profile.beneficiaries.length > 0 ? (
                    <div className="space-y-2">
                      {profile.beneficiaries.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-200"
                        >
                          <span className="text-slate-700 font-medium">{b}</span>
                          <button
                            onClick={() => removeBeneficiary(idx)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm italic">No beneficiaries added yet</p>
                  )}
                </div>
              </div>

              {/* Wallet Encryption Sync */}
              {hasEncryptedWallet && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="syncKey"
                      checked={syncEncryptedKey}
                      onChange={e => setSyncEncryptedKey(e.target.checked)}
                      className="mt-1 w-4 h-4"
                    />
                    <div className="flex-1">
                      <label htmlFor="syncKey" className="text-sm font-semibold text-slate-700">
                        Backup encrypted private key to cloud
                      </label>
                      <p className="text-xs text-slate-600 mt-1">
                        Your encrypted private key will be saved to your profile. You can restore it on another device with your passphrase.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition font-semibold"
                >
                  {saving ? (
                    <>
                      <Spinner /> Saving...
                    </>
                  ) : (
                    '💾 Save Profile'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">ℹ️ Info:</span> Your profile information is securely stored and used to manage your wallet and beneficiaries.
        </p>
      </div>
    </div>
  )
}
