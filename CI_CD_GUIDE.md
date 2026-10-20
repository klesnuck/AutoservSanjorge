# Pipeline de GitLab y Vercel

## Destinos

- GitLab: https://gitlab.com/sanjorge-group/AutoservSanjorge
- Vercel: https://vercel.com/ig2005cds-projects/autoservsanjorge

## Trigger y orden de jobs

El archivo `.gitlab-ci.yml` define tres etapas: `build`, `test` y `deploy`.

1. Un merge request dirigido a `main` ejecuta `compilar` y luego `pruebas`.
2. Un push a `main`, incluido el que resulta de completar un merge, ejecuta
   `compilar`, luego `pruebas` y finalmente `deploy_production`.
3. También puede iniciarse el flujo desde Build > Pipelines > New pipeline
   seleccionando `main`.
4. Un push a otra rama sin merge request no crea un pipeline con estas reglas.

`compilar` instala las dependencias con `npm ci`, ejecuta `npm run build` del
frontend y conserva `dist/` como artefacto durante siete días. `pruebas` necesita
que `compilar` termine correctamente y genera el reporte JUnit. Cada job ejecuta
su propia instalación porque los runners no comparten `node_modules`.

`needs: pruebas` exige que las pruebas pasen antes de desplegar. El job de
producción no usa `allow_failure` ni `when: always`. `resource_group: production`
evita publicar desde dos jobs de producción al mismo tiempo.

Dentro de `deploy_production` se ejecutan, en este orden:

- Comprobación de presencia de las tres variables de Vercel, sin imprimirlas.
- Instalación de Vercel CLI.
- `vercel pull --environment=production`: descarga ajustes y variables.
- `vercel build --prod`: construye frontend y funciones según Vercel.
- `vercel deploy --prebuilt --prod`: publica únicamente si el build terminó bien.

La compilación inicial valida el frontend también en merge requests, sin exponer
credenciales de producción. El build de Vercel se ejecuta adicionalmente en el job
de despliegue porque prepara tanto el frontend como las funciones serverless y
usa los ajustes y variables de producción. El artefacto `dist/` de la etapa
inicial es evidencia de compilación; no se utiliza como sustituto de
`.vercel/output` para el despliegue.

Los jobs usan una imagen Linux con Node.js 22. El `package.json` principal también
selecciona Node.js 22 para Vercel.

## Configuración externa requerida

- Un runner de GitLab habilitado, con capacidad para ejecutar jobs sin tags.
- Rama `main` protegida.
- Variables CI/CD `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`, protegidas
  y enmascaradas, con alcance `*` o compatible con `production`.
- El token debe tener acceso al equipo y al proyecto de destino.
- En Vercel, Root Directory debe ser la raíz del repositorio. Allí se encuentran
  `api/`, `backend/`, `package.json` y `vercel.json`.
- Variables de aplicación configuradas para Production en Vercel.

El `vercel.json` desactiva los despliegues automáticos de la integración Git para
que la publicación pase por las pruebas. También fija instalación con `npm ci`,
construcción con `npm run build` y salida `taller-frontend/dist`.
Se conservan las rutas actuales de API y frontend.

No se necesitan secretos de producción para las pruebas: las peticiones HTTP
se simulan en memoria y no acceden a la base de datos.

## Ejecutar localmente

Desde la raíz del proyecto, con Node.js 22 instalado:

```powershell
npm --prefix taller-frontend ci
npm test
npm --prefix taller-frontend run test:ci
npm run build
```

`npm test` ejecuta Vitest una vez. `test:ci` genera además
`taller-frontend/test-results/junit.xml`, que GitLab muestra como reporte de
pruebas y conserva durante siete días. Los reportes no se guardan en Git.

Los casos cubren consultas de citas y cotizaciones, envío JSON, actualización,
eliminación sin contenido, errores HTTP, errores de red y una URL de API externa.
Son pruebas unitarias de la capa de peticiones del frontend: no verifican por sí
solas la interfaz completa, los endpoints reales ni la base de datos.

No ejecutar `backend/test_auth.js` como parte del pipeline: modifica credenciales
en la base de datos.

## Publicar cambios

Si aún no existe el remoto de GitLab:

```powershell
git remote add gitlab https://gitlab.com/sanjorge-group/AutoservSanjorge.git
```

Con el acceso a GitLab autenticado, consultar primero sus cambios:

```powershell
git fetch gitlab
git log --oneline --left-right main...gitlab/main
```

Integrar cualquier cambio remoto antes de publicar; no usar force push. Si el
remoto no tiene cambios adicionales y el commit local está listo:

```powershell
git push gitlab main
```

Alternativamente, subir una rama y abrir un merge request hacia `main` para
validar las pruebas antes de fusionar.

## Evidencias de funcionamiento

1. GitLab > Build > Pipelines: abrir el pipeline del commit publicado.
2. Verificar `compilar` en verde, con su log de build y artefacto `dist/`.
3. Verificar `pruebas` en verde y el reporte con los casos ejecutados, seguido
   de `deploy_production` en verde.
4. Abrir la URL indicada en el log del despliegue y revisar producción.
5. En Vercel > Deployments, comprobar el nuevo despliegue.

Para demostrar un fallo, cambiar temporalmente una expectativa en una rama de
prueba, subirla y abrir un merge request. El pipeline debe fallar en `pruebas`.
Restaurar la expectativa y subir de nuevo antes de fusionar. No dejar una prueba
fallida en `main` para hacer la demostración.

Si las pruebas fallan en un pipeline de `main`, `deploy_production` se omite y la
versión de producción anterior permanece publicada.

## Diagnóstico

- `Pending`: revisar runner, habilitación, verificación de identidad y cuota.
- Variable ausente: comprobar que `main` esté protegida y el alcance de la variable.
- Error de autenticación Vercel: revisar token, expiración y propietario del proyecto.
- Error de instalación: mantener `package.json` y `package-lock.json` sincronizados.
- Error de construcción: revisar Root Directory y variables Production en Vercel.

Referencia: https://vercel.com/kb/guide/how-can-i-use-gitlab-pipelines-with-vercel
