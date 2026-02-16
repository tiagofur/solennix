# Eventos — Setup

## Supabase

1) Crea un proyecto en Supabase (https://supabase.com/dashboard).
2) Copia el Project URL y el anon key desde Settings > API.
3) Crea un archivo .env (puedes duplicar .env.example) y agrega:

   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

4) En el SQL Editor de Supabase, ejecuta el esquema consolidado:
   - supabase/migrations/20260215000001_consolidated_schema.sql
   Nota: los archivos legacy de migración ya no son necesarios y pueden eliminarse.
5) En Auth > URL Configuration, configura:
   - Site URL = tu dominio (local o Vercel)
   - Redirect URLs = agrega tu dominio y http://localhost:5173

## Vercel

1) Importa el repo en Vercel.
2) Configura variables de entorno:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3) Build command: pnpm build
4) Output directory: dist

## Dev local

1) pnpm install
2) pnpm dev

## Troubleshooting

### Error "Failed to fetch" al hacer login

Este error ocurre cuando la aplicación no puede conectarse a Supabase. Posibles causas:

1. **Variables de entorno faltantes o incorrectas:**
   - Verifica que el archivo .env existe en la raíz del proyecto
   - Verifica que las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están configuradas correctamente
   - Reinicia el servidor de desarrollo después de crear/modificar el .env

2. **Variables de entorno perdidas en Vercel:**
   - Ve a tu proyecto en Vercel Dashboard
   - Navega a Settings > Environment Variables
   - Verifica que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están configuradas
   - Si no existen o están vacías, agrégalas y redeploy el proyecto

3. **Credenciales de Supabase inválidas:**
   - Verifica que las credenciales corresponden a un proyecto activo en Supabase
   - Puedes encontrar las credenciales correctas en tu proyecto de Supabase: Settings > API

Si ves una página de "Configuración Requerida" al intentar hacer login, significa que las variables de entorno no están configuradas. Sigue los pasos en la sección Supabase arriba para configurarlas.

## IVA (Facturación)

- Si el evento requiere factura, el IVA se calcula automáticamente y se suma al total.
- La tasa por defecto es 16% (se puede ajustar en el campo `tax_rate` si se requiere en el futuro).

## Futuro (Multi-usuario por negocio)

Propuesta para habilitar equipos:
- Crear tabla `organizations` y `organization_members` con roles.
- Reemplazar `user_id` por `organization_id` en clientes, eventos, productos e inventario.
- Ajustar políticas RLS para permisos por organización.
