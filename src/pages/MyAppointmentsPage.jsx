import { useEffect, useMemo, useState } from "react"
import { apiCreateMyAppointment, apiListMyAppointments, apiListServices } from "../lib/api"
import { getToken } from "../lib/auth"

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

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

function parseDateValue(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export default function MyAppointmentsPage() {
  const token = getToken()
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [serviceId, setServiceId] = useState("")
  const [startAt, setStartAt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const servicesById = useMemo(() => {
    return Object.fromEntries(services.map((service) => [service.id, service.name ?? "-"]))
  }, [services])

  const canSubmit = useMemo(() => serviceId.trim() !== "" && startAt.trim() !== "", [serviceId, startAt])

  async function loadServices() {
    try {
      const data = await apiListServices(token)
      setServices(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los servicios.")
    }
  }

  async function loadAppointments({ manual = false } = {}) {
    setError("")
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await apiListMyAppointments(token)
      setAppointments(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar tus turnos.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setError("")
    setSuccess("")
    setSubmitting(true)
    try {
      await apiCreateMyAppointment(token, {
        service_id: Number(serviceId),
        start_at: toIso(startAt),
      })
      setServiceId("")
      setStartAt("")
      setSuccess("Turno confirmado")
      await loadAppointments()
    } catch (err) {
      setError(err?.message || "No se pudo solicitar el turno.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadServices()
    loadAppointments()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Mis turnos</h1>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-lg font-medium">Solicitar turno</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onCreate}>
          <select
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">Servicio</option>
            {services.map((service) => (
              <option key={service.id} value={String(service.id)}>
                {service.name ?? "-"}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-60"
          >
            {submitting ? "Confirmando..." : "Confirmar turno"}
          </button>
        </form>

        {success ? <p className="mt-3 text-sm text-emerald-400">{success}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Listado</h2>
          <button
            type="button"
            onClick={() => loadAppointments({ manual: true })}
            disabled={loading || refreshing}
            className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {loading ? <p className="mt-3 text-neutral-400">Cargando...</p> : null}
        {!loading && appointments.length === 0 ? <p className="mt-3 text-neutral-400">Sin turnos.</p> : null}

        {!loading && appointments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Servicio</th>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Hora</th>
                  <th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment, idx) => {
                  const startDate = parseDateValue(appointment.start_at ?? appointment.starts_at)
                  const dateText = startDate ? DATE_FORMATTER.format(startDate).replaceAll("/", "-") : "-"
                  const timeText = startDate ? TIME_FORMATTER.format(startDate) : "-"

                  return (
                    <tr key={appointment.id ?? idx} className="border-t border-neutral-800">
                      <td className="py-3">{appointment.id ?? "-"}</td>
                      <td className="py-3">{servicesById[appointment.service_id] ?? appointment.service?.name ?? "-"}</td>
                      <td className="py-3">{dateText}</td>
                      <td className="py-3">{timeText}</td>
                      <td className="py-3">{appointment.status ?? "-"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
