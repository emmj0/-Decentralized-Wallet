import React, { useState, useEffect } from 'react'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'
import useApi from '../hooks/useApi'
import useEncryption from '../hooks/useEncryption'
import UnlockWallet from '../components/UnlockWallet'
import Spinner from '../components/Spinner'

export default function SendMoney() {
  const [walletId, setWalletId] = useState('')
  const [utxos, setUtxos] = useState([])
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [showUnlock, setShowUnlock] = useState(false)
  const [decryptedKey, setDecryptedKey] = useState('')

  const { callApi, loading, error } = useApi()
  const { decrypt } = useEncryption()

  useEffect(() => {
    const pk = localStorage.getItem('wallet_public_key')
    if (!pk) return
    // compute wallet id same as backend (sha256 of pub)
    async function computeId() {
      const enc = new TextEncoder().encode(pk)
      const hashBuffer = await crypto.subtle.digest('SHA-256', enc)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      setWalletId(hex)
      // fetch utxos
      try {
        const j = await callApi('/api/wallets/' + hex)
        setUtxos(j.utxos || [])
      } catch (e) {
        console.error('Failed to fetch UTXOs:', e)
      }
    }
    computeId()
  }, [callApi])

  const handleUnlock = (key) => {
    setDecryptedKey(key)
    setShowUnlock(false)
  }

  const signAndSend = async () => {
    // Check if we have encrypted key stored
    const hasEncrypted = localStorage.getItem('wallet_private_key_encrypted')
    if (hasEncrypted && !decryptedKey) {
      // Need to unlock first
      setShowUnlock(true)
      return
    }

    setStatus('Signing transaction...')
    try {
      let privB64 = decryptedKey

      // Fallback to plaintext key if no encryption (legacy)
      if (!privB64) {
        privB64 = localStorage.getItem('wallet_private_key')
      }

      if (!privB64) throw new Error('Private key not found. Please generate a wallet first.')

      const privateKey = naclUtil.decodeBase64(privB64)
      const timestamp = new Date().toISOString()
      const amt = parseInt(amount, 10)

      if (isNaN(amt) || amt <= 0) throw new Error('Amount must be a positive number')
      if (!receiver.trim()) throw new Error('Receiver wallet ID is required')

      const payload = [walletId, receiver, String(amt), timestamp, note].join('|')
      const msg = naclUtil.decodeUTF8(payload)
      const sig = nacl.sign.detached(msg, privateKey)
      const sigB64 = naclUtil.encodeBase64(sig)

      // pick inputs: simple greedy selection
      let total = 0
      const inputs = []
      for (const u of utxos) {
        inputs.push(u.id)
        total += u.amount
        if (total >= amt) break
      }
      if (total < amt) throw new Error('Insufficient funds')

      const body = {
        sender: walletId,
        receiver,
        amount: amt,
        note,
        timestamp,
        sender_public_key: localStorage.getItem('wallet_public_key'),
        signature: sigB64,
        inputs,
      }

      const j = await callApi('/api/tx/send', { method: 'POST', body: JSON.stringify(body) })
      setStatus('✓ Transaction submitted: ' + j.tx_id)
      setReceiver('')
      setAmount('')
      setNote('')
      setDecryptedKey('') // Clear decrypted key after use
    } catch (e) {
      setStatus('❌ Error: ' + String(e))
    }
  }

  const balance = utxos.reduce((sum, u) => sum + u.amount, 0)

  return (
    <div className="max-w-2xl mx-auto">
      {showUnlock && (
        <UnlockWallet
          onUnlock={handleUnlock}
          onCancel={() => setShowUnlock(false)}
        />
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-8">
          <h2 className="text-2xl font-bold text-white">💸 Send Money</h2>
          <p className="text-purple-100 mt-1">Send cryptocurrency securely</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {status && (
            <div className={`rounded-lg p-4 ${status.includes('✓') ? 'bg-green-50 border border-green-200 text-green-700' : status.includes('❌') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
              <p>{status}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}

          {!walletId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
              <p className="font-semibold">⚠️ No Wallet Found</p>
              <p className="text-sm mt-1">Please go to the Wallet tab and generate a keypair first.</p>
            </div>
          )}

          {walletId && (
            <div className="space-y-4">
              {/* Wallet Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">From Wallet ID</p>
                    <p className="text-sm font-mono mt-1">{walletId.substring(0, 16)}...</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Balance</p>
                    <p className="text-lg font-bold text-green-600 mt-1">{balance} units</p>
                  </div>
                </div>
              </div>

              {/* Transaction Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Receiver Wallet ID *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    value={receiver}
                    onChange={e => {
                      setReceiver(e.target.value)
                      setStatus('')
                    }}
                    placeholder="Enter receiver's wallet ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (units) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    value={amount}
                    onChange={e => {
                      setAmount(e.target.value)
                      setStatus('')
                    }}
                    placeholder="Enter amount to send"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Note (optional)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note to this transaction"
                  />
                </div>

                {/* Security Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <span className="font-semibold">🔒 Security:</span> Your private key will be decrypted locally only when you click Send. It is never sent to any server.
                  </p>
                </div>

                {/* Send Button */}
                <button
                  onClick={signAndSend}
                  disabled={loading || !receiver || !amount || !walletId}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-400 transition font-semibold"
                >
                  {loading ? (
                    <>
                      <Spinner /> Sending...
                    </>
                  ) : decryptedKey || !localStorage.getItem('wallet_private_key_encrypted') ? (
                    '💳 Send Transaction'
                  ) : (
                    '🔓 Unlock & Send'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* UTXOs List */}
          {utxos.length > 0 && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Available UTXOs ({utxos.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {utxos.map(u => (
                  <div key={u.id} className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono">{u.id.substring(0, 16)}...</span>
                      <span className="font-semibold text-green-600">{u.amount} units</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">⚠️ Important:</span> Once a transaction is sent, it cannot be reversed. Double-check the receiver's wallet ID and amount before confirming.
        </p>
      </div>
    </div>
  )
}
