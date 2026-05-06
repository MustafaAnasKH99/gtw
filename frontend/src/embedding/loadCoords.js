let cache = null
let inflight = null

export function loadCoords() {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = fetch('/words_3d.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load words_3d.json (${res.status})`)
      return res.json()
    })
    .then((data) => {
      cache = data
      return data
    })
    .finally(() => { inflight = null })
  return inflight
}
