import React, { useEffect, useState } from 'react'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [walletId, setWalletId] = useState('')
  const [balance, setBalance] = useState(0)
  const [recentTxs, setRecentTxs] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 })
  const { callApi, loading, error } = useApi()

  useEffect(() => {
    const pk = localStorage.getItem('wallet_public_key')
    if (!pk) return
    const wid = localStorage.getItem('wallet_id')
    setWalletId(wid || '')
    if (wid) {
      loadDashboardData(wid)
    }
  }, [])

  const loadDashboardData = async (wid) => {
    try {
      // Load balance
      const walletData = await callApi('/api/wallets/' + wid)
      setBalance(walletData.balance ?? 0)
      
      // Load recent transactions
      const txData = await callApi(`/api/transactions/filter?wallet_id=${wid}`)
      const txs = txData.transactions || []
      setRecentTxs(txs.slice(0, 5)) // Show last 5 transactions
      
      // Calculate stats
      const pending = txs.filter(tx => tx.status === 'pending').length
      const confirmed = txs.filter(tx => tx.status === 'confirmed').length
      setStats({ total: txs.length, pending, confirmed })
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    }
  }

  const truncateWallet = (wallet) => {
    if (!wallet) return ''
    return wallet.slice(0, 10) + '...' + wallet.slice(-8)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">📊 Dashboard</h2>
      
      {loading && <div className="flex justify-center p-8"><Spinner /></div>}
      
      {!loading && (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
              <div className="text-sm opacity-90 mb-1">Current Balance</div>
              <div className="text-4xl font-bold mb-3">{balance}</div>
              <div className="text-xs opacity-75 font-mono">{truncateWallet(walletId)}</div>
            </div>

            {/* Total Transactions */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
              <div className="text-sm opacity-90 mb-1">Total Transactions</div>
              <div className="text-4xl font-bold mb-3">{stats.total}</div>
              <div className="text-xs opacity-75">All time activity</div>
            </div>

            {/* Pending Transactions */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
              <div className="text-sm opacity-90 mb-1">Pending</div>
              <div className="text-4xl font-bold mb-3">{stats.pending}</div>
              <div className="text-xs opacity-75">{stats.confirmed} confirmed</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 mb-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Link
                to="/send"
                className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition text-center"
              >
                <span className="text-2xl mb-2">💸</span>
                <span className="text-sm font-medium text-blue-700">Send Money</span>
              </Link>
              
              <Link
                to="/transactions"
                className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition text-center"
              >
                <span className="text-2xl mb-2">📝</span>
                <span className="text-sm font-medium text-green-700">View History</span>
              </Link>
              
              <Link
                to="/beneficiaries"
                className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition text-center"
              >
                <span className="text-2xl mb-2">📇</span>
                <span className="text-sm font-medium text-purple-700">Beneficiaries</span>
              </Link>
              
              <Link
                to="/reports"
                className="flex flex-col items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition text-center"
              >
                <span className="text-2xl mb-2">📈</span>
                <span className="text-sm font-medium text-orange-700">Reports</span>
              </Link>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">🕐 Recent Activity</h3>
              <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>
            
            {recentTxs.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>No transactions yet.</p>
                <Link to="/send" className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
                  Send your first transaction →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTxs.map((tx, idx) => {
                  const isSent = tx.sender === walletId
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`text-2xl ${isSent ? 'text-orange-500' : 'text-green-500'}`}>
                          {isSent ? '📤' : '📥'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {isSent ? 'Sent to' : 'Received from'}
                          </div>
                          <div className="font-mono text-xs text-slate-600">
                            {isSent ? truncateWallet(tx.receiver) : truncateWallet(tx.sender)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${isSent ? 'text-orange-600' : 'text-green-600'}`}>
                          {isSent ? '-' : '+'}{tx.amount}
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded ${
                          tx.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tx.status}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
    </div>
  )
}

