const KEY = 'gtw_session'

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage quota exceeded or private browsing — fail silently
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
