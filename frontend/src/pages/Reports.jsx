import React, { useEffect, useState } from 'react'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function Reports() {
  const [transactions, setTransactions] = useState([])
  const [filteredTxs, setFilteredTxs] = useState([])
  const [walletId, setWalletId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const { callApi, loading } = useApi()
  
  useEffect(() => {
    const wid = localStorage.getItem('wallet_id')
    setWalletId(wid || '')
    if (wid) {
      loadTransactions(wid)
    }
  }, [])
  
  useEffect(() => {
    applyFilters()
  }, [transactions, statusFilter, dateFilter])

  const loadTransactions = async (wid) => {
    try {
      const data = await callApi(`/api/transactions/filter?wallet_id=${wid}`)
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Failed to load transactions:', err)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter)
    }
    
    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7)
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1)
      }
      
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.timestamp)
        return txDate >= filterDate
      })
    }
    
    setFilteredTxs(filtered)
  }

  const calculateStats = () => {
    const sent = filteredTxs.filter(tx => tx.sender === walletId)
    const received = filteredTxs.filter(tx => tx.receiver === walletId)
    const pending = filteredTxs.filter(tx => tx.status === 'pending')
    const confirmed = filteredTxs.filter(tx => tx.status === 'confirmed')
    
    const totalSent = sent.reduce((sum, tx) => sum + (tx.amount || 0), 0)
    const totalReceived = received.reduce((sum, tx) => sum + (tx.amount || 0), 0)
    
    return {
      totalTransactions: filteredTxs.length,
      sent: sent.length,
      received: received.length,
      pending: pending.length,
      confirmed: confirmed.length,
      totalSent,
      totalReceived,
      netFlow: totalReceived - totalSent
    }
  }

  const stats = calculateStats()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">📈 Transaction Reports & Analytics</h2>
      
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm">
        <h3 className="font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Time Period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="flex justify-center p-8"><Spinner /></div>}
      
      {!loading && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-blue-600 font-medium">Total Transactions</div>
              <div className="text-2xl font-bold text-blue-700">{stats.totalTransactions}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-green-600 font-medium">Received</div>
              <div className="text-2xl font-bold text-green-700">{stats.received}</div>
              <div className="text-xs text-green-600">+{stats.totalReceived} coins</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-orange-600 font-medium">Sent</div>
              <div className="text-2xl font-bold text-orange-700">{stats.sent}</div>
              <div className="text-xs text-orange-600">-{stats.totalSent} coins</div>
            </div>
            <div className={`bg-gradient-to-br ${stats.netFlow >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-red-50 to-red-100 border-red-200'} border rounded-lg p-4 shadow-sm`}>
              <div className={`text-sm ${stats.netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'} font-medium`}>Net Flow</div>
              <div className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {stats.netFlow >= 0 ? '+' : ''}{stats.netFlow}
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-yellow-700 font-medium">⏳ Pending</div>
              <div className="text-xl font-bold text-yellow-800">{stats.pending}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-green-700 font-medium">✅ Confirmed</div>
              <div className="text-xl font-bold text-green-800">{stats.confirmed}</div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">
              Transaction Details ({filteredTxs.length})
            </h3>
            
            {filteredTxs.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                No transactions found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Amount</th>
                      <th className="text-left py-2 px-2">From/To</th>
                      <th className="text-left py-2 px-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.map((tx, idx) => {
                      const isSent = tx.sender === walletId
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-2">
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              tx.status === 'confirmed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`font-medium ${isSent ? 'text-orange-600' : 'text-green-600'}`}>
                              {isSent ? '📤 Sent' : '📥 Received'}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-mono font-semibold">
                            {isSent ? '-' : '+'}{tx.amount}
                          </td>
                          <td className="py-3 px-2 font-mono text-xs text-slate-600">
                            {isSent ? tx.receiver.slice(0, 12) : tx.sender.slice(0, 12)}...
                          </td>
                          <td className="py-3 px-2 text-slate-600 text-xs">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

