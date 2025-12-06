import React, { useEffect, useState } from 'react'
import apiFetch from '../lib/api'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function WalletProfile() {
  const [walletId, setWalletId] = useState('')
  const [data, setData] = useState(null)

  const { callApi, loading, error } = useApi()

  useEffect(() => {
    const wid = localStorage.getItem('wallet_id')
    if (!wid) return
    setWalletId(wid)
    callApi('/api/wallets/' + wid).then(setData).catch(() => {})
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Wallet Profile</h2>
      {walletId === '' && <div>No wallet registered. Use WalletGen to create one.</div>}
      {loading && <div className="p-4"><Spinner /></div>}
      {data && !loading && (
        <div className="p-4 border rounded">
          <div><strong>Wallet ID:</strong> {data.wallet_id}</div>
          <div><strong>Balance:</strong> {data.balance}</div>
          <div className="mt-2"><strong>UTXOs:</strong>
            <ul className="mt-1 list-disc pl-6">
              {(data.utxos || []).map((u, i) => (
                <li key={i}>{u.id} — {u.amount} — {u.spent ? 'spent' : 'unspent'}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
