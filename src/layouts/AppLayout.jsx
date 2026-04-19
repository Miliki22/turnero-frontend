import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { clearToken, getCachedMe, getToken } from "../lib/auth"

const NAV_BY_ROLE = {
  admin: [
    { to: "/dashboard", label: "Panel" },
    { to: "/clients", label: "Clientes" },
    { to: "/services", label: "Servicios" },
    { to: "/appointments", label: "Turnos" },
  ],
  client: [
    { to: "/services", label: "Servicios" },
    { to: "/my-appointments", label: "Mis turnos" },
  ],
}

export default function AppLayout() {
  const nav = useNavigate()

  function handleLogout() {
    clearToken()
    nav("/login", { replace: true })
  }

  const me = getCachedMe()
  const isAuthed = Boolean(getToken())
  const navItems = NAV_BY_ROLE[me?.role] || []

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-semibold">Turnero Kala</div>
            {isAuthed ? (
              <nav className="flex items-center gap-2 text-sm">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-1 ${isActive ? "bg-neutral-100 text-neutral-950" : "text-neutral-300 hover:bg-neutral-800"}`
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
              {me?.email ? <div className="text-sm text-neutral-300">{me.email}</div> : null}
              <button
                onClick={handleLogout}
                className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800"
              >
                Salir
              </button>
            </div>
          ) : (
            <div />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  )
}
