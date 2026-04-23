import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiClientDashboard } from "../lib/api"
import { getToken } from "../lib/auth"

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

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateTime(value) {
  const date = parseDate(value)
  if (!date) return "-"
  return DATE_TIME_FORMATTER.format(date)
}

function pickClient(payload) {
  return payload?.client ?? payload?.profile ?? payload?.data?.client ?? payload ?? {}
}

function pickUpcoming(payload) {
  return (
    payload?.next_appointment ??
    payload?.next ??
    payload?.upcoming_appointment ??
    payload?.upcoming ??
    payload?.appointments?.next ??
    null
  )
}

function pickHistory(payload) {
  const direct = getList(payload?.history)
  if (direct.length) return direct

  const recent = getList(payload?.recent_appointments)
  if (recent.length) return recent

  const appts = getList(payload?.appointments)
  if (appts.length) return appts

  return []
}

function buildKpis(payload, history, upcoming) {
  return {
    totalAppointments:
      payload?.kpis?.total_appointments ??
      payload?.metrics?.total_appointments ??
      payload?.total_appointments ??
      history.length,
    lastAppointment:
      payload?.kpis?.last_appointment_at ??
      payload?.metrics?.last_appointment_at ??
      payload?.last_appointment_at ??
      history[0]?.start_at ??
      history[0]?.starts_at ??
      null,
    nextAppointment:
      payload?.kpis?.next_appointment_at ??
      payload?.metrics?.next_appointment_at ??
      payload?.next_appointment_at ??
      upcoming?.start_at ??
      upcoming?.starts_at ??
      null,
  }
}

function getAppointmentFields(appointment) {
  const service = appointment?.service_name ?? appointment?.service?.name ?? "-"
  const startAt = appointment?.start_at ?? appointment?.starts_at
  const status = appointment?.status ?? "-"

  return { service, startAt, status }
}

export default function ClientPanelPage() {
  const token = getToken()
  const { id } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [upcoming, setUpcoming] = useState(null)
  const [history, setHistory] = useState([])
  const [kpis, setKpis] = useState({ totalAppointments: 0, lastAppointment: null, nextAppointment: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const whatsappHref = useMemo(() => {
    const phone = String(client?.phone ?? "").replace(/\D/g, "")
    if (!phone) return ""
    return `https://wa.me/${phone}`
  }, [client?.phone])

  async function loadDashboard() {
    if (!id) return

    setError("")
    setLoading(true)

    try {
      const data = await apiClientDashboard(token, id)
      const safeClient = pickClient(data)
      const safeUpcoming = pickUpcoming(data)
      const safeHistory = pickHistory(data).slice(0, 10)
      const safeKpis = buildKpis(data, safeHistory, safeUpcoming)

      setClient(safeClient)
      setUpcoming(safeUpcoming)
      setHistory(safeHistory)
      setKpis(safeKpis)
    } catch (err) {
      setError(err?.message || "No se pudo cargar el panel del cliente.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [id])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Panel del cliente</h1>
        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800"
        >
          Volver a clientes
        </button>
      </div>

      {loading ? <p className="text-neutral-400">Cargando panel...</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium">Datos del cliente</h2>
                <div className="mt-3 space-y-1 text-sm text-neutral-200">
                  <p>
                    <strong>Nombre:</strong> {client?.full_name ?? client?.name ?? "-"}
                  </p>
                  <p>
                    <strong>Teléfono:</strong> {client?.phone ?? "-"}
                  </p>
                  <p>
                    <strong>Email:</strong> {client?.email ?? "-"}
                  </p>
                  <p>
                    <strong>Notas:</strong> {client?.notes ?? "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-950/45"
                  >
                    Enviar WhatsApp
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate(`/appointments?clientId=${id}`)}
                  className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950"
                >
                  Crear turno
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h2 className="text-lg font-medium">Próximo turno</h2>
            {upcoming ? (
              <div className="mt-3 text-sm text-neutral-200">
                <p>
                  <strong>Servicio:</strong> {getAppointmentFields(upcoming).service}
                </p>
                <p>
                  <strong>Fecha:</strong> {formatDateTime(getAppointmentFields(upcoming).startAt)}
                </p>
                <p>
                  <strong>Estado:</strong> {getAppointmentFields(upcoming).status}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-neutral-400">No hay próximo turno.</p>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h2 className="text-lg font-medium">Historial (últimos 10)</h2>
            {history.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-neutral-400">
                    <tr>
                      <th className="px-3 pb-2">Fecha</th>
                      <th className="px-3 pb-2">Servicio</th>
                      <th className="px-3 pb-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((appointment, idx) => {
                      const { startAt, service, status } = getAppointmentFields(appointment)
                      return (
                        <tr key={appointment?.id ?? idx} className="border-t border-neutral-800">
                          <td className="px-3 py-3">{formatDateTime(startAt)}</td>
                          <td className="px-3 py-3">{service}</td>
                          <td className="px-3 py-3">{status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-neutral-400">Sin historial para mostrar.</p>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h2 className="text-lg font-medium">KPIs</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-400">Total turnos</p>
                <p className="mt-1 text-lg font-medium">{kpis.totalAppointments ?? 0}</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-400">Último turno</p>
                <p className="mt-1 text-sm font-medium">{formatDateTime(kpis.lastAppointment)}</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-400">Próximo turno</p>
                <p className="mt-1 text-sm font-medium">{formatDateTime(kpis.nextAppointment)}</p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
