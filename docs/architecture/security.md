# Seguridad y Protección de Datos

Solennix implementa una estrategia de **Defensa en Profundidad** para asegurar que cada usuario acceda únicamente a su información.

## Capas de Seguridad

### 1. Autenticación (JWT)

- Sistema basado en tokens JSON Web Token.
- Los tokens tienen expiración controlada.
- Almacenamiento seguro en el cliente y validación en cada petición al servidor.

### 2. Aislamiento en el Backend

A diferencia de sistemas que dependen de políticas de DB (RLS), Solennix refuerza el aislamiento en la capa de servicios de Go:

- **Validación de Identidad:** El ID del usuario se extrae del JWT verificado.
- **Filtrado Obligatorio:** Todas las sentencias SQL incluyen la cláusula `WHERE user_id = ?`.
- **Verificación de Propiedad:** En operaciones de `UPDATE` o `DELETE`, el sistema verifica que el recurso pertenezca al usuario antes de proceder.

### 3. Seguridad en el Frontend

- **Sanitización de Errores:** Uso de `logError` para evitar que detalles técnicos o de infraestructura se muestren al usuario en producción.
- **Validación de Tipos:** TypeScript asegura que la estructura de datos sea coherente, previniendo inyecciones de campos no deseados.
- **Rutas Protegidas:** Componentes `ProtectedRoute` que previenen el acceso a vistas privadas por usuarios no autenticados.

## Auditoría y Cumplimiento

- **Inyección SQL:** Prevenida mediante el uso de _Prepared Statements_ en el driver de Go (`pgx`).
- **XSS:** React securiza automáticamente el renderizado de contenido.
- **Manejo de Tokens:** El sistema limpia tokens locales en caso de fallos de autenticación (401), forzando el re-login.
