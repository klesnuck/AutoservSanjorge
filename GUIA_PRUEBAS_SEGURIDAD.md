# Guía de Pruebas de Seguridad (OWASP Top 10) — AutoServicio San Jorge

Documento de pruebas manuales y automatizadas para validar los 7 rubros de seguridad marcados en clase sobre el proyecto **AutoServicio San Jorge** (`backend` en `http://localhost:4000` y `taller-frontend` en `http://localhost:5173`).

---

## Requisitos Previos

1. Levantar el **backend** (puerto `4000`):
   ```powershell
   cd backend
   npm run dev
   ```
2. Levantar el **frontend** (puerto `5173`):
   ```powershell
   cd taller-frontend
   npm run dev
   ```
3. Tener disponible **PowerShell** (con `curl.exe` o `Invoke-RestMethod`), **Postman / Thunder Client** y las **DevTools del navegador** (`F12` → pestañas *Network* y *Console*).

---

## 1. Diseño Inseguro (OWASP A04) — *17 Nov*

### Prueba 1.1: Acceso directo a rutas críticas sin autenticación
- **Objetivo:** Verificar que el backend no dependa únicamente de ocultar pantallas en React, sino que proteja sus endpoints con JWT y RBAC.
- **Cómo probarlo:**
  ```powershell
  curl.exe -i http://localhost:4000/api/productos
  curl.exe -i -X DELETE http://localhost:4000/api/productos/9999
  curl.exe -i http://localhost:4000/api/reportes/ventas
  ```
- **Resultado esperado (seguro):** Respuesta `401 Unauthorized` si no hay token, o `403 Forbidden` si el rol no es `Administrador`.
- **Evidencia si falla:** Responde `200 OK` o `404 Producto no encontrado` sin pedir token (indica ruta desprotegida).

### Prueba 1.2: Bypass de autenticación multifactor (MFA)
- **Objetivo:** Comprobar que un atacante no pueda saltarse el segundo factor manipulando el cuerpo JSON del login.
- **Cómo probarlo:**
  ```powershell
  curl.exe -i -X POST http://localhost:4000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"email":"admin@admin.com","password":"admin123","skipMfa":true}'
  ```
- **Resultado esperado (seguro):** El servidor debe **ignorar** `skipMfa` enviado por el cliente y exigir el código OTP (`mfaRequired: true`).
- **Evidencia si falla:** Devuelve directamente el `token` JWT sin pedir verificación MFA.

### Prueba 1.3: Protección contra fuerza bruta (Rate Limiting)
- **Objetivo:** Verificar que el límite de peticiones (`authLimiter`: 15 intentos / 15 min) bloquee intentos masivos.
- **Cómo probarlo:**
  ```powershell
  1..17 | ForEach-Object {
    $res = curl.exe -s -o NUL -w "%{http_code}" -X POST http://localhost:4000/api/auth/login `
      -H "Content-Type: application/json" `
      -d '{"email":"admin@admin.com","password":"wrongpassword"}'
    Write-Output "Intento $_ -> HTTP $res"
  }
  ```
- **Resultado esperado (seguro):** A partir del intento 16 debe responder `429 Too Many Requests`.

### Prueba 1.4: Reglas de negocio (valores negativos en inventario/precios)
- **Objetivo:** Confirmar que el backend rechace datos lógicamente inválidos aunque se salten las validaciones HTML del frontend.
- **Cómo probarlo:**
  ```powershell
  curl.exe -i -X POST http://localhost:4000/api/productos `
    -H "Content-Type: application/json" `
    -d '{"nombre":"Prueba Negativo","precio_venta":-500,"stock_actual":-10,"sku":"TEST-NEG-1"}'
  ```
- **Resultado esperado (seguro):** Respuesta `400 Bad Request` rechazando precios o stock negativos.

---

## 2. Configuración Defectuosa (OWASP A05) — *17 Nov*

### Prueba 2.1: Cabeceras de seguridad HTTP (`Helmet` y ocultamiento de tecnología)
- **Objetivo:** Comprobar que el servidor incluye cabeceras defensivas y no expone `X-Powered-By: Express`.
- **Cómo probarlo:**
  ```powershell
  curl.exe -I http://localhost:4000/
  ```
- **Resultado esperado (seguro):**
  - **No existe** `X-Powered-By`.
  - **Existen** cabeceras de `Helmet`: `X-Content-Type-Options: nosniff`, `X-Frame-Options` / `Content-Security-Policy`, `Referrer-Policy`, `Strict-Transport-Security`.

### Prueba 2.2: Política de CORS restrictiva
- **Objetivo:** Verificar que un dominio externo no autorizado no reciba permiso CORS.
- **Cómo probarlo:**
  ```powershell
  curl.exe -i -H "Origin: https://sitio-malicioso.com" http://localhost:4000/api/productos
  ```
