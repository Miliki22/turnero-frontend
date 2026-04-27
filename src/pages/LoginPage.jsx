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
    <div className="login-page mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Turnero Kala</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Ingresá para administrar o reservar turnos</p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40 dark:shadow-none"
      >
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

        <div>
          <label className="text-sm text-neutral-700 dark:text-neutral-300">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-700 dark:focus:ring-0"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="text-sm text-neutral-700 dark:text-neutral-300">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-700 dark:focus:ring-0"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <Link className="text-emerald-800 underline hover:text-emerald-900 dark:text-neutral-300 dark:hover:text-neutral-100" to="/register">
            Registrate
          </Link>
          <Link
            className="text-emerald-800 underline hover:text-emerald-900 dark:text-neutral-300 dark:hover:text-neutral-100"
            to="/forgot-password"
          >
            Olvidé mi contraseña
          </Link>
        </div>
      </form>
    </div>
  )
}
