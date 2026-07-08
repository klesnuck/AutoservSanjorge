# Configuración - Base de Datos y Backend

## Requisitos
- PostgreSQL 12+ instalado
- Node.js 14+ instalado

## Pasos de instalación

### 1. Crear base de datos en PostgreSQL

Abre una terminal y ejecuta `psql` (CLI de PostgreSQL):

```bash
createdb taller_db
```

O si tienes una interfaz como pgAdmin, crea una base de datos llamada `taller_db`.

### 2. Configurar variables de entorno en el backend

En la carpeta `backend/`, copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Luego edita `backend/.env` con tus credenciales de PostgreSQL:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_NAME=taller_db
PORT=4000
```

### 3. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 4. Ejecutar el servidor

```bash
npm run start
```

En la primera ejecución, el servidor creará automáticamente las tablas e insertará datos iniciales. Deberías ver:

```
✓ Base de datos inicializada correctamente
Backend escuchando en http://localhost:4000
```

### 5. En otra terminal, instalar y ejecutar el frontend

```bash
cd taller-frontend
npm install
npm run dev
```

El frontend estará en `http://localhost:5173`.

## Prueba

1. Ve a `http://localhost:5173/servicios`
2. Presiona un botón de servicio
3. En el formulario, verás dropdowns con marcas, modelos y servicios desde la BD
4. Completa el formulario y envía
5. Los datos se guardarán en PostgreSQL

## Datos predefinidos

El backend inserta automáticamente:
- **Marcas**: Toyota, Honda, Ford, Chevrolet, Nissan, Hyundai, Kia
- **Modelos**: Modelos asociados a cada marca (Corolla, Civic, etc.)
- **Servicios**: Cambio de aceite, Afinación, Suspensión, etc.

Puedes agregar más marcas, modelos o servicios directamente a la BD con SQL.

## Solución de problemas

- **"No se pudo conectar a la BD"**: Verifica que PostgreSQL esté corriendo y que las credenciales en `.env` sean correctas.
- **"Error: ENOENT: no such file or directory"**: Asegúrate de estar en la carpeta correcta (`backend` o `taller-frontend`).
- **CORS error**: El backend tiene CORS habilitado. Asegúrate de que ambos servidores están corriendo.