- **Resultado esperado (seguro):** No debe devolver `Access-Control-Allow-Origin: *` ni reflejar `https://sitio-malicioso.com`. Solo deben permitirse los orígenes configurados (ej. `http://localhost:5173` y el dominio de producción).

### Prueba 2.3: Exposición de información interna en errores y `/api/health`
- **Objetivo:** Confirmar que no se filtren stack traces, errores de BD ni rutas internas.
- **Cómo probarlo:**
  ```powershell
  curl.exe -i http://localhost:4000/api/ruta-inexistente
  curl.exe -i http://localhost:4000/api/health
  ```
- **Resultado esperado (seguro):**
  - La ruta inexistente responde `404` JSON controlado sin stack trace.
  - `/api/health` solo responde estado básico (`{ "status": "ok" }`) sin exponer `dbError`, `hasDbUrl` ni variables de entorno.

### Prueba 2.4: Secretos y credenciales por defecto
- **Objetivo:** Verificar que no existan secretos hardcodeados ni contraseñas débiles por defecto.
- **Cómo probarlo:** Revisar en código:
  - `backend/middleware/auth.js` → `JWT_SECRET` debe venir obligatoriamente de `.env` (sin fallback hardcodeado en producción).
  - `backend/index.js` → No crear `admin@admin.com` con contraseña débil (`admin123`) hardcodeada en producción.

### Prueba 2.5: Límite de tamaño de payload JSON
- **Objetivo:** Evitar ataques de denegación de servicio enviando cuerpos JSON enormes.
- **Cómo probarlo:** Enviar un JSON mayor a `100kb` a cualquier endpoint `POST`.
- **Resultado esperado (seguro):** Respuesta `413 Payload Too Large`.

---

## 3. Componentes Vulnerables y Desactualizados (OWASP A06) — *17 Nov*

### Prueba 3.1: Auditoría de dependencias del backend
- **Objetivo:** Detectar CVEs conocidos en los paquetes de Node.js del servidor.
- **Cómo probarlo:**
  ```powershell
  cd backend
  npm audit
  npm outdated
  ```
- **Resultado esperado (seguro):** `0 vulnerabilities` (o cero vulnerabilidades `high`/`critical`, y plan documentado si alguna es transitiva).

### Prueba 3.2: Auditoría de dependencias del frontend
- **Objetivo:** Detectar vulnerabilidades en dependencias de React/Vite.
- **Cómo probarlo:**
  ```powershell
  cd taller-frontend
  npm audit
  npm outdated
  ```
- **Resultado esperado (seguro):** `0 vulnerabilities` en niveles `high` y `critical`.

### Prueba 3.3: Limpieza de dependencias innecesarias y automatización en CI
- **Objetivo:** Reducir superficie de ataque eliminando paquetes sin uso y validando automáticamente en cada commit.
- **Cómo probarlo:**
  - Verificar que paquetes no utilizados (por ejemplo `mysql2` en `backend/package.json` cuando se usa PostgreSQL `pg`) hayan sido removidos.
  - Verificar que `.gitlab-ci.yml` o `.github/workflows/ci.yml` incluya un paso `npm audit --audit-level=high`.

---

## 4. Fallas de Identificación y Autenticación (OWASP A07) — *18 Nov*

### Prueba 4.1: Política de contraseñas robustas
- **Objetivo:** Validar que no se permitan contraseñas débiles en el registro.
- **Cómo probarlo:**
  ```powershell
  curl.exe -i -X POST http://localhost:4000/api/auth/register `
    -H "Content-Type: application/json" `
    -d '{"name":"Usuario Prueba","email":"debil@test.com","password":"1234567"}'
  ```
- **Resultado esperado (seguro):** Respuesta `400 Bad Request` exigiendo mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.

### Prueba 4.2: Prevención de enumeración de usuarios
- **Objetivo:** Comprobar que el login y registro no confirmen fácilmente qué correos existen en la base de datos.
- **Cómo probarlo:**
  1. Probar login con correo inexistente y con correo existente + contraseña errónea.
  2. Comparar código HTTP y mensaje de respuesta.
- **Resultado esperado (seguro):** Mismo mensaje genérico (`Correo o contraseña incorrectos`) y código `401` en ambos casos.

### Prueba 4.3: Validación de integridad y expiración del JWT
- **Objetivo:** Confirmar que el servidor rechaza tokens manipulados, firmados con otra clave o expirados.
- **Cómo probarlo:**
  ```powershell
  # Sin token
  curl.exe -i http://localhost:4000/api/auth/me

  # Con token alterado
  curl.exe -i -H "Authorization: Bearer token.falso.123" http://localhost:4000/api/auth/me
  ```
