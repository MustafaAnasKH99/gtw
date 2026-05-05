const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

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
  const data = await res.json()
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status })
  return data // { word, rank, total, won }
}
