```md
# Turnero Frontend (React + Vite)

Frontend del sistema **Turnero** (white-label) con:
- UI Admin (gestión de clientes, servicios, turnos)
- UI Cliente (ver servicios, disponibilidad y reservar turnos)
- Theme toggle (claro / oscuro)
- Branding por preset (ej. **Experiencia Kala**)

---

## Stack
- React + Vite
- CSS (tokens/variables de branding)
- Integración con API Turnero (FastAPI)

---

## Requisitos
- Node.js 18+ (recomendado)
- npm

---

## Instalación

```bash
npm install
```

--- 

## Variables de Entorno
### Crear/editar .env:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
# Branding preset: default | kala
VITE_BRAND_PRESET=kala
```

VITE_BRAND_PRESET=kala activa el look “Experiencia Kala”.
Si lo dejás vacío o default, queda genérico.

---

## Ejecutar en desarrollo
```bash
npm run dev
```
Abrir:
* http://localhost:5173

---

## Build/Preview
```bash
npm run build
npm run preview
```

---

# Assets / Branding
Estructura
* src/branding/ → lógica de presets y aplicación a variables CSS
* src/assets/branding/kala/ → logo e imágenes para el preset Kala

Ejemplo:
* src/assets/branding/kala/logo/logo_Kala.png
* src/assets/branding/kala/services/*.jpeg

---
# Checklist rapido de prueba
## Cliente
* Login → abre en Servicios
* Cards de servicios con imagen correcta
* Calendario muestra disponibilidad (semana)
* Mis turnos: próximo + concluidos (desplegable)
* Footer con contacto (WhatsApp / email / ubicación / Instagram)

## General
* Theme toggle claro/oscuro con buen contraste
* Admin: CRUD funcionando sin romper layout

# Deploy (Demo)
## Recomendado:
* Frontend: Vercel / Netlify
* Backend: Render / Railway / Fly.io
* DB: Neon / Supabase / Railway

En deploy, setear:
* VITE_API_BASE_URL apuntando al backend público
* VITE_BRAND_PRESET=kala (o default)