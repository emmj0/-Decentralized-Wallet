import React, { useState } from 'react'
import useEncryption from '../hooks/useEncryption'
import Spinner from '../components/Spinner'

/**
 * UnlockWallet component
 * Prompts user for passphrase to decrypt their private key from localStorage
 * Returns the decrypted key to the onUnlock callback
 */
export default function UnlockWallet({ onUnlock, onCancel }) {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const { decrypt } = useEncryption()

  const handleUnlock = async () => {
    setError('')
    if (!passphrase) {
      setError('Passphrase is required')
      return
    }

    setUnlocking(true)
    try {
      const encrypted = localStorage.getItem('wallet_private_key_encrypted')
      if (!encrypted) {
        setError('No encrypted wallet found. Please generate a wallet first.')
        setUnlocking(false)
        return
      }

      const decrypted = decrypt(encrypted, passphrase)
      // Call the callback with the decrypted key
      onUnlock(decrypted)
      setPassphrase('')
    } catch (e) {
      setError('Failed to unlock wallet: ' + e.message)
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
          <h2 className="text-xl font-bold text-white">🔓 Unlock Wallet</h2>
          <p className="text-blue-100 text-sm mt-1">Enter your passphrase to access your private key</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              <p className="font-semibold">Error</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Passphrase</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              value={passphrase}
              onChange={e => {
                setPassphrase(e.target.value)
                setError('')
              }}
              onKeyPress={e => e.key === 'Enter' && !unlocking && handleUnlock()}
              placeholder="Enter your passphrase"
              disabled={unlocking}
              autoFocus
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-900">
              <span className="font-semibold">💡 Tip:</span> Your passphrase is never sent to any server. It stays on your device.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleUnlock}
              disabled={unlocking || !passphrase}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition font-medium"
            >
              {unlocking ? (
                <>
                  <Spinner /> Unlocking...
                </>
              ) : (
                '✓ Unlock'
              )}
            </button>
            <button
              onClick={() => {
                setPassphrase('')
                setError('')
                onCancel()
              }}
              disabled={unlocking}
              className="flex-1 px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 disabled:bg-slate-300 transition font-medium"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