- **Resultado esperado (seguro):** `401 Unauthorized` sin token y `403 Forbidden` con token inválido o expirado.

### Prueba 4.4: Seguridad del segundo factor (MFA / OTP)
- **Objetivo:** Verificar que el código OTP sea criptográficamente seguro, no se filtre en la respuesta ni se pueda adivinar por fuerza bruta.
- **Cómo probarlo:**
  1. Hacer login en `POST /api/auth/login` y revisar la respuesta JSON: en producción **no debe incluir** `otpDev`.
  2. Enviar 5 códigos incorrectos a `POST /api/auth/verify-mfa` con el mismo `tempToken`.
  3. Reutilizar un código OTP ya validado o uno con más de 5 minutos.
- **Resultado esperado (seguro):**
  - El OTP se genera con `crypto.randomInt(100000, 1000000)` (no `Math.random()`).
  - La sesión MFA se invalida tras demasiados intentos fallidos o al expirar los 5 minutos.
  - Un código ya usado no puede reutilizarse.

---

## 5. Fallas de Integridad de Software y Datos (OWASP A08)

### Prueba 5.1: Integridad de dependencias y pipeline CI/CD
- **Objetivo:** Garantizar que las dependencias instaladas coincidan exactamente con los hashes del lockfile.
- **Cómo probarlo:**
  - Verificar el uso de `npm ci` (en lugar de `npm install`) en `.gitlab-ci.yml` y `Dockerfile`.
  - Comprobar que `package-lock.json` está versionado en Git tanto en `backend` como en `taller-frontend`.

### Prueba 5.2: Manipulación de precios/totales desde el cliente
- **Objetivo:** Comprobar que el backend recalcula totales consultando la base de datos y no confía ciegamente en el `total` o `precio_unitario` enviado desde el navegador.
- **Cómo probarlo:**
  ```powershell
  curl.exe -i -X POST http://localhost:4000/api/ventas `
    -H "Content-Type: application/json" `
    -d '{"idUsuarios":1,"metodo_pago":1,"total":1,"items":[{"idProductos":1,"cantidad":5,"precio_unitario":0.01}]}'
  ```
- **Resultado esperado (seguro):** El backend ignora el precio/total manipulado del cliente, consulta el `precio_venta` real en la tabla `Productos` y calcula el total en el servidor (o rechaza la petición si no coincide).

### Prueba 5.3: Integridad de recursos externos (SRI) y validación de payloads
- **Objetivo:** Evitar inyección de campos no autorizados (*mass assignment*) y ejecución de scripts externos alterados.
- **Cómo probarlo:**
  - Intentar enviar `"role": "Administrador"` o `"idRoles": 1` en `POST /api/auth/register`.
  - Revisar `taller-frontend/index.html` para confirmar que no cargue scripts externos sin atributo `integrity` (SRI).
- **Resultado esperado (seguro):** El registro siempre asigna el rol `Cliente` ignorando cualquier campo `role`/`idRoles` del body.

---

## 6. Fallas de Registro y Monitoreo de Seguridad (OWASP A09)

### Prueba 6.1: Registro de eventos de seguridad (autenticación y acceso denegado)
- **Objetivo:** Verificar que los eventos críticos de seguridad queden registrados con fecha/hora, IP, usuario y resultado.
- **Cómo probarlo:**
  1. Realizar 3 intentos de login fallidos.
  2. Hacer un login exitoso y verificar MFA.
  3. Intentar acceder sin token a un endpoint protegido (`401`) y con rol insuficiente (`403`).
  4. Consultar la bitácora (archivo de logs o tabla `AuditLogs` en PostgreSQL).
- **Resultado esperado (seguro):** Todos los eventos anteriores aparecen registrados con `timestamp`, `ip`, `endpoint`, `userId/email`, `evento` y `resultado`.

### Prueba 6.2: Auditoría de cambios críticos en el sistema
- **Objetivo:** Confirmar trazabilidad en operaciones sensibles (CRUD de productos, usuarios, roles, ventas y compras).
- **Cómo probarlo:** Crear, modificar y eliminar un producto o cambiar el rol de un usuario; luego revisar la bitácora.
- **Resultado esperado (seguro):** Queda evidencia de **quién** hizo el cambio, **qué** recurso modificó y **cuándo**.

### Prueba 6.3: No exposición de datos sensibles en los logs
- **Objetivo:** Asegurar que los logs no filtren contraseñas, tokens JWT ni códigos MFA.
- **Cómo probarlo:** Revisar la salida de la consola del backend y archivos de log tras ejecutar login, registro y MFA.
- **Resultado esperado (seguro):** **No aparece** ningún `password`, `token` JWT ni código `mfaCode` en texto plano en los logs.

