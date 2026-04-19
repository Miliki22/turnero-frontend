import { useState } from "react"
import { Link } from "react-router-dom"
import { apiForgotPassword } from "../lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (loading) return

    setError("")
    setSent(false)
    setLoading(true)
    try {
      await apiForgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err?.message || "No se pudo enviar el enlace.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-neutral-400">Ingresá tu email y te enviamos un enlace.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <div>
          <label className="text-sm text-neutral-300">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {sent ? <p className="text-sm text-emerald-400">Si el email existe, enviamos el enlace.</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
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
