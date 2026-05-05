const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function newGame() {
  const res = await fetch(`${BASE}/new-game`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to start game')
  return res.json() // { sessionId, message }
}

export async function submitGuess(sessionId, word) {
  const res = await fetch(`${BASE}/guess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ word }),
  })
  if (!res.ok) {
    let message = 'Request failed'
    try { const d = await res.json(); message = d.error || message } catch {}
    throw Object.assign(new Error(message), { status: res.status })
  }
  return res.json() // { word, rank, total, won }
}