---

## 7. Server-Side Request Forgery — SSRF (OWASP A10)

### Prueba 7.1: Bloqueo de direcciones internas y localhost
- **Objetivo:** Verificar que cualquier endpoint que acepte una URL (por ejemplo imagen de factura, webhook o consulta externa) bloquee direcciones locales o de red interna.
- **Cómo probarlo:** Enviar las siguientes URLs como entrada en el campo URL del endpoint correspondiente:
  - `http://127.0.0.1:4000/api/health`
  - `http://localhost:5432`
  - `http://10.0.0.1/`
  - `http://192.168.1.1/`
- **Resultado esperado (seguro):** Respuesta `400 Bad Request` bloqueando la solicitud antes de que el servidor haga ninguna conexión saliente.

### Prueba 7.2: Bloqueo de endpoints de metadatos en la nube
- **Objetivo:** Evitar robo de credenciales en entornos cloud (AWS/GCP/Azure).
- **Cómo probarlo:** Enviar `http://169.254.169.254/latest/meta-data/` en el campo URL.
- **Resultado esperado (seguro):** Bloqueado con `400 Bad Request` por pertenecer al rango link-local `169.254.0.0/16`.

### Prueba 7.3: Bloqueo de protocolos peligrosos y lista blanca de dominios
- **Objetivo:** Confirmar que solo se aceptan URLs `https://` hacia dominios explícitamente permitidos.
- **Cómo probarlo:** Enviar:
  - `file:///etc/passwd`
  - `ftp://servidor.com/archivo`
  - `https://dominio-no-autorizado.com/imagen.png`
- **Resultado esperado (seguro):** Todas las peticiones son rechazadas con `400 Bad Request`; únicamente pasan URLs `https://` de dominios en la lista blanca configurada.

---

## Checklist de Revisión con la Maestra

| ID | Categoría OWASP | Prueba | Cumple | Evidencia / Observaciones |
| :---: | :--- | :--- | :---: | :--- |
| 1.1 | A04 Diseño Inseguro | Rutas críticas protegidas con JWT + RBAC | [ ] | |
| 1.2 | A04 Diseño Inseguro | Bloqueo de bypass `skipMfa` desde cliente | [ ] | |
| 1.3 | A04 Diseño Inseguro | Rate limiting activo (`429`) | [ ] | |
| 1.4 | A04 Diseño Inseguro | Rechazo de precios/stock negativos | [ ] | |
| 2.1 | A05 Config Defectuosa | Cabeceras `Helmet` y sin `X-Powered-By` | [ ] | |
| 2.2 | A05 Config Defectuosa | CORS restringido a orígenes válidos | [ ] | |
| 2.3 | A05 Config Defectuosa | 404/500 y `/api/health` sin fugas | [ ] | |
| 2.4 | A05 Config Defectuosa | Sin secretos/credenciales hardcodeadas | [ ] | |
| 2.5 | A05 Config Defectuosa | Límite de tamaño de payload JSON | [ ] | |
| 3.1 | A06 Comp. Vulnerables | `npm audit` limpio en `backend` | [ ] | |
| 3.2 | A06 Comp. Vulnerables | `npm audit` limpio en `taller-frontend` | [ ] | |
| 3.3 | A06 Comp. Vulnerables | Sin paquetes sobrantes y auditoría en CI | [ ] | |
| 4.1 | A07 Identificación | Contraseñas robustas obligatorias | [ ] | |
| 4.2 | A07 Identificación | Sin enumeración de usuarios | [ ] | |
| 4.3 | A07 Identificación | Rechazo de JWT inválido/expirado | [ ] | |
| 4.4 | A07 Identificación | OTP con `crypto.randomInt`, límite de intentos, sin `otpDev` | [ ] | |
| 5.1 | A08 Integridad | `npm ci` + `package-lock.json` en CI/Docker | [ ] | |
| 5.2 | A08 Integridad | Totales/precios recalculados en servidor | [ ] | |
| 5.3 | A08 Integridad | Sin mass assignment de roles y SRI revisado | [ ] | |
| 6.1 | A09 Registro | Logs de logins, fallos MFA y 401/403 | [ ] | |
| 6.2 | A09 Registro | Auditoría de cambios críticos | [ ] | |
| 6.3 | A09 Registro | Sin secretos ni OTP en consola/logs | [ ] | |
| 7.1 | A10 SSRF | Bloqueo de `127.0.0.1`, `localhost` e IPs privadas | [ ] | |
| 7.2 | A10 SSRF | Bloqueo de metadatos cloud (`169.254.169.254`) | [ ] | |
| 7.3 | A10 SSRF | Lista blanca de dominios y solo `https://` | [ ] | |
