import { useEffect, useMemo, useState } from "react"
import { apiCreateService, apiListServices, apiMe } from "../lib/api"
import { getCachedMe, getToken, setCachedMe } from "../lib/auth"

function getList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function ServicesPage() {
  const token = getToken()
  const cachedMe = getCachedMe()
  const [name, setName] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("30")
  const [price, setPrice] = useState("")
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(cachedMe?.role === "admin")

  const canSubmit = useMemo(() => name.trim().length > 0, [name])

  async function loadServices() {
    setError("")
    setLoading(true)
    try {
      const data = await apiListServices(token)
      setServices(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los servicios.")
    } finally {
      setLoading(false)
    }
  }

  async function loadMe() {
    if (!token) return
    try {
      const me = await apiMe(token)
      setCachedMe(me)
      setIsAdmin(me?.role === "admin")
    } catch {
      // RequireAuth handles invalid/expired token flow.
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    if (!canSubmit || !isAdmin) return

    setError("")
    setSubmitting(true)
    try {
      const duration = Number(durationMinutes)
      const amount = price === "" ? null : Number(price)

      await apiCreateService(token, {
        name: name.trim(),
        duration_minutes: Number.isFinite(duration) ? duration : null,
        price: Number.isFinite(amount) ? amount : null,
      })

      setName("")
      setDurationMinutes("30")
      setPrice("")
      await loadServices()
    } catch (err) {
      setError(err?.message || "No se pudo crear el servicio.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadMe()
    loadServices()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Servicios</h1>

      {isAdmin ? (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-lg font-medium">Crear servicio</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
            <input
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="number"
              min="1"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              placeholder="Duración (min)"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              placeholder="Precio"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-60"
            >
              {submitting ? "Creando..." : "Crear"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-lg font-medium">Listado</h2>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        {loading ? <p className="mt-3 text-neutral-400">Cargando...</p> : null}

        {!loading && services.length === 0 ? <p className="mt-3 text-neutral-400">Sin servicios.</p> : null}

        {!loading && services.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Nombre</th>
                  <th className="pb-2">Duración (min)</th>
                  <th className="pb-2">Precio</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service, idx) => (
                  <tr key={service.id ?? idx} className="border-t border-neutral-800">
                    <td className="py-2">{service.id ?? "-"}</td>
                    <td className="py-2">{service.name ?? "-"}</td>
                    <td className="py-2">{service.duration_minutes ?? service.duration ?? "-"}</td>
                    <td className="py-2">{service.price ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
