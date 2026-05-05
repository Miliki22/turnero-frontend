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
            <div className="flex items-center gap-3">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={`${brand.appName} logo`}
                  className="h-8 w-auto object-contain"
                />
              ) : null}
              <div className="text-lg font-semibold">{brand.appName}</div>
            </div>
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
        <footer className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-sm kala-muted">
            {/* WhatsApp */}
            <a
              href="https://wa.me/5493489514293"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:underline"
              aria-label="WhatsApp"
              title="WhatsApp"
            >
              <img
                src="/src/assets/icons/whatsapp.png"
                alt="WhatsApp"
                width={18}
                height={18}
                style={{ display: "block" }}
              />
              <span>+54 9 3489514287</span>
            </a>

              {/* Email */}
              <a
                href="mailto:kala.experiencia@gmail.com"
                className="inline-flex items-center gap-2 hover:underline"
                aria-label="Email"
                title="Email"
              >
                <span aria-hidden="true">✉️</span>
                <span>kala.experiencia@gmail.com</span>
              </a>

              {/* Dirección (Google Maps) */}
              <a
                href="https://www.google.com/maps/search/?api=1&query=Capilla%20del%20Se%C3%B1or%20420%20Campana%20Buenos%20Aires"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
                aria-label="Ubicación"
                title="Ubicación"
              >
                <span aria-hidden="true">📍</span>
                <span>Capilla del Señor 420 - Campana - Bs As</span>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/experienciakala"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
                aria-label="Instagram"
                title="Instagram"
              >
                <img
                  src="/src/assets/icons/instagram.png"
                  alt="Instagram"
                  width={18}
                  height={18}
                  style={{ display: "block" }}
                />
                <span>@experienciakala</span>
              </a>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
