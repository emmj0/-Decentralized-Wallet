import React, { useState, useEffect } from 'react'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'
import useApi from '../hooks/useApi'
import useEncryption from '../hooks/useEncryption'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function WalletGen() {
  const [pub, setPub] = useState('')
  const [priv, setPriv] = useState('')
  const [walletId, setWalletId] = useState('')
  const [status, setStatus] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [passphraseConfirm, setPassphraseConfirm] = useState('')
  const [passphraseError, setPassphraseError] = useState('')
  const [hasWallet, setHasWallet] = useState(false)
  const [encryptionStatus, setEncryptionStatus] = useState('none') // 'none', 'encrypted', 'decrypted'

  const { callApi, loading, error } = useApi()
  const { encrypt, decrypt } = useEncryption()

  // Check if wallet already exists in localStorage
  useEffect(() => {
    const existingEncrypted = localStorage.getItem('wallet_private_key_encrypted')
    if (existingEncrypted) {
      setHasWallet(true)
      setEncryptionStatus('encrypted')
      setStatus('Wallet found in storage (encrypted)')
    }
  }, [])

  const gen = () => {
    setShowPassphrase(true)
    setPassphrase('')
    setPassphraseConfirm('')
    setPassphraseError('')
  }

  const confirmPassphrase = () => {
    // Validate passphrase
    if (!passphrase || passphrase.length < 8) {
      setPassphraseError('Passphrase must be at least 8 characters')
      return
    }
    if (passphrase !== passphraseConfirm) {
      setPassphraseError('Passphrases do not match')
      return
    }

    // Generate keypair
    const kp = nacl.sign.keyPair()
    const publicB64 = naclUtil.encodeBase64(kp.publicKey)
    const privateB64 = naclUtil.encodeBase64(kp.secretKey)

    setPub(publicB64)
    setPriv(privateB64)

    // Generate wallet ID from SHA-256 hash of public key
    const encoder = new TextEncoder()
    const data = encoder.encode(publicB64)
    crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      setWalletId(hashHex)
      localStorage.setItem('wallet_id', hashHex)

      // Encrypt and store private key
      try {
        const encrypted = encrypt(privateB64, passphrase)
        localStorage.setItem('wallet_private_key_encrypted', encrypted)
        localStorage.setItem('wallet_public_key', publicB64)
        setHasWallet(true)
        setEncryptionStatus('decrypted')
        setStatus('✓ Keypair generated. Private key encrypted with passphrase.')
        setShowPassphrase(false)
      } catch (e) {
        setPassphraseError('Encryption failed: ' + e.message)
      }
    }).catch(e => {
      setPassphraseError('Failed to generate wallet ID: ' + e.message)
    })
  }

  const register = async () => {
    if (!pub) {
      setStatus('Please generate a keypair first')
      return
    }
    if (!walletId) {
      setStatus('Wallet ID not generated yet, please wait...')
      return
    }
    setStatus('Registering wallet...')
    try {
      const j = await callApi('/api/wallets/register', { method: 'POST', body: JSON.stringify({ public_key: pub, wallet_id: walletId }) })
      // Verify the wallet ID matches what backend returns
      if (j.wallet_id !== walletId) {
        console.warn('Wallet ID mismatch:', walletId, 'vs', j.wallet_id)
      }
      setStatus('✓ Wallet registered successfully with ID: ' + j.wallet_id.slice(0, 12) + '...')
    } catch (e) {
      setStatus('Failed: ' + String(e))
    }
  }

  const downloadKeyBackup = () => {
    // Create a backup file with public key and encrypted private key
    const backup = {
      public_key: pub,
      encrypted_private_key: localStorage.getItem('wallet_private_key_encrypted'),
      wallet_id: walletId || localStorage.getItem('wallet_id'),
      created_at: new Date().toISOString(),
      note: 'Keep this file safe. You will need the passphrase to decrypt the private key.'
    }
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2)))
    element.setAttribute('download', `wallet-backup-${Date.now()}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8">
          <h2 className="text-2xl font-bold text-white">🔐 Wallet Management</h2>
          <p className="text-green-100 mt-1">Generate and secure your keypair with encryption</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {status && (
            <div className={`rounded-lg p-4 ${status.includes('✓') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
              <p>{status}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}

          {!showPassphrase && !pub && (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">Generate a new keypair to get started</p>
              <button
                onClick={gen}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                🔑 Generate New Keypair
              </button>
            </div>
          )}

          {/* Passphrase Setup */}
          {showPassphrase && !pub && (
            <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-800">Set Encryption Passphrase</h3>
              <p className="text-sm text-slate-600">Your private key will be encrypted with this passphrase. Keep it safe and remember it!</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Passphrase *</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  value={passphrase}
                  onChange={e => {
                    setPassphrase(e.target.value)
                    setPassphraseError('')
                  }}
                  placeholder="Enter a strong passphrase (min 8 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Passphrase *</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  value={passphraseConfirm}
                  onChange={e => {
                    setPassphraseConfirm(e.target.value)
                    setPassphraseError('')
                  }}
                  placeholder="Confirm your passphrase"
                />
              </div>

              {passphraseError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
                  {passphraseError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={confirmPassphrase}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  ✓ Confirm & Generate
                </button>
                <button
                  onClick={() => setShowPassphrase(false)}
                  className="flex-1 px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Keypair Display */}
          {pub && (
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <p className="text-sm text-green-700">
                  <span className="font-semibold">🔒 Encryption Status:</span> Private key is encrypted and stored locally
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Public Key (base64)</label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                  rows={4}
                  value={pub}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Private Key (currently decrypted in memory)</label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-red-50 font-mono text-sm text-red-800"
                  rows={4}
                  value={priv}
                  readOnly
                />
                <p className="text-xs text-red-600 mt-2">⚠️ Keep this private key secret. Do not share with anyone.</p>
              </div>

              {walletId && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Wallet ID (SHA-256 of Public Key)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                      value={walletId}
                      readOnly
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(walletId)
                        setStatus('✓ Wallet ID copied to clipboard')
                      }}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Share this ID to receive payments</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={register}
                  disabled={loading || !walletId}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition font-semibold"
                >
                  {loading ? (
                    <>
                      <Spinner /> Registering...
                    </>
                  ) : (
                    '📝 Register Wallet with Backend'
                  )}
                </button>
                <button
                  onClick={downloadKeyBackup}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold"
                >
                  💾 Download Backup
                </button>
                <button
                  onClick={() => {
                    setPub('')
                    setPriv('')
                    setShowPassphrase(false)
                    setStatus('')
                  }}
                  className="flex-1 px-4 py-3 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition font-semibold"
                >
                  🔄 New Wallet
                </button>
              </div>
            </div>
          )}

          {/* Existing Wallet Info */}
          {!pub && hasWallet && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">💾 Wallet saved:</span> You have an encrypted wallet in storage.
              </p>
              <p className="text-xs text-slate-600">
                To use your saved wallet, navigate to the Send page and unlock it with your passphrase.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">ℹ️ Security:</span> Your private key is encrypted with AES-256 using your passphrase. Only you can decrypt it with the correct passphrase.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">⚠️ Backup:</span> Download a backup of your wallet. Keep it in a safe place. If you lose this backup and forget your passphrase, your wallet cannot be recovered.
          </p>
        </div>
      </div>
    </div>
  )
}
