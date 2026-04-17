import { useEffect, useMemo, useState } from "react"
import { apiCreateClient, apiListClients } from "../lib/api"
import { getToken } from "../lib/auth"

function getList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function ClientsPage() {
  const token = getToken()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const canSubmit = useMemo(() => name.trim().length > 0, [name])

  async function loadClients() {
    setError("")
    setLoading(true)
    try {
      const data = await apiListClients(token)
      setClients(getList(data))
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los clientes.")
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
      await apiCreateClient(token, {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      })
      setName("")
      setEmail("")
      setPhone("")
      await loadClients()
    } catch (err) {
      setError(err?.message || "No se pudo crear el cliente.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Clientes</h1>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-lg font-medium">Crear cliente</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
          <input
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none"
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
                </tr>
              </thead>
              <tbody>
                {clients.map((client, idx) => (
                  <tr key={client.id ?? idx} className="border-t border-neutral-800">
                    <td className="py-2">{client.id ?? "-"}</td>
                    <td className="py-2">{client.name ?? "-"}</td>
                    <td className="py-2">{client.email ?? "-"}</td>
                    <td className="py-2">{client.phone ?? "-"}</td>
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
