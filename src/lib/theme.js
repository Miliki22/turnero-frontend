export const THEME_STORAGE_KEY = "theme"

export const THEME_DARK = "dark"
export const THEME_LIGHT = "light"

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined"
}

export function getSystemTheme() {
  if (!isBrowser() || typeof window.matchMedia !== "function") return THEME_DARK
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? THEME_DARK : THEME_LIGHT
}

export function getStoredTheme() {
  if (!isBrowser()) return null
  const value = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (value === THEME_DARK || value === THEME_LIGHT) return value
  return null
}

export function resolveInitialTheme() {
  return getStoredTheme() ?? getSystemTheme()
}

export function applyTheme(theme) {
  if (!isBrowser()) return
  const resolved = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK
  document.documentElement.classList.toggle(THEME_DARK, resolved === THEME_DARK)
  document.documentElement.dataset.theme = resolved
}

export function persistTheme(theme) {
  if (!isBrowser()) return
  const resolved = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK
  window.localStorage.setItem(THEME_STORAGE_KEY, resolved)
}

export function initTheme() {
  const theme = resolveInitialTheme()
  applyTheme(theme)
  return theme
}
