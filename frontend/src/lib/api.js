import { API_BASE } from '../config'
import { auth } from '../firebaseConfig'

async function getAuthHeader() {
  if (!auth || !auth.currentUser) return {}
  try {
    const token = await auth.currentUser.getIdToken()
    if (token) return { Authorization: 'Bearer ' + token }
  } catch (e) {
    console.warn('Failed to get id token', e)
  }
  return {}
}

export async function apiFetch(path, opts = {}) {
  const url = (API_BASE || '') + path
  const headers = Object.assign({}, opts.headers || {}, await getAuthHeader(), { 'Content-Type': 'application/json' })
  const res = await fetch(url, Object.assign({}, opts, { headers }))
  if (!res.ok) {
    const txt = await res.text().catch(()=>null)
    const err = new Error('API error: ' + res.status + ' ' + res.statusText + (txt?(' - '+txt):''))
    err.status = res.status
    err.body = txt
    throw err
  }
  // try to parse json, fall back to text
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export default apiFetch
