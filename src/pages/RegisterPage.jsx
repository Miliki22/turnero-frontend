import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { apiRegister } from "../lib/api"

export default function RegisterPage() {
  const nav = useNavigate()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (loading) return

    setError("")
    setLoading(true)
    try {
      await apiRegister({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      })

      const nextEmail = encodeURIComponent(email.trim())
      nav(`/login?email=${nextEmail}&registered=1`, { replace: true })
    } catch (err) {
      setError(err?.message || "No se pudo registrar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Registro</h1>
      <p className="mt-2 text-sm text-neutral-400">Creá tu cuenta para reservar turnos</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <div>
          <label className="text-sm text-neutral-300">Nombre completo</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-neutral-300">Teléfono</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-neutral-300">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-sm text-neutral-300">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-60"
        >
          {loading ? "Registrando..." : "Registrarme"}
        </button>

        <p className="text-sm text-neutral-400">
          ¿Ya tenés cuenta?{" "}
          <Link className="text-neutral-200 underline" to="/login">
            Ingresá
          </Link>
        </p>
      </form>
    </div>
  )
}
