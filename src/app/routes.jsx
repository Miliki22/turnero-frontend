import { createBrowserRouter } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"
import LoginPage from "../pages/LoginPage"
import DashboardPage from "../pages/DashboardPage"
import ProtectedRoute from "../components/ProtectedRoute"

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])