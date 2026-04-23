import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiCreateClient, apiDeleteClient, apiListClients, apiMe, apiUpdateClient } from "../lib/api"
import { getCachedMe, getToken, setCachedMe } from "../lib/auth"

function getList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const token = getToken()
  const cachedMe = getCachedMe()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({ fullName: "", email: "", phone: "", notes: "" })
  const [isSaving, setIsSaving] = useState({})
  const [isDeleting, setIsDeleting] = useState({})
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(cachedMe?.role === "admin")

  const canSubmit = useMemo(() => fullName.trim() !== "" && phone.trim() !== "", [fullName, phone])

  async function loadClients({ manual = false } = {}) {
    setError("")
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await apiListClients(token)
      setClients(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los clientes.")
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
    } catch {
      // RequireAuth handles invalid/expired token flow.
    }
  }

  function onStartEdit(client) {
    setEditingId(client.id)
    setEditValues({
      fullName: client.full_name ?? client.name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    })
  }

  function onCancelEdit() {
    setEditingId(null)
    setEditValues({ fullName: "", email: "", phone: "", notes: "" })
  }

  async function onSaveEdit(clientId) {
    if (!clientId || !isAdmin) return

    setError("")
    setIsSaving((prev) => ({ ...prev, [clientId]: true }))
    try {
      await apiUpdateClient(token, clientId, {
        full_name: editValues.fullName.trim(),
        email: editValues.email.trim() || null,
        phone: editValues.phone.trim(),
        notes: editValues.notes.trim() || null,
      })
      onCancelEdit()
      await loadClients()
    } catch (err) {
      setError(err?.message || "No se pudo editar el cliente.")
    } finally {
      setIsSaving((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  async function onDelete(clientId) {
    if (!clientId || !isAdmin) return

    setError("")
    setIsDeleting((prev) => ({ ...prev, [clientId]: true }))
    try {
      await apiDeleteClient(token, clientId)
      if (editingId === clientId) onCancelEdit()
      await loadClients()
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el cliente.")
    } finally {
      setIsDeleting((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    if (!canSubmit || !isAdmin || submitting) return

    let created = false
    setError("")
    setSubmitting(true)
    try {
      await apiCreateClient(token, {
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim(),
        notes: notes.trim() || null,
      })
      setFullName("")
      setEmail("")
      setPhone("")
      setNotes("")
      created = true
    } catch (err) {
      setError(err?.message || "No se pudo crear el cliente.")
    } finally {
      setSubmitting(false)
    }

    if (created) await loadClients()
  }

  useEffect(() => {
    loadMe()
    loadClients()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Clientes</h1>

      {isAdmin ? (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-lg font-medium">Crear cliente</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={onCreate}>
            <input
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
              placeholder="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Listado</h2>
          <button
            type="button"
            onClick={() => loadClients({ manual: true })}
            disabled={loading || refreshing}
            className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {loading ? <p className="mt-3 text-neutral-400">Cargando...</p> : null}
        {!loading && clients.length === 0 ? <p className="mt-3 text-neutral-400">Sin clientes.</p> : null}

        {!loading && clients.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Nombre</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Teléfono</th>
                  <th className="pb-2">Notas</th>
                  {isAdmin ? <th className="pb-2 text-right">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {clients.map((client, idx) => {
                  const rowSaving = Boolean(isSaving[client.id])
                  const rowDeleting = Boolean(isDeleting[client.id])
                  const isEditing = editingId === client.id

                  return (
                    <tr key={client.id ?? idx} className="border-t border-neutral-800 align-top">
                      <td className="py-3">{client.id ?? "-"}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.fullName}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, fullName: e.target.value }))}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/clients/${client.id}`)}
                            disabled={!client.id}
                            className="text-left text-neutral-100 underline decoration-neutral-600 underline-offset-2 hover:text-white disabled:no-underline disabled:opacity-50"
                          >
                            {client.full_name ?? client.name ?? "-"}
                          </button>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.email}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, email: e.target.value }))}
                          />
                        ) : (
                          client.email ?? "-"
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.phone}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, phone: e.target.value }))}
                          />
                        ) : (
                          client.phone ?? "-"
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
                            value={editValues.notes}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, notes: e.target.value }))}
                          />
                        ) : (
                          client.notes ?? "-"
                        )}
                      </td>
                      {isAdmin ? (
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              disabled={rowSaving || rowDeleting || !client.id}
                              className="rounded-md bg-neutral-800 px-3 py-1 text-xs hover:bg-neutral-700 disabled:opacity-60"
                            >
                              Ver
                            </button>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onSaveEdit(client.id)}
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
                                onClick={() => onStartEdit(client)}
                                disabled={rowSaving || rowDeleting}
                                className="rounded-md bg-neutral-800 px-3 py-1 text-xs hover:bg-neutral-700 disabled:opacity-60"
                              >
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDelete(client.id)}
                              disabled={rowSaving || rowDeleting || !client.id}
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
    </div>
  )
}
