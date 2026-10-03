# 🚀 Guía de Despliegue en Vercel (Frontend + Backend Express + Supabase)

Hemos configurado el proyecto con una estructura **Monorepo / Serverless**, permitiendo desplegar tanto el frontend (Vite React) como el backend (Express API) dentro de **Vercel** usando un solo repositorio.

---

## 📁 Archivos de Configuración Creados

1. `vercel.json` (en la raíz): Define las rutas del frontend, el fallback para el router de React (SPA) y la función serverless de Node.js para la API.
2. `api/index.js` (en la raíz): Conecta las peticiones `/api/*` directamente a la aplicación Express en `backend/index.js`.
3. `backend/db.js`: Soporta conexiones SSL obligatorias para Supabase y cadenas de conexión por variable de entorno.

---

## ⚙️ Pasos para Desplegar en Vercel

### Paso 1: Subir tus cambios a GitHub
Asegúrate de guardar y hacer `push` de los cambios en tu repositorio de GitHub (`https://github.com/ig2005cd/sanjorge.git`):

```bash
git add .
git commit -m "Configuración para Supabase y despliegue en Vercel"
git push origin main
```

---

### Paso 2: Importar el Proyecto en Vercel
1. Ingresa a tu panel de [Vercel](https://vercel.com/dashboard).
2. Haz clic en **Add New...** -> **Project**.
3. Importa tu repositorio `ig2005cd/sanjorge`.
4. En **Framework Preset**, selecciona **Vite** (o deja **Other**, el archivo `vercel.json` se encargará de la configuración).
5. **Root Directory**: Déjalo en `./` (la raíz del repositorio).

---

### Paso 3: Configurar las Variables de Entorno en Vercel
Antes de hacer clic en **Deploy**, ve a la sección **Environment Variables** en el panel de Vercel y añade:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgres://postgres.[REF]:[PASS]@...pooler.supabase.com:6543/postgres` | URI de conexión a Supabase (Transaction Pooler / Direct) |
| `DB_SSL` | `true` | Habilita SSL requerido por Supabase |
| `NODE_ENV` | `production` | Entorno de producción |

*(Opcional: Si deseas especificar la URL del API en el frontend, puedes agregar `VITE_API_URL=`, pero por defecto al estar en la misma app de Vercel, las peticiones relativas `/api/...` funcionan automáticamente).*

---

### Paso 4: Desplegar
Haz clic en **Deploy**. Vercel compilará el frontend y desplegará el backend como función serverless.

---

## ❓ Solución a Problemas Frecuentes

- **Error 404 al recargar páginas secundarias (ej: /citas, /ventas)**:
  Resuelto con las reglas de reescritura SPA en `vercel.json`.
- **Error `no pg_hba.conf entry for host`**:
  Ocurre si no configuras `DB_SSL=true`. Asegúrate de que `DB_SSL=true` esté agregado en las variables de entorno de Vercel.
- **Error de conexión a la BD / Timeout**:
  Asegúrate de estar usando el **Transaction Pooler** de Supabase (Puerto `6543`) en `DATABASE_URL`.
