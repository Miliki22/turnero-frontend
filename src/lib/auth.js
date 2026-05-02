const TOKEN_KEY = "access_token"
const ME_KEY = "me_cache"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ME_KEY)
}

export function getCachedMe() {
  const v = localStorage.getItem(ME_KEY)
  return v ? JSON.parse(v) : null
}

export function setCachedMe(me) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(me))
  } catch (e) {
    // ignore
  }
}

export function getDefaultPathByRole(role) {
  if (role === "admin") return "/dashboard"
  if (role === "client") return "/services"
  return "/services"
}
