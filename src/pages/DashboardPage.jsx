import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiMe } from "../lib/api"
import { getToken, getCachedMe, setCachedMe, clearToken } from "../lib/auth"

export default function DashboardPage() {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const nav = navigate
    const token = getToken()
    const cached = getCachedMe()

    if (cached) {
      setMe(cached)
      setLoading(false)
      // revalidate in background
      apiMe(token)
        .then((res) => {
          setMe(res)
          setCachedMe(res)
        })
        .catch(() => {
          // invalid token -> force logout
          clearToken()
          nav("/login", { replace: true })
        })
      return
    }

    apiMe(token)
      .then((res) => setMe(res))
      .catch((err) => setError(err.message || "No se pudo cargar"))
      .finally(() => setLoading(false))
  }, [])

  const roleLabel = (r) => {
    if (!r) return ""
    if (r === "admin") return "administrador"
    return r
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        {loading ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : me ? (
          <>
            <p className="text-neutral-300">Sesión OK ✅</p>
            <div className="mt-3 text-sm text-neutral-200">
              <div>
                <strong>Email:</strong> {me.email}
              </div>
              <div>
                <strong>Rol:</strong> {roleLabel(me.role)}
              </div>
            </div>
          </>
        ) : (
          <p className="text-neutral-400">No hay datos</p>
        )}
      </div>
    </div>
  )
}