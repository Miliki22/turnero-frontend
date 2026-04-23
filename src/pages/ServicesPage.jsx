import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  apiClientServices,
  apiCreateService,
  apiDeleteService,
  apiListServices,
  apiMe,
  apiUpdateService,
} from "../lib/api"
import { getCachedMe, getToken, setCachedMe } from "../lib/auth"

const ALLOWED_DURATIONS = ["60", "90", "120"]
const CLIENT_SELECTED_SERVICE_KEY = "client_selected_service_id"

function getList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function ServicesPage() {
  const navigate = useNavigate()
  const token = getToken()
  const cachedMe = getCachedMe()
  const [name, setName] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [price, setPrice] = useState("")
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({ name: "", durationMinutes: "", price: "" })
  const [isSaving, setIsSaving] = useState({})
  const [isDeleting, setIsDeleting] = useState({})
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(cachedMe?.role === "admin")
  const [selectedClientServiceId, setSelectedClientServiceId] = useState(
    () => localStorage.getItem(CLIENT_SELECTED_SERVICE_KEY) || ""
  )

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && ALLOWED_DURATIONS.includes(durationMinutes)
  }, [name, durationMinutes])

  async function loadServices({ manual = false, roleOverride } = {}) {
    setError("")
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const adminMode = typeof roleOverride === "boolean" ? roleOverride : isAdmin
      const data = adminMode ? await apiListServices(token) : await apiClientServices(token)
      setServices(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los servicios.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadMe() {
    if (!token) return
    try {
      const me = await apiMe(token)
      setCachedMe(me)
      setIsAdmin(me?.role === "admin")
      return me
    } catch {
      // RequireAuth handles invalid/expired token flow.
      return null
    }
  }

  function onStartEdit(service) {
    setEditingId(service.id)
    setEditValues({
      name: service.name ?? "",
      durationMinutes: String(service.duration_minutes ?? service.duration ?? ""),
      price: service.price ?? "",
    })
  }

  function onCancelEdit() {
    setEditingId(null)
    setEditValues({ name: "", durationMinutes: "", price: "" })
  }

  async function onSaveEdit(serviceId) {
    if (!serviceId || !isAdmin) return

    if (!ALLOWED_DURATIONS.includes(editValues.durationMinutes)) {
      setError("Seleccioná una duración válida (60, 90 o 120).")
      return
    }

    setError("")
    setIsSaving((prev) => ({ ...prev, [serviceId]: true }))
    try {
      await apiUpdateService(token, serviceId, {
        name: editValues.name.trim(),
        duration_minutes: Number(editValues.durationMinutes),
        price: editValues.price === "" ? null : Number(editValues.price),
      })
      onCancelEdit()
      await loadServices()
    } catch (err) {
      setError(err?.message || "No se pudo editar el servicio.")
    } finally {
      setIsSaving((prev) => ({ ...prev, [serviceId]: false }))
    }
  }

  async function onDelete(serviceId) {
    if (!isAdmin || !serviceId) return

    setError("")
    setIsDeleting((prev) => ({ ...prev, [serviceId]: true }))
    try {
      await apiDeleteService(token, serviceId)
      if (editingId === serviceId) onCancelEdit()
      await loadServices()
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el servicio.")
    } finally {
      setIsDeleting((prev) => ({ ...prev, [serviceId]: false }))
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    if (!canSubmit || !isAdmin || submitting) return

    if (!ALLOWED_DURATIONS.includes(durationMinutes)) {
      setError("Seleccioná una duración válida (60, 90 o 120).")
      return
    }

    let created = false
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
      setDurationMinutes("")
      setPrice("")
      created = true
    } catch (err) {
      setError(err?.message || "No se pudo crear el servicio.")
    } finally {
      setSubmitting(false)
    }

    if (created) await loadServices()
  }

  useEffect(() => {
    async function initialize() {
      const me = await loadMe()
      await loadServices({ roleOverride: me?.role === "admin" })
    }

    initialize()
  }, [])

  useEffect(() => {
    if (isAdmin) return
    if (!selectedClientServiceId) return

    const exists = services.some((service) => String(service.id) === String(selectedClientServiceId))
    if (!exists) setSelectedClientServiceId("")
  }, [isAdmin, selectedClientServiceId, services])

  function onChooseClientService(serviceId) {
    const value = String(serviceId)
    setSelectedClientServiceId(value)
    localStorage.setItem(CLIENT_SELECTED_SERVICE_KEY, value)
    navigate(`/calendar?serviceId=${value}`)
  }

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
            <select
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            >
              <option value="">Duración (min)</option>
              {ALLOWED_DURATIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
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

      {!isAdmin ? (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Servicios disponibles</h2>
            <button
              type="button"
              onClick={() => loadServices({ manual: true })}
              disabled={loading || refreshing}
              className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          {loading ? <p className="mt-3 text-neutral-400">Cargando...</p> : null}
          {!loading && services.length === 0 ? <p className="mt-3 text-neutral-400">Sin servicios disponibles.</p> : null}

          {!loading && services.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {services.map((service) => {
                const selected = String(service.id) === String(selectedClientServiceId)
                return (
                  <article
                    key={service.id}
                    className={`rounded-xl border p-4 ${selected ? "border-neutral-200 bg-neutral-100/10" : "border-neutral-800 bg-neutral-950/40"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-medium">{service.name ?? "-"}</h3>
                        <p className="mt-1 text-sm text-neutral-400">
                          Duración: {service.duration_minutes ?? service.duration ?? "-"} min
                        </p>
                        <p className="text-sm text-neutral-400">Precio: {service.price ?? "-"}</p>
                      </div>
                      {selected ? (
                        <span className="rounded-full border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300">
                          Seleccionado
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onChooseClientService(service.id)}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-950"
                      >
                        Elegir turno
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Listado</h2>
            <button
            type="button"
            onClick={() => loadServices({ manual: true })}
            disabled={loading || refreshing}
            className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {loading ? <p className="mt-3 text-neutral-400">Cargando...</p> : null}
        {!loading && services.length === 0 ? <p className="mt-3 text-neutral-400">Sin servicios.</p> : null}

        {!loading && services.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="w-20 min-w-20 px-2 pb-2 text-center">ID</th>
                  <th className="px-3 pb-2">Nombre</th>
                  <th className="px-3 pb-2">Duración (min)</th>
                  <th className="px-3 pb-2">Precio</th>
                  {isAdmin ? <th className="px-3 pb-2 text-right">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {services.map((service, idx) => {
                  const rowSaving = Boolean(isSaving[service.id])
                  const rowDeleting = Boolean(isDeleting[service.id])
                  const isEditing = editingId === service.id

                  return (
                    <tr key={service.id ?? idx} className="border-t border-neutral-800 align-top">
                      <td className="w-20 min-w-20 px-2 py-3 text-center">{service.id ?? "-"}</td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.name}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        ) : (
                          service.name ?? "-"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <select
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.durationMinutes}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                          >
                            <option value="">Duración</option>
                            {ALLOWED_DURATIONS.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          service.duration_minutes ?? service.duration ?? "-"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.price}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, price: e.target.value }))}
                          />
                        ) : (
                          service.price ?? "-"
                        )}
                      </td>
                      {isAdmin ? (
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onSaveEdit(service.id)}
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
                                onClick={() => onStartEdit(service)}
                                disabled={rowSaving || rowDeleting}
                                className="rounded-md bg-neutral-800 px-3 py-1 text-xs hover:bg-neutral-700 disabled:opacity-60"
                              >
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDelete(service.id)}
                              disabled={rowSaving || rowDeleting || !service.id}
                              className="rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-60"
                            >
                              {rowDeleting ? "Eliminando..." : "Eliminar"}
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
      )}
    </div>
  )
}
