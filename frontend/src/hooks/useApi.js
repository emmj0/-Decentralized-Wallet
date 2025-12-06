import { useState, useCallback } from 'react'
import apiFetch from '../lib/api'

export default function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callApi = useCallback(async (path, opts = {}) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(path, opts)
      setLoading(false)
      return res
    } catch (e) {
      setError(e)
      setLoading(false)
      throw e
    }
  }, [])

  return { callApi, loading, error, setError }
}
