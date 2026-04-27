import { useEffect, useMemo, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import timeGridPlugin from "@fullcalendar/timegrid"
import esLocale from "@fullcalendar/core/locales/es"
import {
  addDays,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  apiClientAvailability,
  apiClientServices,
  apiCreateAppointment,
  apiCreateClientAppointment,
  apiListAppointments,
  apiListClients,
  apiListServices,
} from "../lib/api"
import { getCachedMe, getToken } from "../lib/auth"
import "./CalendarPage.css"

const CLIENT_SELECTED_SERVICE_KEY = "client_selected_service_id"

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
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
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== "string") return null
  const parsed = parseISO(value.trim())
  return isValid(parsed) ? parsed : null
}

function pad(num) {
  return String(num).padStart(2, "0")
}

function toDateKey(date) {
  return format(date, "yyyy-MM-dd")
}

function toTimeKey(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toApiDate(date) {
  return format(date, "yyyy-MM-dd")
}

function normalizeErrorMessage(err, fallback) {
  const raw = err?.message ?? err?.detail
  if (typeof raw === "string" && raw.trim() && raw !== "[object Object]") {
    const trimmed = raw.trim()
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed
  }
  return fallback
}

function getDurationMinutes(value, fallback = 60) {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return fallback
}

function getAppointmentDuration(appointment) {
  return getDurationMinutes(
    appointment?.duration_minutes ??
      appointment?.duration_min ??
      appointment?.duration ??
      appointment?.service?.duration_minutes ??
      appointment?.service?.duration,
    60
  )
}

function getEventTitle(appointment) {
  const serviceName =
    appointment?.service_name ?? appointment?.service?.name ?? appointment?.service?.title ?? "Servicio"

  const clientName =
    appointment?.client_name ??
    appointment?.client?.full_name ??
    appointment?.client?.name ??
    appointment?.client_email

  if (clientName) return `${serviceName} - ${clientName}`
  return serviceName
}

function mapAppointmentsToEvents(appointments) {
  return appointments
    .map((appointment, idx) => {
      const start = parseDate(appointment?.start_at ?? appointment?.starts_at)
      if (!start) return null

      const explicitEnd = parseDate(appointment?.end_at ?? appointment?.ends_at)
      const end = explicitEnd || new Date(start.getTime() + getAppointmentDuration(appointment) * 60 * 1000)

      return {
        id: String(appointment?.id ?? `appt-${idx}`),
        title: getEventTitle(appointment),
        start,
        end,
      }
    })
    .filter(Boolean)
}

function formatRange(start, end) {
  if (!start || !end) return "-"
  return `${DATE_FORMATTER.format(start)} ${start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${end.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`
}

function buildTimeRows(durationMinutes) {
  const rows = []
  const startMinutes = 9 * 60
  const endMinutes = 19 * 60

  for (let minutes = startMinutes; minutes + durationMinutes <= endMinutes; minutes += durationMinutes) {
    const hh = pad(Math.floor(minutes / 60))
    const mm = pad(minutes % 60)
    rows.push(`${hh}:${mm}`)
  }

  return rows
}

function normalizeSlotStatus(slot) {
  const status = String(slot?.status ?? "").toLowerCase()
  if (status === "available") return "available"
  if (status === "occupied") return "occupied"

  if (typeof slot?.occupied === "boolean") return slot.occupied ? "occupied" : "available"
  if (typeof slot?.is_occupied === "boolean") return slot.is_occupied ? "occupied" : "available"
  if (typeof slot?.available === "boolean") return slot.available ? "available" : "occupied"
  if (typeof slot?.is_available === "boolean") return slot.is_available ? "available" : "occupied"

  return null
}

function collectSlotCandidates(raw) {
  const direct = getList(raw?.slots)
  if (direct.length) return direct

  const asArray = getList(raw)
  if (asArray.some((item) => item?.start_at || item?.starts_at || item?.start)) return asArray

  const fromDays = []
  getList(raw?.days).forEach((day) => {
    const dayDate = day?.date ?? day?.day

    getList(day?.slots).forEach((slot) => fromDays.push({ ...slot, _dayDate: dayDate }))
    getList(day?.available_slots).forEach((slot) => {
      const value = typeof slot === "string" ? { start: slot } : slot
      fromDays.push({ ...value, status: "available", _dayDate: dayDate })
    })
    getList(day?.busy_slots).forEach((slot) => {
      const value = typeof slot === "string" ? { start: slot } : slot
      fromDays.push({ ...value, status: "occupied", _dayDate: dayDate })
    })
  })

  return fromDays
}

function normalizeClientAvailability(raw) {
  const candidates = collectSlotCandidates(raw)

  return candidates
    .map((slot, idx) => {
      const rawStart = slot?.start_at ?? slot?.starts_at ?? slot?.start ?? slot?.datetime ?? slot?.date_time
      const rawEnd = slot?.end_at ?? slot?.ends_at ?? slot?.end

      let startAt = parseDate(rawStart)
      if (!startAt && slot?._dayDate && rawStart && typeof rawStart === "string") {
        startAt = parseDate(`${slot._dayDate}T${rawStart}`)
      }
      if (!startAt) return null

      let endAt = parseDate(rawEnd)
      if (!endAt && slot?._dayDate && rawEnd && typeof rawEnd === "string") {
        endAt = parseDate(`${slot._dayDate}T${rawEnd}`)
      }
      if (!endAt) endAt = new Date(startAt.getTime() + 60 * 60 * 1000)

      const status = normalizeSlotStatus(slot)
      if (!status) return null

      return {
        id: String(slot?.id ?? `${startAt.toISOString()}-${idx}`),
        startAt,
        endAt,
        status,
        dateKey: toDateKey(startAt),
        timeKey: toTimeKey(startAt),
      }
    })
    .filter(Boolean)
}

function buildBusinessWeekDays(weekStart) {
  // Important: build weekdays from real Date objects only.
  // Never parse UI labels (e.g. "mié 22/04"), which can produce wrong years.
  const safeWeekStart = startOfWeek(parseDate(weekStart) ?? new Date(), { weekStartsOn: 1 })
  return [0, 1, 2, 3, 4].map((offset) => {
    const date = addDays(safeWeekStart, offset)
    return { key: toDateKey(date), date }
  })
}

function toWeekStart(dateLike) {
  return startOfWeek(parseDate(dateLike) ?? new Date(), { weekStartsOn: 1 })
}

export default function CalendarPage() {
  const token = getToken()
  const me = getCachedMe()
  const isAdmin = me?.role === "admin"
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [events, setEvents] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [selectedRange, setSelectedRange] = useState(null)
  const [clientId, setClientId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [clientServices, setClientServices] = useState([])
  const [selectedClientServiceId, setSelectedClientServiceId] = useState("")
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => toWeekStart(new Date()))
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityRefreshing, setAvailabilityRefreshing] = useState(false)
  const [availabilityError, setAvailabilityError] = useState("")
  const [availabilitySlots, setAvailabilitySlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [clientCreating, setClientCreating] = useState(false)
  const [clientSuccess, setClientSuccess] = useState("")

  const canCreate = useMemo(() => {
    return isAdmin && selectedRange?.start && clientId && serviceId && !creating
  }, [isAdmin, selectedRange, clientId, serviceId, creating])

  const selectedService = useMemo(() => {
    return clientServices.find((service) => String(service.id) === String(selectedClientServiceId)) || null
  }, [clientServices, selectedClientServiceId])

  const selectedServiceDuration = useMemo(() => {
    return getDurationMinutes(selectedService?.duration_minutes ?? selectedService?.duration, 60)
  }, [selectedService])

  const selectedServiceName = selectedService?.name ?? "Servicio"
  const weekEnd = useMemo(() => addDays(selectedWeekStart, 4), [selectedWeekStart])
  const weekLabel = useMemo(
    () => `Semana del ${format(selectedWeekStart, "dd/MM")} al ${format(weekEnd, "dd/MM")}`,
    [selectedWeekStart, weekEnd]
  )
  const availabilityByKey = useMemo(() => {
    const map = new Map()
    availabilitySlots.forEach((slot) => {
      map.set(`${slot.dateKey} ${slot.timeKey}`, slot)
    })
    return map
  }, [availabilitySlots])

  const weekdayColumns = useMemo(() => buildBusinessWeekDays(selectedWeekStart), [selectedWeekStart])
  const timeRows = useMemo(() => buildTimeRows(selectedServiceDuration), [selectedServiceDuration])

  async function loadAppointments({ manual = false } = {}) {
    setError("")
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await apiListAppointments(token)
      setEvents(mapAppointmentsToEvents(getList(data)))
    } catch (err) {
      setError(normalizeErrorMessage(err, "No se pudieron cargar los turnos del calendario."))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadAdminOptions() {
    setLoadingOptions(true)
    try {
      const [clientsData, servicesData] = await Promise.all([apiListClients(token), apiListServices(token)])
      setClients(getList(clientsData))
      setServices(getList(servicesData))
    } catch (err) {
      setError(normalizeErrorMessage(err, "No se pudieron cargar clientes y servicios."))
    } finally {
      setLoadingOptions(false)
    }
  }

  async function loadClientServices() {
    setAvailabilityError("")
    setAvailabilityLoading(true)

    try {
      const data = await apiClientServices(token)
      const list = getList(data)
      setClientServices(list)

      const queryServiceId = searchParams.get("serviceId")
      const storedServiceId = localStorage.getItem(CLIENT_SELECTED_SERVICE_KEY)
      const candidate = queryServiceId || storedServiceId || (list[0]?.id ? String(list[0].id) : "")

      if (candidate) {
        const exists = list.some((service) => String(service.id) === String(candidate))
        if (exists) {
          setSelectedClientServiceId(String(candidate))
          localStorage.setItem(CLIENT_SELECTED_SERVICE_KEY, String(candidate))
        }
      }
    } catch (err) {
      setAvailabilityError(normalizeErrorMessage(err, "No se pudieron cargar los servicios."))
    } finally {
      setAvailabilityLoading(false)
    }
  }

  async function loadClientAvailability({ manual = false } = {}) {
    if (!selectedClientServiceId) {
      setAvailabilitySlots([])
      setSelectedSlot(null)
      return
    }

    setAvailabilityError("")
    if (manual) setAvailabilityRefreshing(true)
    else setAvailabilityLoading(true)

    try {
      const data = await apiClientAvailability(token, Number(selectedClientServiceId), {
        range: "week",
        start_date: toApiDate(selectedWeekStart),
      })
      const normalized = normalizeClientAvailability(data).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      setAvailabilitySlots(normalized)
      setSelectedSlot((prev) => {
        if (!prev) return null
        const stillAvailable = normalized.find(
          (slot) => slot.startAt.toISOString() === prev.startAt && slot.status === "available"
        )
        return stillAvailable
          ? {
              startAt: stillAvailable.startAt.toISOString(),
              endAt: stillAvailable.endAt.toISOString(),
              serviceId: Number(selectedClientServiceId),
            }
          : null
      })
    } catch (err) {
      setAvailabilityError(normalizeErrorMessage(err, "No se pudo cargar disponibilidad. Reintentá."))
      setAvailabilitySlots([])
      setSelectedSlot(null)
    } finally {
      setAvailabilityLoading(false)
      setAvailabilityRefreshing(false)
    }
  }

  async function onCreateAdminAppointment() {
    if (!canCreate) return

    setError("")
    setSuccess("")
    setCreating(true)

    try {
      await apiCreateAppointment(token, {
        client_id: Number(clientId),
        service_id: Number(serviceId),
        start_at: selectedRange.start.toISOString(),
      })

      setSuccess("Turno creado.")
      setSelectedRange(null)
      setClientId("")
      setServiceId("")
      await loadAppointments({ manual: true })
      window.setTimeout(() => setSuccess(""), 3500)
    } catch (err) {
      setError(normalizeErrorMessage(err, "No se pudo crear el turno."))
    } finally {
      setCreating(false)
    }
  }

  async function onConfirmClientSlot() {
    if (!selectedSlot || !selectedClientServiceId || clientCreating) return

    setAvailabilityError("")
    setClientSuccess("")
    setClientCreating(true)

    try {
      await apiCreateClientAppointment(token, {
        service_id: Number(selectedClientServiceId),
        start_at: selectedSlot.startAt,
        end_at: selectedSlot.endAt,
      })

      await loadClientAvailability({ manual: true })
      setClientSuccess("Turno confirmado. Redirigiendo...")
      setSelectedSlot(null)
      window.setTimeout(() => navigate("/my-appointments"), 800)
    } catch (err) {
      setAvailabilityError(normalizeErrorMessage(err, "No se pudo confirmar el turno."))
    } finally {
      setClientCreating(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadAppointments()
      loadAdminOptions()
      return
    }

    loadClientServices()
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin) return
    if (!selectedClientServiceId) return

    localStorage.setItem(CLIENT_SELECTED_SERVICE_KEY, String(selectedClientServiceId))
    loadClientAvailability()
  }, [isAdmin, selectedClientServiceId, selectedWeekStart])

  useEffect(() => {
    if (!import.meta.env.DEV || isAdmin) return
    console.debug("[calendar-client] days generated", weekdayColumns.map((day) => day.date.toISOString()))
  }, [isAdmin, weekdayColumns])

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <button
            type="button"
            onClick={() => loadClientAvailability({ manual: true })}
            disabled={availabilityLoading || availabilityRefreshing || !selectedClientServiceId}
            className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            {availabilityRefreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="grid gap-3 md:grid-cols-[280px_1fr] md:items-end">
            <div>
              <label className="text-sm text-neutral-300">Servicio</label>
              <select
                value={selectedClientServiceId}
                onChange={(e) => setSelectedClientServiceId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
                disabled={availabilityLoading && clientServices.length === 0}
              >
                <option value="">Seleccioná un servicio</option>
                {clientServices.map((service) => (
                  <option key={service.id} value={String(service.id)}>
                    {service.name ?? "-"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm text-neutral-300">Semana</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWeekStart((prev) => toWeekStart(addDays(prev, -7)))}
                  className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekStart(toWeekStart(new Date()))}
                  className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800"
                >
                  Hoy
                </button>
                <div className="min-w-48 text-center text-sm text-neutral-200">{weekLabel}</div>
                <button
                  type="button"
                  onClick={() => setSelectedWeekStart((prev) => toWeekStart(addDays(prev, 7)))}
                  className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-2 text-neutral-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Disponible
            </span>
            <span className="inline-flex items-center gap-2 text-neutral-400">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" /> Ocupado
            </span>
          </div>

          {clientSuccess ? <p className="mt-4 text-sm text-emerald-400">{clientSuccess}</p> : null}
          {availabilityError ? <p className="mt-4 text-sm text-red-400">{availabilityError}</p> : null}
          {availabilityLoading ? <p className="mt-4 text-neutral-400">Cargando disponibilidad...</p> : null}

          {!availabilityLoading && selectedClientServiceId && weekdayColumns.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="w-20 px-2 pb-2 text-left">Hora</th>
                    {weekdayColumns.map((day) => (
                      <th key={day.key} className="min-w-24 px-1 pb-2 text-center font-medium">
                        {format(day.date, "EEE dd/MM", { locale: es })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeRows.map((timeKey) => (
                    <tr key={timeKey} className="border-t border-neutral-800/80 align-middle">
                      <td className="px-2 py-2 text-neutral-400">{timeKey}</td>
                      {weekdayColumns.map((day) => {
                        const key = `${day.key} ${timeKey}`
                        const slot = availabilityByKey.get(key) || null
                        const available = slot?.status === "available"
                        const occupied = slot?.status === "occupied"
                        const selected =
                          available && selectedSlot?.startAt && slot?.startAt.toISOString() === selectedSlot.startAt

                        return (
                          <td key={key} className="px-1 py-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!available || !slot) return
                                setSelectedSlot({
                                  startAt: slot.startAt.toISOString(),
                                  endAt: slot.endAt.toISOString(),
                                  serviceId: Number(selectedClientServiceId),
                                })
                              }}
                              disabled={!available}
                              className={`w-full rounded-md border px-2 py-2 text-[11px] transition ${
                                available
                                  ? `${selected ? "ring-1 ring-emerald-200 " : ""}border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30`
                                  : occupied
                                    ? "cursor-not-allowed border-red-400/20 bg-red-500/12 text-neutral-500"
                                    : "cursor-not-allowed border-neutral-700/60 bg-white/5 text-neutral-500"
                              }`}
                            >
                              {available ? "Disponible" : occupied ? "Ocupado" : "—"}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!availabilityLoading && selectedClientServiceId && weekdayColumns.length === 0 ? (
            <p className="mt-4 text-neutral-400">No hay días hábiles para mostrar en este mes.</p>
          ) : null}

          {!availabilityLoading && selectedClientServiceId && timeRows.length === 0 ? (
            <p className="mt-4 text-neutral-400">El servicio no tiene una duración válida para generar bloques.</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Slot seleccionado</h2>
            <button
              type="button"
              onClick={onConfirmClientSlot}
              disabled={clientCreating || !selectedSlot}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-60"
            >
              {clientCreating ? "Confirmando..." : "Confirmar turno"}
            </button>
          </div>

          {selectedSlot ? (
            <div className="mt-3 space-y-1 text-sm text-neutral-300">
              <p>
                <strong>Servicio:</strong> {selectedServiceName}
              </p>
              <p>
                <strong>Fecha y hora:</strong> {DATE_TIME_FORMATTER.format(parseISO(selectedSlot.startAt))}
              </p>
              <p>
                <strong>Fin:</strong> {DATE_TIME_FORMATTER.format(parseISO(selectedSlot.endAt))}
              </p>
              <p>
                <strong>Duración:</strong> {selectedServiceDuration} min
              </p>
              {selectedService?.price != null ? (
                <p>
                  <strong>Precio:</strong> {selectedService.price}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-400">Seleccioná un slot disponible para continuar.</p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              disabled={clientCreating || !selectedSlot}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 disabled:opacity-60"
            >
              Limpiar selección
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Calendario</h1>
        <button
          type="button"
          onClick={() => loadAppointments({ manual: true })}
          disabled={loading || refreshing || creating}
          className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-60"
        >
          {refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {success ? (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5">
        {loading ? (
          <p className="text-neutral-400">Cargando calendario...</p>
        ) : (
          <div className="kala-calendar">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              locales={[esLocale]}
              locale="es"
              initialView="timeGridWeek"
              headerToolbar={{
                left: "today prev,next",
                center: "title",
                right: "timeGridWeek,timeGridDay",
              }}
              firstDay={1}
              slotMinTime="09:00:00"
              slotMaxTime="19:00:00"
              allDaySlot={false}
              nowIndicator
              height="auto"
              selectable={isAdmin}
              selectMirror={isAdmin}
              select={(selectionInfo) => setSelectedRange({ start: selectionInfo.start, end: selectionInfo.end })}
              events={events}
              eventDisplay="block"
              eventBackgroundColor="#0f172a"
              eventBorderColor="#38bdf8"
              eventTextColor="#e2e8f0"
            />
          </div>
        )}

        {!loading && events.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-400">No hay turnos para mostrar en este calendario.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-lg font-medium">Crear turno desde calendario</h2>

        {selectedRange ? (
          <>
            <p className="mt-2 text-sm text-neutral-300">{formatRange(selectedRange.start, selectedRange.end)}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loadingOptions || creating}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              >
                <option value="">Cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={String(client.id)}>
                    {(client.full_name ?? client.name ?? "-").trim()}
                  </option>
                ))}
              </select>

              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={loadingOptions || creating}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              >
                <option value="">Servicio</option>
                {services.map((service) => (
                  <option key={service.id} value={String(service.id)}>
                    {service.name ?? "-"}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCreateAdminAppointment}
                  disabled={!canCreate}
                  className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-60"
                >
                  {creating ? "Creando..." : "Crear turno"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRange(null)
                    setClientId("")
                    setServiceId("")
                  }}
                  disabled={creating}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">
            Seleccioná un rango en el calendario para precargar fecha y hora de un nuevo turno.
          </p>
        )}
      </section>
    </div>
  )
}
