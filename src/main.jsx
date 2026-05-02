import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import "./index.css"
import { router } from "./routes"
import { initTheme } from "./lib/theme"
import { applyBrandToCssVars, getBrand } from "./branding"

initTheme()
applyBrandToCssVars(getBrand())

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
