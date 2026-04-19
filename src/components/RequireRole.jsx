import { Navigate } from "react-router-dom"
import { getCachedMe, getDefaultPathByRole } from "../lib/auth"

export default function RequireRole({ allowedRoles, children, fallbackTo }) {
  const me = getCachedMe()

  if (!me?.role) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(me.role)) {
    return <Navigate to={fallbackTo || getDefaultPathByRole(me.role)} replace />
  }

  return children
}
