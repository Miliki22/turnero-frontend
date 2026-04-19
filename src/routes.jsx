import { createBrowserRouter, Navigate } from "react-router-dom"
import AppLayout from "./layouts/AppLayout"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import DashboardPage from "./pages/DashboardPage"
import ClientsPage from "./pages/ClientsPage"
import ServicesPage from "./pages/ServicesPage"
import AppointmentsPage from "./pages/AppointmentsPage"
import MyAppointmentsPage from "./pages/MyAppointmentsPage"
import RequireAuth from "./components/RequireAuth"
import RequireRole from "./components/RequireRole"
import { getCachedMe, getDefaultPathByRole } from "./lib/auth"

function HomeRedirect() {
  const me = getCachedMe()
  return <Navigate to={getDefaultPathByRole(me?.role)} replace />
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        path: "/",
        element: (
          <RequireAuth>
            <HomeRedirect />
          </RequireAuth>
        ),
      },
      {
        path: "/dashboard",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin"]} fallbackTo="/my-appointments">
              <DashboardPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "/clients",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin"]} fallbackTo="/my-appointments">
              <ClientsPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "/appointments",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["admin"]} fallbackTo="/my-appointments">
              <AppointmentsPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "/services",
        element: (
          <RequireAuth>
            <ServicesPage />
          </RequireAuth>
        ),
      },
      {
        path: "/my-appointments",
        element: (
          <RequireAuth>
            <RequireRole allowedRoles={["client"]} fallbackTo="/dashboard">
              <MyAppointmentsPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
    ],
  },
])
