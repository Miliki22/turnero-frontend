const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

async function apiRequest(path, { method = "GET", token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers["Content-Type"] = "application/json"

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const contentType = res.headers.get("content-type") || ""
  let data = null
  if (contentType.includes("application/json")) data = await res.json()

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      const message = data?.detail || "Unauthorized"
      const err = new Error(message)
      err.status = res.status
      throw err
    }

    const message = data?.detail || "Ocurrio un error al comunicarse con la API."
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  return data
}

export async function apiLogin(email, password) {
  return apiRequest("/api/v1/auth/login", { method: "POST", body: { email, password } })
}

export async function apiMe(token) {
  return apiRequest("/api/v1/auth/me", { method: "GET", token })
}

export async function apiListClients(token) {
  return apiRequest("/api/v1/clients", { method: "GET", token })
}

export async function apiCreateClient(token, payload) {
  return apiRequest("/api/v1/clients", { method: "POST", token, body: payload })
}

export async function apiUpdateClient(token, clientId, payload) {
  return apiRequest(`/api/v1/clients/${clientId}`, { method: "PATCH", token, body: payload })
}

export async function apiDeleteClient(token, clientId) {
  return apiRequest(`/api/v1/clients/${clientId}`, { method: "DELETE", token })
}

export async function apiListServices(token) {
  return apiRequest("/api/v1/services", { method: "GET", token })
}

export async function apiCreateService(token, payload) {
  return apiRequest("/api/v1/services", { method: "POST", token, body: payload })
}

export async function apiUpdateService(token, serviceId, payload) {
  return apiRequest(`/api/v1/services/${serviceId}`, { method: "PATCH", token, body: payload })
}

export async function apiDeleteService(token, serviceId) {
  return apiRequest(`/api/v1/services/${serviceId}`, { method: "DELETE", token })
}

export async function apiListAppointments(token) {
  return apiRequest("/api/v1/appointments", { method: "GET", token })
}

export async function apiCreateAppointment(token, payload) {
  return apiRequest("/api/v1/appointments", { method: "POST", token, body: payload })
}

export async function apiUpdateAppointment(token, appointmentId, payload) {
  return apiRequest(`/api/v1/appointments/${appointmentId}`, { method: "PATCH", token, body: payload })
}

export async function apiDeleteAppointment(token, appointmentId) {
  return apiRequest(`/api/v1/appointments/${appointmentId}`, { method: "DELETE", token })
}

export default {
  apiRequest,
  apiLogin,
  apiMe,
  apiListClients,
  apiCreateClient,
  apiUpdateClient,
  apiDeleteClient,
  apiListServices,
  apiCreateService,
  apiUpdateService,
  apiDeleteService,
  apiListAppointments,
  apiCreateAppointment,
  apiUpdateAppointment,
  apiDeleteAppointment,
}
