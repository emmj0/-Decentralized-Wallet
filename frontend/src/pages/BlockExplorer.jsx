import React, { useEffect, useState } from 'react'
import apiFetch from '../lib/api'
import useApi from '../hooks/useApi'
import Spinner from '../components/Spinner'
import { COLOR_PRIMARY } from '../config'

export default function BlockExplorer() {
  const [blocks, setBlocks] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  const { callApi, loading, error: apiError } = useApi()

  useEffect(() => {
    callApi('/api/blocks?limit=50').then(setBlocks).catch(e=>setError(String(e)))
  }, [])

  const viewBlock = async (idx) => {
    try {
      const j = await callApi('/api/blocks/' + idx)
      setSelected(j)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Block Explorer</h2>
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          {loading ? (
            <div className="flex items-center justify-center p-4"><Spinner /></div>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b, i) => (
                <li key={i} className="p-2 border rounded hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>Index: {b.index ?? b["index"]}</div>
                    <button className="text-sm" style={{color: COLOR_PRIMARY}} onClick={() => viewBlock(b.index ?? b["index"])}>View</button>
                  </div>
                  <div className="text-xs text-slate-500">Hash: {b.hash}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="col-span-2">
          {selected ? (
            <div className="p-4 border rounded">
              <h3 className="font-semibold">Block {selected.index}</h3>
              <div><strong>Hash:</strong> {selected.hash}</div>
              <div><strong>Previous:</strong> {selected.previous_hash}</div>
              <div><strong>Merkle Root:</strong> {selected.merkle_root}</div>
              <div className="mt-2"><strong>Transactions:</strong>
                <ul className="mt-1 list-disc pl-6">
                  {(selected.transactions || []).map((t, i) => (
                    <li key={i}>{String(t)}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-4 text-slate-600">Select a block to view details.</div>
          )}
        </div>
      </div>
    </div>
  )
}
