const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function fetchVizRanks(words, secret, signal) {
  const body = secret ? { words, secret } : { words }
  const res = await fetch(`${BASE}/viz/ranks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    let message = 'Failed to rank words'
    try { const d = await res.json(); message = d.error || message } catch {}
    throw Object.assign(new Error(message), { status: res.status })
  }
  return res.json() // { secret, ranks: { word: rank, ... } }
}
