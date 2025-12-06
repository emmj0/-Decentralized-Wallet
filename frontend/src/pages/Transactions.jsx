import React, { useState } from 'react'
import apiFetch from '../lib/api'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function Transactions() {
  const [txid, setTxid] = useState('')
  const [tx, setTx] = useState(null)
  const [err, setErr] = useState('')

  const { callApi, loading, error } = useApi()

  const lookup = async () => {
    setErr('')
    try {
      const j = await callApi('/api/txs/' + txid)
      setTx(j)
    } catch (e) {
      setErr(String(e))
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Transactions</h2>
      <div className="space-y-2">
        <input className="p-2 border w-full" placeholder="Transaction ID" value={txid} onChange={e => setTxid(e.target.value)} />
        <button onClick={lookup} disabled={loading} className="px-4 py-2 text-white rounded" style={{backgroundColor: COLOR_PRIMARY}}>
          {loading ? <span className="flex items-center"><Spinner /><span className="ml-2">Looking...</span></span> : 'Lookup'}
        </button>
        {err && <div className="text-red-600">{err}</div>}
        {tx && (
          <pre className="mt-4 bg-slate-50 p-4 border rounded text-sm">{JSON.stringify(tx, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}
