import { useEffect, useMemo, useState } from "react"
import { isValid, parseISO } from "date-fns"
import { apiClientAppointments, apiClientServices } from "../lib/api"
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

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
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

function parseDateValue(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value !== "string") return null

  const trimmed = value.trim()
  const parsed = parseISO(trimmed)
  return isValid(parsed) ? parsed : null
}

function getStartDate(appointment) {
  return parseDateValue(appointment?.start_at ?? appointment?.starts_at)
}

function getEndDate(appointment) {
  const explicitEnd = parseDateValue(appointment?.end_at ?? appointment?.ends_at)
  if (explicitEnd) return explicitEnd

  const start = getStartDate(appointment)
  if (!start) return null

  const duration = Number(
    appointment?.duration_minutes ??
      appointment?.duration_min ??
      appointment?.duration ??
      appointment?.service?.duration_minutes ??
      appointment?.service?.duration ??
      60
  )
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 60
  return new Date(start.getTime() + safeDuration * 60 * 1000)
}

function normalizeBackendStatus(status) {
  return String(status ?? "").toLowerCase().trim()
}

function getUiStatus(appointment, nowTs) {
  const backendStatus = normalizeBackendStatus(appointment?.status)
  if (backendStatus === "cancelled" || backendStatus === "canceled" || backendStatus === "cancelado") {
    return "cancelado"
  }

  const end = getEndDate(appointment)
  if (end && end.getTime() < nowTs) return "concluido"

  return "programado"
}

function getServiceName(appointment, servicesById) {
  return appointment.service_name ?? appointment.service?.name ?? servicesById[appointment.service_id] ?? "-"
}

function formatDateTime(value) {
  return value ? DATE_TIME_FORMATTER.format(value) : "-"
}

