import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { apiLogin, apiMe } from "../lib/api"
import { getDefaultPathByRole, setCachedMe, setToken } from "../lib/auth"

export default function LoginPage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState("admin@kala.com")
  const [password, setPassword] = useState("TuPasswordSegura123")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const emailFromQuery = searchParams.get("email")
    const registered = searchParams.get("registered")

    if (emailFromQuery) setEmail(emailFromQuery)
    if (registered === "1") setNotice("Cuenta creada. Ingresá con tus credenciales.")
  }, [searchParams])

  async function onSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await apiLogin(email, password)
      const token = res?.access_token || res?.token
      if (!token) throw new Error("No se recibió token")

      setToken(token)
      const me = await apiMe(token)
      setCachedMe(me)
      nav(getDefaultPathByRole(me?.role), { replace: true })
    } catch (err) {
      setError(err?.message || "Credenciales inválidas.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Turnero Kala</h1>
      <p className="mt-2 text-sm text-neutral-400">Ingresá para administrar o reservar turnos</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

        <div>
          <label className="text-sm text-neutral-300">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="text-sm text-neutral-300">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <Link className="text-neutral-300 underline" to="/register">
            Registrate
          </Link>
          <Link className="text-neutral-300 underline" to="/forgot-password">
            Olvidé mi contraseña
          </Link>
        </div>
      </form>
    </div>
  )
}
