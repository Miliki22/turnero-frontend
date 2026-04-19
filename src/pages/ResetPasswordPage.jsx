import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { apiResetPassword } from "../lib/api"

export default function ResetPasswordPage() {
  const nav = useNavigate()
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (loading) return

    if (!token) {
      setError("Token inválido o faltante.")
      return
    }

    setError("")
    setLoading(true)
    try {
      await apiResetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => nav("/login", { replace: true }), 1000)
    } catch (err) {
      setError(err?.message || "No se pudo resetear la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Nueva contraseña</h1>
      <p className="mt-2 text-sm text-neutral-400">Definí una contraseña nueva para tu cuenta.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <div>
          <label className="text-sm text-neutral-300">Token</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-neutral-300">Password nueva</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">Contraseña actualizada. Redirigiendo...</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>

        <p className="text-sm text-neutral-400">
          <Link className="text-neutral-200 underline" to="/login">
            Volver al login
          </Link>
        </p>
      </form>
    </div>
  )
}
