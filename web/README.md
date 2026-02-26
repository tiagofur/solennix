# Eventos Web — Setup

## Backend Setup

Asegúrate de que el backend Go está ejecutándose en `http://localhost:8080` o configura `VITE_API_URL` en el `.env`.

## Local Setup

1. Instala dependencias:

   ```
   npm install
   ```

2. Crea un archivo `.env` basado en `.env.example`:

   ```
   VITE_API_URL=http://localhost:8080/api
   ```

3. Inicia el servidor de desarrollo:

   ```
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:5173`

## Vercel Deployment

1. Importa el repo en Vercel.
2. Configura variables de entorno en Vercel:
   - `VITE_API_URL` = tu URL del backend (ej: `https://api.tudominio.com/api`)
3. Build command: `npm run build`
4. Output directory: `dist`

## Dev Commands

- `npm run dev` — Servidor de desarrollo
- `npm run build` — Build para producción
- `npm run lint` — Ejecutar linter
- `npm run check` — Type-check TypeScript
- `npm run test:run` — Ejecutar tests unitarios
- `npm run test:e2e` — Ejecutar tests E2E
- `npm run test:coverage` — Coverage de tests

## Troubleshooting

### Error "Failed to fetch" al hacer login

Posibles causas:

1. **Backend no está ejecutándose:**
   - Verifica que el backend Go está en `http://localhost:8080`
   - Ejecuta: `cd ../backend && go run ./cmd/server`

2. **Variable VITE_API_URL incorrecta:**
   - Verifica el archivo `.env` tiene la URL correcta
   - Reinicia el servidor de desarrollo: `npm run dev`

3. **CORS issue:**
   - Verifica que `CORS_ALLOWED_ORIGINS` en el backend incluye `http://localhost:5173` (local) o tu dominio (producción)

## IVA (Facturación)

- Si el evento requiere factura, el IVA se calcula automáticamente y se suma al total.

- La tasa por defecto es 16% (se puede ajustar en el campo `tax_rate` si se requiere en el futuro).

## Futuro (Multi-usuario por negocio)

Propuesta para habilitar equipos:

- Crear tabla `organizations` y `organization_members` con roles.
- Reemplazar `user_id` por `organization_id` en clientes, eventos, productos e inventario.
- Ajustar políticas RLS para permisos por organización.
