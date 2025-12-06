import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiFetch from '../lib/api'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function WalletProfile() {
  const [walletId, setWalletId] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState(false)

  const { callApi, loading, error } = useApi()

  useEffect(() => {
    const wid = localStorage.getItem('wallet_id')
    const pubKey = localStorage.getItem('wallet_public_key')
    if (!wid) return
    setWalletId(wid)
    setPublicKey(pubKey || '')
    callApi('/api/wallets/' + wid).then(setData).catch(() => {})
  }, [])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const truncateKey = (key) => {
    if (!key) return ''
    if (key.length <= 20) return key
    return key.slice(0, 10) + '...' + key.slice(-10)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">🔐 My Wallet</h2>
      
      {walletId === '' && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="mb-4 text-6xl">🔑</div>
          <h3 className="text-xl font-semibold mb-3">No Wallet Found</h3>
          <p className="text-slate-600 mb-6">You haven't created a wallet yet. Generate one to get started.</p>
          <Link
            to="/send"
            className="inline-block px-6 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: COLOR_PRIMARY }}
          >
            Generate Wallet
          </Link>
        </div>
      )}

      {walletId && (
        <>
          {/* Wallet ID Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 mb-6 shadow-lg">
            <div className="text-sm opacity-90 mb-2">Wallet ID</div>
            <div className="font-mono text-lg font-bold mb-3 break-all">
              {walletId}
            </div>
            <button
              onClick={() => copyToClipboard(walletId)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded transition text-sm font-medium"
            >
              {copied ? '✓ Copied!' : '📋 Copy Wallet ID'}
            </button>
          </div>

          {/* Balance & Stats */}
          {loading && (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          )}

          {data && !loading && (
            <>
              {/* Balance Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
                  <div className="text-sm opacity-90 mb-2">Current Balance</div>
                  <div className="text-4xl font-bold">{data.balance || 0}</div>
                  <div className="text-xs opacity-75 mt-2">coins</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                  <div className="text-sm opacity-90 mb-2">Unspent UTXOs</div>
                  <div className="text-4xl font-bold">
                    {(data.utxos || []).filter(u => !u.spent).length}
                  </div>
                  <div className="text-xs opacity-75 mt-2">available outputs</div>
                </div>
              </div>

              {/* Public Key */}
              <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
                <h3 className="font-semibold mb-3">Public Key</h3>
                <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-3">
                  <p className="font-mono text-sm break-all text-slate-700">
                    {publicKey || 'Not available'}
                  </p>
                </div>
                {publicKey && (
                  <button
                    onClick={() => copyToClipboard(publicKey)}
                    className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    📋 Copy Public Key
                  </button>
                )}
              </div>

              {/* UTXOs List */}
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Transaction Outputs (UTXOs)</h3>
                {(!data.utxos || data.utxos.length === 0) ? (
                  <div className="text-center text-slate-500 py-8">
                    <p>No UTXOs found.</p>
                    <p className="text-sm mt-2">Your wallet hasn't received any transactions yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-2">UTXO ID</th>
                          <th className="text-left py-2 px-2">Amount</th>
                          <th className="text-left py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.utxos.map((u, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-2 font-mono text-xs">
                              {u.id.slice(0, 16)}...
                            </td>
                            <td className="py-3 px-2 font-semibold">{u.amount}</td>
                            <td className="py-3 px-2">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                u.spent 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {u.spent ? 'Spent' : 'Unspent'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded">
              Error: {error?.message || 'Failed to load wallet data'}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-3">
              <span className="font-semibold">💡 Quick Actions:</span>
            </p>
            <div className="flex gap-3">
              <Link
                to="/send"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
              >
                💸 Send Money
              </Link>
              <Link
                to="/transactions"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium"
              >
                📝 View History
              </Link>
              <Link
                to="/reports"
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm font-medium"
              >
                📈 View Reports
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
