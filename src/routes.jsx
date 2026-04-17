import { createBrowserRouter, Navigate } from "react-router-dom"
import AppLayout from "./layouts/AppLayout"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import ClientsPage from "./pages/ClientsPage"
import ServicesPage from "./pages/ServicesPage"
import AppointmentsPage from "./pages/AppointmentsPage"
import RequireAuth from "./components/RequireAuth"

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        path: "/",
        element: (
          <RequireAuth>
            <Navigate to="/dashboard" replace />
          </RequireAuth>
        ),
      },
      {
        path: "/dashboard",
        element: (
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: "/clients",
        element: (
          <RequireAuth>
            <ClientsPage />
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
        path: "/appointments",
        element: (
          <RequireAuth>
            <AppointmentsPage />
          </RequireAuth>
        ),
      },
    ],
  },
])
