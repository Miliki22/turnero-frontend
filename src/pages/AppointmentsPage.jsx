import { useEffect, useMemo, useState } from "react"
import { apiCreateAppointment, apiListAppointments } from "../lib/api"
import { getToken } from "../lib/auth"

function getList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  return []
}

function toIso(datetimeLocalValue) {
  if (!datetimeLocalValue) return null
  const date = new Date(datetimeLocalValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export default function AppointmentsPage() {
  const token = getToken()
  const [clientId, setClientId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const canSubmit = useMemo(() => {
    return clientId.trim() !== "" && serviceId.trim() !== "" && startsAt.trim() !== ""
  }, [clientId, serviceId, startsAt])

  async function loadAppointments() {
    setError("")
    setLoading(true)
    try {
      const data = await apiListAppointments(token)
      setAppointments(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los turnos.")
    } finally {
      setLoading(false)
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    if (!canSubmit) return

    setError("")
    setSubmitting(true)
    try {
      const payload = {
        client_id: Number(clientId),
        service_id: Number(serviceId),
        starts_at: toIso(startsAt),
      }

      await apiCreateAppointment(token, payload)
      setClientId("")
      setServiceId("")
      setStartsAt("")
      await loadAppointments()
    } catch (err) {
      setError(err?.message || "No se pudo crear el turno.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Turnos</h1>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-lg font-medium">Crear turno</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
          <input
            type="number"
            min="1"
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            placeholder="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <input
            type="number"
            min="1"
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            placeholder="Service ID"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          />
          <input
            type="datetime-local"
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
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

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-lg font-medium">Listado</h2>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        {loading ? <p className="mt-3 text-neutral-400">Cargando...</p> : null}

        {!loading && appointments.length === 0 ? <p className="mt-3 text-neutral-400">Sin turnos.</p> : null}

        {!loading && appointments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Client ID</th>
                  <th className="pb-2">Service ID</th>
                  <th className="pb-2">Inicio</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment, idx) => (
                  <tr key={appointment.id ?? idx} className="border-t border-neutral-800">
                    <td className="py-2">{appointment.id ?? "-"}</td>
                    <td className="py-2">{appointment.client_id ?? appointment.client?.id ?? "-"}</td>
                    <td className="py-2">{appointment.service_id ?? appointment.service?.id ?? "-"}</td>
                    <td className="py-2">{appointment.starts_at ?? appointment.start_at ?? "-"}</td>
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