export default function MyAppointmentsPage() {
  const token = getToken()
  const [appointments, setAppointments] = useState([])
  const [servicesById, setServicesById] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [showConcluded, setShowConcluded] = useState(false)

  const parsedAppointments = useMemo(() => {
    const nowTs = Date.now()

    return appointments
      .map((appointment) => {
        const startDate = getStartDate(appointment)
        if (!startDate) return null

        return {
          raw: appointment,
          id: appointment.id,
          serviceName: getServiceName(appointment, servicesById),
          startDate,
          endDate: getEndDate(appointment),
          uiStatus: getUiStatus(appointment, nowTs),
        }
      })
      .filter(Boolean)
  }, [appointments, servicesById])

  const upcomingAppointments = useMemo(() => {
    const nowTs = Date.now()

    return parsedAppointments
      .filter((appointment) => appointment.uiStatus === "programado" && appointment.startDate.getTime() >= nowTs)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [parsedAppointments])

  const upcomingAppointment = useMemo(() => upcomingAppointments[0] ?? null, [upcomingAppointments])
  const nextUpcomingAppointments = useMemo(() => upcomingAppointments.slice(1), [upcomingAppointments])

  const concludedAppointments = useMemo(() => {
    return parsedAppointments
      .filter((appointment) => appointment.uiStatus === "concluido")
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .slice(0, 20)
  }, [parsedAppointments])

  const cancelledAppointments = useMemo(() => {
    return parsedAppointments
      .filter((appointment) => appointment.uiStatus === "cancelado")
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .slice(0, 20)
  }, [parsedAppointments])

  async function loadServicesMap() {
    try {
      const data = await apiClientServices(token)
      const list = getList(data)
      setServicesById(Object.fromEntries(list.map((service) => [service.id, service.name ?? "-"])))
    } catch {
      // Optional enrichment only.
    }
  }

  async function loadAppointments({ manual = false } = {}) {
    setError("")
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await apiClientAppointments(token)
      setAppointments(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar tus turnos.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadServicesMap()
    loadAppointments()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Mis turnos</h1>

      <section className="kala-card rounded-2xl p-5">
        <h2 className="text-lg font-medium">Próximo turno</h2>

        {loading ? <p className="kala-muted mt-3">Cargando...</p> : null}
        {!loading && !upcomingAppointment ? <p className="kala-muted mt-3">No tenés próximos turnos.</p> : null}

        {!loading && upcomingAppointment ? (
          <div className="kala-card-soft mt-4 rounded-xl p-4 text-sm">
            <p>
              <strong>Servicio:</strong> {upcomingAppointment.serviceName}
            </p>
            <p>
              <strong>Fecha y hora:</strong> {formatDateTime(upcomingAppointment.startDate)}
            </p>
            <p>
              <strong>Fin:</strong> {formatDateTime(upcomingAppointment.endDate)}
            </p>
            <p>
              <strong>Estado:</strong> {upcomingAppointment.uiStatus}
            </p>
          </div>
        ) : null}
      </section>

      <section className="kala-card rounded-2xl p-5">
        <h2 className="text-lg font-medium">Próximos turnos</h2>
        {loading ? <p className="kala-muted mt-3">Cargando...</p> : null}
        {!loading && nextUpcomingAppointments.length === 0 ? (
          <p className="kala-muted mt-3">No hay más turnos futuros.</p>
        ) : null}

        {!loading && nextUpcomingAppointments.length > 0 ? (
          <div className="mt-4 space-y-2">
            {nextUpcomingAppointments.map((appointment, idx) => (
              <article key={appointment.id ?? `next-${idx}`} className="kala-card-soft rounded-xl p-3 text-sm">
                <p>
                  <strong>Servicio:</strong> {appointment.serviceName}
                </p>
                <p>
                  <strong>Inicio:</strong> {formatDateTime(appointment.startDate)}
                </p>
                <p>
                  <strong>Fin:</strong> {formatDateTime(appointment.endDate)}
                </p>
                <p>
                  <strong>Estado:</strong> {appointment.uiStatus}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="kala-card rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Historial</h2>
          <button
            type="button"
            onClick={() => loadAppointments({ manual: true })}
            disabled={loading || refreshing}
            className="kala-btn rounded-md px-3 py-1 text-sm"
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {loading ? <p className="kala-muted mt-3">Cargando...</p> : null}

        {!loading ? (
          <div className="mt-4 space-y-4">
            <div>
              <button
                type="button"
                onClick={() => setShowConcluded((prev) => !prev)}
                className="kala-btn rounded-md px-3 py-1 text-sm"
                aria-expanded={showConcluded}
              >
                {showConcluded ? "▼" : "▶"} Turnos concluidos ({concludedAppointments.length})
              </button>

              {concludedAppointments.length === 0 ? (
                <p className="kala-muted mt-3">No hay turnos concluidos.</p>
              ) : null}

              {showConcluded && concludedAppointments.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="kala-muted">
                      <tr>
                        <th className="px-3 pb-2">ID</th>
                        <th className="px-3 pb-2">Servicio</th>
                        <th className="px-3 pb-2">Fecha</th>
                        <th className="px-3 pb-2">Hora</th>
                        <th className="px-3 pb-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {concludedAppointments.map((appointment, idx) => {
                        const dateText = DATE_FORMATTER.format(appointment.startDate).replaceAll("/", "-")
                        const timeText = TIME_FORMATTER.format(appointment.startDate)

                        return (
                          <tr key={appointment.id ?? idx} style={{ borderTop: "1px solid var(--border)" }}>
                            <td className="px-3 py-3">{appointment.id ?? "-"}</td>
                            <td className="px-3 py-3">{appointment.serviceName}</td>
                            <td className="px-3 py-3">{dateText}</td>
                            <td className="px-3 py-3">{timeText}</td>
                            <td className="px-3 py-3">{appointment.uiStatus}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            {cancelledAppointments.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium">Turnos cancelados ({cancelledAppointments.length})</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="kala-muted">
                      <tr>
                        <th className="px-3 pb-2">ID</th>
                        <th className="px-3 pb-2">Servicio</th>
                        <th className="px-3 pb-2">Fecha</th>
                        <th className="px-3 pb-2">Hora</th>
                        <th className="px-3 pb-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cancelledAppointments.map((appointment, idx) => {
                        const dateText = DATE_FORMATTER.format(appointment.startDate).replaceAll("/", "-")
                        const timeText = TIME_FORMATTER.format(appointment.startDate)

                        return (
                          <tr key={appointment.id ?? `cancelled-${idx}`} style={{ borderTop: "1px solid var(--border)" }}>
                            <td className="px-3 py-3">{appointment.id ?? "-"}</td>
                            <td className="px-3 py-3">{appointment.serviceName}</td>
                            <td className="px-3 py-3">{dateText}</td>
                            <td className="px-3 py-3">{timeText}</td>
                            <td className="px-3 py-3">{appointment.uiStatus}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
