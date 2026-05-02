import { useEffect, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { clearToken, getCachedMe, getToken } from "../lib/auth"
import { THEME_DARK, THEME_LIGHT, applyTheme, persistTheme, resolveInitialTheme } from "../lib/theme"
import { getBrand } from "../branding"

const NAV_BY_ROLE = {
  admin: [
    { to: "/dashboard", label: "Panel" },
    { to: "/clients", label: "Clientes" },
    { to: "/services", label: "Servicios" },
    { to: "/appointments", label: "Turnos" },
    { to: "/calendar", label: "Calendario" },
    { to: "/settings/integrations", label: "Integraciones" },
  ],
  client: [
    { to: "/services", label: "Servicios" },
    { to: "/calendar", label: "Calendario" },
    { to: "/my-appointments", label: "Mis turnos" },
  ],
}

export default function AppLayout() {
  const nav = useNavigate()
  const [theme, setTheme] = useState(() => resolveInitialTheme())
  const brand = getBrand()

  function handleLogout() {
    clearToken()
    nav("/login", { replace: true })
  }

  useEffect(() => {
    applyTheme(theme)
    persistTheme(theme)
  }, [theme])

  const me = getCachedMe()
  const isAuthed = Boolean(getToken())
  const isClient = me?.role === "client"
  const navItems = NAV_BY_ROLE[me?.role] || []
  const isDark = theme === THEME_DARK
  const toggleThemeLabel = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-semibold">{brand.appName}</div>
            {isAuthed ? (
              <nav className="flex items-center gap-2 text-sm">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-1 transition ${
                        isActive
                          ? "kala-btn-primary"
                          : "kala-btn text-sm"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            ) : null}
          </div>

          {isAuthed ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === THEME_DARK ? THEME_LIGHT : THEME_DARK))}
                className="kala-icon-btn"
                aria-label={toggleThemeLabel}
                title={toggleThemeLabel}
              >
                <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
              </button>
              {me?.email ? <div className="text-sm kala-muted">{me.email}</div> : null}
              <button
                onClick={handleLogout}
                className="kala-btn rounded-md px-3 py-1 text-sm"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === THEME_DARK ? THEME_LIGHT : THEME_DARK))}
              className="kala-icon-btn"
              aria-label={toggleThemeLabel}
              title={toggleThemeLabel}
            >
              <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-6">
        <Outlet />
      </main>

      {isAuthed && isClient ? (
        <footer className="border-t" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-sm kala-muted">
            <p>📞 +54 9 3489514293</p>
            <p>✉️ kala.experiencia@gmail.com</p>
            <p>📍 Capilla del Señor 420 - Campana - Bs As</p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
