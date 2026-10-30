# syntax=docker/dockerfile:1

# =============================================================================
# AutoservSanJorge - Dockerfile único con múltiples etapas
#
# Etapas finales (targets):
#   backend   -> API Express (Node.js 22) en el puerto 4000
#   frontend  -> compilación de Vite servida por nginx en el puerto 80
#
# Ejemplos:
#   docker build --target backend  -t autoservsanjorge-backend:1.0.0  .
#   docker build --target frontend -t autoservsanjorge-frontend:1.0.0 .
# =============================================================================


# -----------------------------------------------------------------------------
# Frontend: instalación de dependencias
# -----------------------------------------------------------------------------
FROM node:22-alpine AS frontend-deps
WORKDIR /app/taller-frontend
COPY taller-frontend/package.json taller-frontend/package-lock.json ./
RUN npm ci


# -----------------------------------------------------------------------------
# Frontend: compilación de la aplicación Vite
#
# VITE_API_URL y VITE_API_BASE se dejan vacías a propósito: así la aplicación
# usa rutas relativas /api/... y nginx las redirige al contenedor backend.
# -----------------------------------------------------------------------------
FROM frontend-deps AS frontend-build
COPY taller-frontend/ ./
ARG VITE_API_URL=""
ARG VITE_API_BASE=""
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_API_BASE=${VITE_API_BASE}
RUN npm run build


# -----------------------------------------------------------------------------
# Frontend: imagen de ejecución (nginx)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS frontend
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/taller-frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1


# -----------------------------------------------------------------------------
# Backend: instalación de dependencias de producción
# -----------------------------------------------------------------------------
FROM node:22-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev


# -----------------------------------------------------------------------------
# Backend: imagen de ejecución (Express)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS backend
ENV NODE_ENV=production
WORKDIR /app/backend

RUN addgroup -S app && adduser -S app -G app

COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY --chown=app:app backend/ ./

USER app

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/health').then(r => r.json()).then(b => process.exit(b.dbStatus === 'connected' ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "index.js"]
