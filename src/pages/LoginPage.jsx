import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiLogin } from "../lib/api"
import { setToken } from "../lib/auth"

export default function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState("admin@kala.com")
  const [password, setPassword] = useState("TuPasswordSegura123")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await apiLogin(email, password)
      // backend returns access_token (and optionally token_type)
      const token = res?.access_token || res?.token
      if (!token) throw new Error("No se recibió token")
      setToken(token)
      nav("/dashboard", { replace: true })
    } catch (err) {
      setError("Login inválido o API no responde.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Turnero Kala</h1>
      <p className="mt-2 text-sm text-neutral-400">Ingreso admin (MVP)</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
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
      </form>
    </div>
  )
}