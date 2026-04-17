import { useEffect, useMemo, useRef, useState } from "react"
import {
  apiCreateAppointment,
  apiDeleteAppointment,
  apiListAppointments,
  apiListClients,
  apiListServices,
  apiMe,
  apiUpdateAppointment,
} from "../lib/api"
import { getCachedMe, getToken, setCachedMe } from "../lib/auth"

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

function toDateTimeLocal(value) {
  const date = parseDateValue(value)
  if (!date) return ""

  const pad = (num) => String(num).padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hour}:${minute}`
}

export default function AppointmentsPage() {
  const token = getToken()
  const cachedMe = getCachedMe()
  const [clientId, setClientId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [startAt, setStartAt] = useState("")
  const [appointments, setAppointments] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({ clientId: "", serviceId: "", startAt: "" })
  const [isSaving, setIsSaving] = useState({})
  const [isDeleting, setIsDeleting] = useState({})
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(cachedMe?.role === "admin")
  const createSectionRef = useRef(null)
  const startAtInputRef = useRef(null)

  const clientsById = useMemo(() => {
    return Object.fromEntries(clients.map((client) => [client.id, client.full_name ?? client.name ?? "-"]))
  }, [clients])

  const servicesById = useMemo(() => {
    return Object.fromEntries(services.map((service) => [service.id, service.name ?? "-"]))
  }, [services])

  const canSubmit = useMemo(() => {
    return clientId.trim() !== "" && serviceId.trim() !== "" && startAt.trim() !== ""
  }, [clientId, serviceId, startAt])

  async function loadAppointments({ manual = false } = {}) {
    setError("")
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await apiListAppointments(token)
      setAppointments(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los turnos.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadOptions() {
    setLoadingOptions(true)
    try {
      const [clientsData, servicesData] = await Promise.all([apiListClients(token), apiListServices(token)])
      setClients(getList(clientsData))
      setServices(getList(servicesData))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar clientes y servicios.")
    } finally {
      setLoadingOptions(false)
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

  function onStartEdit(appointment) {
    setEditingId(appointment.id)
    setEditValues({
      clientId: String(appointment.client_id ?? appointment.client?.id ?? ""),
      serviceId: String(appointment.service_id ?? appointment.service?.id ?? ""),
      startAt: toDateTimeLocal(appointment.start_at ?? appointment.starts_at),
    })
  }

  function onCancelEdit() {
    setEditingId(null)
    setEditValues({ clientId: "", serviceId: "", startAt: "" })
  }

  function onDuplicate(appointment) {
    if (!isAdmin) return

    setClientId(String(appointment.client_id ?? appointment.client?.id ?? ""))
    setServiceId(String(appointment.service_id ?? appointment.service?.id ?? ""))
    setStartAt(toDateTimeLocal(appointment.start_at ?? appointment.starts_at))

    if (createSectionRef.current) {
      createSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    window.setTimeout(() => {
      startAtInputRef.current?.focus()
    }, 250)
  }

  async function onSaveEdit(appointmentId) {
    if (!appointmentId || !isAdmin) return

    if (!editValues.clientId || !editValues.serviceId || !editValues.startAt) {
      setError("Completá cliente, servicio y fecha/hora para guardar.")
      return
    }

    setError("")
    setIsSaving((prev) => ({ ...prev, [appointmentId]: true }))
    try {
      await apiUpdateAppointment(token, appointmentId, {
        client_id: Number(editValues.clientId),
        service_id: Number(editValues.serviceId),
        start_at: toIso(editValues.startAt),
      })
      onCancelEdit()
      await loadAppointments()
    } catch (err) {
      setError(err?.message || "No se pudo editar el turno.")
    } finally {
      setIsSaving((prev) => ({ ...prev, [appointmentId]: false }))
    }
  }

  async function onDelete(appointmentId) {
    if (!appointmentId || !isAdmin) return

    setError("")
    setIsDeleting((prev) => ({ ...prev, [appointmentId]: true }))
    try {
      await apiDeleteAppointment(token, appointmentId)
      if (editingId === appointmentId) onCancelEdit()
      await loadAppointments()
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el turno.")
    } finally {
      setIsDeleting((prev) => ({ ...prev, [appointmentId]: false }))
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    if (!canSubmit || !isAdmin || submitting) return

    let created = false
    setError("")
    setSubmitting(true)
    try {
      await apiCreateAppointment(token, {
        client_id: Number(clientId),
        service_id: Number(serviceId),
        start_at: toIso(startAt),
      })
      setClientId("")
      setServiceId("")
      setStartAt("")
      created = true
    } catch (err) {
      setError(err?.message || "No se pudo crear el turno.")
    } finally {
      setSubmitting(false)
    }

    if (created) await loadAppointments()
  }

  useEffect(() => {
    loadMe()
    loadOptions()
    loadAppointments()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Turnos</h1>

      {isAdmin ? (
        <section ref={createSectionRef} className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-lg font-medium">Crear turno</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
            <select
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={String(client.id)}>
                  {(client.full_name ?? client.name ?? "-").trim()}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Servicio</option>
              {services.map((service) => (
                <option key={service.id} value={String(service.id)}>
                  {service.name ?? "-"}
                </option>
              ))}
            </select>
            <input
              ref={startAtInputRef}
              type="datetime-local"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
            <button
              type="submit"
              disabled={!canSubmit || submitting || loadingOptions}
              className="rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-60"
            >
              {submitting ? "Creando..." : "Crear"}
            </button>
          </form>
        </section>
      ) : null}

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

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {loading ? <p className="mt-3 text-neutral-400">Cargando...</p> : null}
        {!loading && appointments.length === 0 ? <p className="mt-3 text-neutral-400">Sin turnos.</p> : null}

        {!loading && appointments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Servicio</th>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Hora</th>
                  {isAdmin ? <th className="pb-2 text-right">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment, idx) => {
                  const rowSaving = Boolean(isSaving[appointment.id])
                  const rowDeleting = Boolean(isDeleting[appointment.id])
                  const isEditing = editingId === appointment.id
                  const startDate = parseDateValue(appointment.start_at ?? appointment.starts_at)
                  const dateText = startDate ? DATE_FORMATTER.format(startDate).replaceAll("/", "-") : "-"
                  const timeText = startDate ? TIME_FORMATTER.format(startDate) : "-"

                  return (
                    <tr key={appointment.id ?? idx} className="border-t border-neutral-800 align-top">
                      <td className="py-3">{appointment.id ?? "-"}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.clientId}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, clientId: e.target.value }))}
                          >
                            <option value="">Cliente</option>
                            {clients.map((client) => (
                              <option key={client.id} value={String(client.id)}>
                                {(client.full_name ?? client.name ?? "-").trim()}
                              </option>
                            ))}
                          </select>
                        ) : (
                          clientsById[appointment.client_id] ?? "-"
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.serviceId}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, serviceId: e.target.value }))}
                          >
                            <option value="">Servicio</option>
                            {services.map((service) => (
                              <option key={service.id} value={String(service.id)}>
                                {service.name ?? "-"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          servicesById[appointment.service_id] ?? "-"
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.startAt}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, startAt: e.target.value }))}
                          />
                        ) : (
                          dateText
                        )}
                      </td>
                      <td className="py-3">{isEditing ? "-" : timeText}</td>
                      {isAdmin ? (
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onSaveEdit(appointment.id)}
                                  disabled={rowSaving || rowDeleting}
                                  className="rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-950 disabled:opacity-60"
                                >
                                  {rowSaving ? "Guardando..." : "Guardar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={onCancelEdit}
                                  disabled={rowSaving || rowDeleting}
                                  className="rounded-md bg-neutral-800 px-3 py-1 text-xs hover:bg-neutral-700 disabled:opacity-60"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onStartEdit(appointment)}
                                disabled={rowSaving || rowDeleting}
                                className="rounded-md bg-neutral-800 px-3 py-1 text-xs hover:bg-neutral-700 disabled:opacity-60"
                              >
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDelete(appointment.id)}
                              disabled={rowSaving || rowDeleting || !appointment.id}
                              className="rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-60"
                            >
                              {rowDeleting ? "Eliminando..." : "Eliminar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDuplicate(appointment)}
                              disabled={rowSaving || rowDeleting}
                              className="rounded-md bg-neutral-800 px-3 py-1 text-xs hover:bg-neutral-700 disabled:opacity-60"
                            >
                              Duplicar
                            </button>
                          </div>
                        </td>
                      ) : null}
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
