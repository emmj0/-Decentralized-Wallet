import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function Admin() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('fund') // fund, mine, validate, zakat, logs
  
  // Fund Wallet State
  const [fundWalletId, setFundWalletId] = useState('')
  const [fundAmount, setFundAmount] = useState('')
  const [fundStatus, setFundStatus] = useState('')
  
  // Mine State
  const [mineStatus, setMineStatus] = useState('')
  
  // Validate State
  const [validateStatus, setValidateStatus] = useState('')
  
  // Zakat State
  const [zakatWalletId, setZakatWalletId] = useState('')
  const [zakatPoolId, setZakatPoolId] = useState('')
  const [zakatStatus, setZakatStatus] = useState('')
  
  // Logs State
  const [logs, setLogs] = useState([])
  const [logsLoaded, setLogsLoaded] = useState(false)
  
  const { callApi, loading } = useApi()

  const fundWallet = async () => {
    if (!fundWalletId.trim() || !fundAmount.trim()) {
      setFundStatus('Please fill in all fields')
      return
    }
    setFundStatus('Funding wallet...')
    try {
      const result = await callApi('/api/admin/fund', {
        method: 'POST',
        body: JSON.stringify({ wallet_id: fundWalletId.trim(), amount: Number(fundAmount) })
      })
      setFundStatus('✓ Wallet funded successfully: ' + JSON.stringify(result))
      setFundWalletId('')
      setFundAmount('')
    } catch (e) {
      setFundStatus('✗ Error: ' + String(e))
    }
  }

  const mine = async () => {
    setMineStatus('Mining pending transactions...')
    try {
      const result = await callApi('/api/admin/mine', { method: 'POST', body: JSON.stringify({}) })
      setMineStatus('✓ Block mined: ' + JSON.stringify(result))
    } catch (e) {
      setMineStatus('✗ Error: ' + String(e))
    }
  }

  const validateChain = async () => {
    setValidateStatus('Validating blockchain...')
    try {
      const result = await callApi('/api/admin/validate_chain', { method: 'POST', body: JSON.stringify({}) })
      if (result.ok) {
        setValidateStatus('✓ Blockchain is valid')
      } else {
        setValidateStatus('✗ Blockchain has issues: ' + result.problems.join(', '))
      }
    } catch (e) {
      setValidateStatus('✗ Error: ' + String(e))
    }
  }

  const computeZakat = async () => {
    if (!zakatWalletId.trim() || !zakatPoolId.trim()) {
      setZakatStatus('Please fill in both wallet IDs')
      return
    }
    setZakatStatus('Computing Zakat (2.5%)...')
    try {
      const result = await callApi('/api/admin/zakat', {
        method: 'POST',
        body: JSON.stringify({ wallet_id: zakatWalletId.trim(), zakat_pool_wallet_id: zakatPoolId.trim() })
      })
      setZakatStatus('✓ Zakat computed: ' + JSON.stringify(result))
      setZakatWalletId('')
      setZakatPoolId('')
    } catch (e) {
      setZakatStatus('✗ Error: ' + String(e))
    }
  }

  const loadLogs = async () => {
    setLogsLoaded(true)
    try {
      const result = await callApi('/api/admin/logs', { method: 'GET' })
      setLogs(Array.isArray(result) ? result : [])
    } catch (e) {
      setLogs([])
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h1 className="text-3xl font-bold text-slate-900">Admin Control Panel</h1>
            <p className="text-slate-600 mt-2">Blockchain & Wallet Management</p>
            <p className="text-sm text-slate-500 mt-1 break-all">Signed in as: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{user?.email}</span></p>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 px-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {[
                { id: 'fund', label: '💰 Fund Wallet', icon: '💰' },
                { id: 'mine', label: '⛏️ Mine Block', icon: '⛏️' },
                { id: 'validate', label: '✓ Validate Chain', icon: '✓' },
                { id: 'zakat', label: '🕌 Zakat', icon: '🕌' },
                { id: 'logs', label: '📋 Logs', icon: '📋' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if (tab.id === 'logs') loadLogs() }}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6">
            {/* FUND WALLET TAB */}
            {activeTab === 'fund' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Fund Wallet</h2>
                <p className="text-slate-600 text-sm">Transfer funds to any wallet. This is a system-level operation only admins can perform.</p>
                
                <div className="grid gap-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Wallet ID</label>
                    <input
                      type="text"
                      value={fundWalletId}
                      onChange={e => setFundWalletId(e.target.value)}
                      placeholder="Enter wallet ID (SHA256 hash)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (minor units)</label>
                    <input
                      type="number"
                      value={fundAmount}
                      onChange={e => setFundAmount(e.target.value)}
                      placeholder="e.g., 50000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={fundWallet}
                    disabled={loading}
                    className="px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {loading && <Spinner />}
                    {loading ? 'Processing...' : 'Fund Wallet'}
                  </button>
                </div>
                
                {fundStatus && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${fundStatus.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {fundStatus}
                  </div>
                )}
              </div>
            )}

            {/* MINE BLOCK TAB */}
            {activeTab === 'mine' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Mine Pending Transactions</h2>
                <p className="text-slate-600 text-sm">Collect all pending transactions and mine them into a new block using Proof of Work.</p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 text-sm">
                    <strong>Process:</strong> Gathers pending transactions → Calculates Merkle root → Solves PoW puzzle → Creates block → Moves transactions to confirmed
                  </p>
                </div>
                
                <button
                  onClick={mine}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {loading && <Spinner />}
                  {loading ? 'Mining...' : '⛏️ Mine Block'}
                </button>
                
                {mineStatus && (
                  <div className={`mt-4 p-3 rounded-lg text-sm font-mono ${mineStatus.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {mineStatus}
                  </div>
                )}
              </div>
            )}

            {/* VALIDATE CHAIN TAB */}
            {activeTab === 'validate' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Validate Blockchain</h2>
                <p className="text-slate-600 text-sm">Verify the integrity of the entire blockchain by checking merkle roots and block linkage.</p>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-900 text-sm">
                    <strong>Checks:</strong> Merkle root recomputation • Previous hash linking • Block hash validity
                  </p>
                </div>
                
                <button
                  onClick={validateChain}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {loading && <Spinner />}
                  {loading ? 'Validating...' : '✓ Validate Chain'}
                </button>
                
                {validateStatus && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${validateStatus.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {validateStatus}
                  </div>
                )}
              </div>
            )}

            {/* ZAKAT TAB */}
            {activeTab === 'zakat' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Zakat Deduction</h2>
                <p className="text-slate-600 text-sm">Compute 2.5% Zakat deduction from a wallet and transfer to Zakat Pool.</p>
                
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-emerald-900 text-sm">
                    <strong>Calculation:</strong> Deduction = Wallet Balance × 2.5% (moved to Zakat Pool)
                  </p>
                </div>
                
                <div className="grid gap-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Wallet ID (to deduct from)</label>
                    <input
                      type="text"
                      value={zakatWalletId}
                      onChange={e => setZakatWalletId(e.target.value)}
                      placeholder="Wallet ID"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Zakat Pool Wallet ID</label>
                    <input
                      type="text"
                      value={zakatPoolId}
                      onChange={e => setZakatPoolId(e.target.value)}
                      placeholder="Zakat Pool Wallet ID"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={computeZakat}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {loading && <Spinner />}
                    {loading ? 'Computing...' : '🕌 Compute Zakat'}
                  </button>
                </div>
                
                {zakatStatus && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${zakatStatus.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {zakatStatus}
                  </div>
                )}
              </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">System Logs</h2>
                <p className="text-slate-600 text-sm">View all system activities: user logins, transactions, admin actions, etc.</p>
                
                {!logsLoaded ? (
                  <button
                    onClick={loadLogs}
                    className="px-4 py-2 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 transition"
                  >
                    Load Logs
                  </button>
                ) : logs.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-600 text-sm">
                    No logs available
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map(log => (
                      <div key={log.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{log.type}</p>
                            <p className="text-slate-700">{log.message}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              User: {log.user_id} | IP: {log.ip}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                        {log.metadata && (
                          <pre className="mt-2 text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto text-slate-700">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
