import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  apiGoogleCalendarConnect,
  apiGoogleCalendarDisconnect,
  apiGoogleCalendarStatus,
} from "../lib/api"
import { getToken } from "../lib/auth"

function isConnectedStatus(data) {
  if (typeof data?.connected === "boolean") return data.connected
  if (typeof data?.is_connected === "boolean") return data.is_connected
  if (typeof data?.status === "string") return data.status.toLowerCase() === "connected"
  return false
}

function getAuthUrl(data) {
  if (typeof data === "string") return data
  if (typeof data?.auth_url === "string") return data.auth_url
  if (typeof data?.url === "string") return data.url
  return ""
}

export default function IntegrationsPage() {
  const token = getToken()
  const [searchParams, setSearchParams] = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState("")
  const [showConnectedToast, setShowConnectedToast] = useState(false)

  async function loadStatus({ manual = false } = {}) {
    setError("")
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await apiGoogleCalendarStatus(token)
      setConnected(isConnectedStatus(data))
    } catch (err) {
      setError(err?.message || "No se pudo consultar el estado de Google Calendar.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function onConnect() {
    if (connecting) return

    setError("")
    setConnecting(true)
    try {
      const data = await apiGoogleCalendarConnect(token)
      const authUrl = getAuthUrl(data)

      if (!authUrl) {
        throw new Error("No se recibió URL de autorización de Google Calendar.")
      }

      window.location.href = authUrl
    } catch (err) {
      setError(err?.message || "No se pudo iniciar la conexión con Google Calendar.")
      setConnecting(false)
    }
  }

  async function onDisconnect() {
    if (disconnecting || !connected) return

    setError("")
    setDisconnecting(true)
    try {
      await apiGoogleCalendarDisconnect(token)
      setConnected(false)
    } catch (err) {
      setError(err?.message || "No se pudo desconectar Google Calendar.")
    } finally {
      setDisconnecting(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  useEffect(() => {
    if (searchParams.get("google") !== "connected") return

    setShowConnectedToast(true)
    const hideTimer = window.setTimeout(() => setShowConnectedToast(false), 4000)

    const params = new URLSearchParams(searchParams)
    params.delete("google")
    setSearchParams(params, { replace: true })

    return () => window.clearTimeout(hideTimer)
  }, [searchParams, setSearchParams])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Integraciones</h1>

      {showConnectedToast ? (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          Google Calendar conectado.
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Google Calendar</h2>
          <button
            type="button"
            onClick={() => loadStatus({ manual: true })}
            disabled={loading || refreshing || connecting || disconnecting}
            className="rounded-md bg-neutral-800/60 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        {loading ? (
          <p className="mt-4 text-neutral-400">Cargando estado...</p>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
              <p className="text-sm text-neutral-300">Estado Google Calendar</p>
              <p className={`mt-1 font-medium ${connected ? "text-emerald-300" : "text-neutral-200"}`}>
                {connected ? "Conectado" : "No conectado"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onConnect}
                disabled={connecting || disconnecting}
                className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-60"
              >
                {connecting ? "Redirigiendo..." : "Conectar Google Calendar"}
              </button>

              <button
                type="button"
                onClick={onDisconnect}
                disabled={!connected || disconnecting || connecting}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 disabled:opacity-50"
              >
                {disconnecting ? "Desconectando..." : "Desconectar"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
