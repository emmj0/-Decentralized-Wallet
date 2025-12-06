import React, { useEffect, useState } from 'react'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function Dashboard() {
  const [walletId, setWalletId] = useState('')
  const [balance, setBalance] = useState(0)
  const { callApi, loading, error } = useApi()

  useEffect(() => {
    const pk = localStorage.getItem('wallet_public_key')
    if (!pk) return
    const wid = localStorage.getItem('wallet_id')
    setWalletId(wid || '')
    if (wid) {
      callApi('/api/wallets/' + wid).then(j => {
        setBalance(j.balance ?? 0)
      }).catch(() => {})
    }
  }, [])

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Wallet</h3>
          {loading ? <div className="p-2"><Spinner /></div> : (
            <>
              <div><strong>ID:</strong> {walletId || 'Not registered'}</div>
              <div><strong>Balance:</strong> {balance}</div>
            </>
          )}
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Quick Actions</h3>
          <div className="mt-2">
            <a className="text-sm px-3 py-1 rounded text-white" style={{backgroundColor: COLOR_PRIMARY}} href="#send">Send Money</a>
          </div>
        </div>
      </div>
    </div>
  )
}
