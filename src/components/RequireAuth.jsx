import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { getToken, clearToken, getCachedMe, setCachedMe } from "../lib/auth"
import { apiMe } from "../lib/api"

export default function RequireAuth({ children }) {
  const token = getToken()
  const location = useLocation()
  const cached = getCachedMe()

  // if we have cached me, allow render immediately; otherwise wait for api
  const [ok, setOk] = useState(Boolean(cached && token))
  const [loading, setLoading] = useState(!cached && Boolean(token))

  useEffect(() => {
    let mounted = true
    if (!token) {
      setLoading(false)
      setOk(false)
      return
    }

    // If we have cached user, revalidate in background
    if (cached) {
      apiMe(token)
        .then((res) => {
          if (!mounted) return
          setCachedMe(res)
          setOk(true)
        })
        .catch(() => {
          if (!mounted) return
          clearToken()
          // on failure, mark not ok so the component redirects
          setOk(false)
        })
      return () => {
        mounted = false
      }
    }

    // No cached user: fetch and decide
    apiMe(token)
      .then((res) => {
        if (!mounted) return
        setCachedMe(res)
        setOk(true)
      })
      .catch(() => {
        if (!mounted) return
        clearToken()
        setOk(false)
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [token])

  if (!token && !loading) return <Navigate to="/login" replace state={{ from: location }} />
  if (loading) return <div className="p-6">Cargando...</div>
  if (!ok) return <Navigate to="/login" replace />
  return children
}
