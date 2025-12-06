import React, { useState } from 'react'
import { auth } from '../firebaseConfig'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function Admin() {
  const [walletId, setWalletId] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('')
  const { callApi, loading, error } = useApi()

  const fund = async () => {
    setStatus('Funding...')
    try {
      const j = await callApi('/api/admin/fund', { method: 'POST', body: JSON.stringify({ wallet_id: walletId, amount: Number(amount) }) })
      setStatus('OK: ' + JSON.stringify(j))
    } catch (e) {
      setStatus('Error: ' + String(e))
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Admin</h2>
      <div className="p-4 border rounded space-y-2">
        <div>
          <label className="block font-medium">Wallet ID</label>
          <input className="p-2 border w-full" value={walletId} onChange={e => setWalletId(e.target.value)} />
        </div>
        <div>
          <label className="block font-medium">Amount (minor units)</label>
          <input className="p-2 border w-full" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <button onClick={fund} disabled={loading} className="px-4 py-2 text-white rounded" style={{backgroundColor: COLOR_PRIMARY}}>
            {loading ? <span className="flex items-center"><Spinner /> <span className="ml-2">Funding...</span></span> : 'Fund Wallet'}
          </button>
        </div>
        <div className="mt-2 text-sm">{status}</div>
      </div>
    </div>
  )
}
