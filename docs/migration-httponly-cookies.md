# Migración a httpOnly Cookies - Guía de Implementación

**Fecha**: 25 de febrero de 2026
**Prioridad**: P0 (Crítica - Seguridad)
**Estado**: ✅ Completado

---

## Contexto

Previamente, los tokens JWT se almacenaban en `localStorage`, lo cual es vulnerable a ataques XSS (Cross-Site Scripting). Cualquier script malicioso podía acceder y robar el token.

**Vulnerabilidad**: OWASP A02:2021 - Cryptographic Failures | CVSS 8.2

---

## Cambios Implementados

### Backend (Go)

#### 1. `backend/internal/handlers/auth_handler.go`

**Modificados**:
- `Register()` - Ahora envía cookie httpOnly
- `Login()` - Ahora envía cookie httpOnly
- `RefreshToken()` - Ahora envía cookie httpOnly
- `Logout()` - **NUEVO** - Limpia cookie httpOnly

**Ejemplo de código**:
```go
// Set httpOnly cookie for auth token (SECURE)
http.SetCookie(w, &http.Cookie{
    Name:     "auth_token",
    Value:    tokens.AccessToken,
    Path:     "/",
    HttpOnly: true,  // ✅ NO accesible desde JavaScript
    Secure:   r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https", // ✅ Solo HTTPS en prod
    SameSite: http.SameSiteStrictMode,  // ✅ Protección CSRF
    MaxAge:   24 * 60 * 60, // 24 hours
})
```

**Propiedades de Cookie**:
- `HttpOnly: true` → NO accesible desde JavaScript (previene XSS)
- `Secure: true` → Solo se envía por HTTPS en producción
- `SameSite: Strict` → Protección contra CSRF
- `MaxAge: 24h` → Expiración automática

#### 2. `backend/internal/middleware/auth.go`

**Modificado**: Middleware ahora lee cookies **y** Authorization header

**Prioridad**:
1. Intentar leer cookie `auth_token` (SEGURO)
2. Si no existe, intentar leer header `Authorization: Bearer <token>` (backward compatibility)

```go
// Try to get token from httpOnly cookie first (SECURE)
if cookie, err := r.Cookie("auth_token"); err == nil {
    token = cookie.Value
}

// Fallback to Authorization header (for API clients/mobile/backward compatibility)
if token == "" {
    authHeader := r.Header.Get("Authorization")
    if authHeader != "" {
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
            token = parts[1]
        }
    }
}
```

**Benefit**: Mantiene compatibilidad con clientes API/mobile que usan Authorization header

#### 3. `backend/internal/router/router.go`

**Agregado**: Ruta de logout

```go
r.Post("/logout", authHandler.Logout) // Clear httpOnly cookie
```

---

### Frontend (React + TypeScript)

#### 1. `web/src/lib/api.ts`

**Modificado**: Agregar `credentials: 'include'`

```typescript
const response = await fetch(url, {
  ...init,
  credentials: 'include', // CRITICAL: Send httpOnly cookies automatically
  headers: {
    ...this.getHeaders(),
    ...init.headers,
  },
});
```

**Qué hace**:
- `credentials: 'include'` → Envía cookies automáticamente con cada request
- Las cookies httpOnly se envían **SIN necesidad de JavaScript**

#### 2. `web/src/contexts/AuthContext.tsx`

**Modificado**: `signOut()` ahora llama al endpoint `/auth/logout`

```typescript
const signOut = async () => {
  try {
    // Call logout endpoint to clear httpOnly cookie
    await api.post('/auth/logout', {});
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token'); // Backward compatibility
    setUser(null);
    window.location.href = '/login';
  }
};
```

---

## Migración Gradual

Para evitar romper sesiones activas, implementamos **compatibilidad bidireccional**:

### Durante la Migración (Actual)

1. **Backend**:
   - ✅ Envía cookie httpOnly
   - ✅ También retorna token en JSON response (temporal)
   - ✅ Lee cookies **Y** Authorization headers

2. **Frontend**:
   - ✅ Envía cookies automáticamente (`credentials: 'include'`)
   - ⚠️ Aún puede leer token de localStorage (temporal)
   - ✅ Llama a `/auth/logout` para limpiar cookies

### Después de Migración Completa (Futuro)

1. **Backend**:
   - ✅ Envía cookie httpOnly
   - ❌ **ELIMINAR** tokens de JSON response
   - ✅ Lee cookies como prioridad (Authorization header opcional)

2. **Frontend**:
   - ✅ Envía cookies automáticamente
   - ❌ **ELIMINAR** lógica de localStorage
   - ✅ Llama a `/auth/logout`

**Timeline**: ~2 semanas para asegurar que todos los usuarios tengan cookies

---

## Testing de la Migración

### Manual Testing

#### Test 1: Login con Cookies

```bash
# 1. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Verificar que se recibe cookie en cookies.txt
cat cookies.txt
# Debería contener: auth_token=...

# 3. Hacer request autenticado usando cookie
curl -X GET http://localhost:8080/api/auth/me \
  -b cookies.txt

# Debería retornar datos del usuario
```

#### Test 2: Logout Limpia Cookie

```bash
# 1. Logout
curl -X POST http://localhost:8080/api/auth/logout \
  -b cookies.txt \
  -c cookies_after_logout.txt

# 2. Verificar que cookie se borró
cat cookies_after_logout.txt
# auth_token debería tener MaxAge=-1 o no existir
```

#### Test 3: Compatibilidad con Authorization Header

```bash
# 1. Get token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.tokens.access_token')

# 2. Usar Authorization header (sin cookies)
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Debería funcionar correctamente
```

### Frontend Testing (Browser)

1. **Verificar Cookie en DevTools**:
   - Login en la app
   - Abrir DevTools → Application → Cookies
   - Verificar cookie `auth_token`:
     - ✅ `HttpOnly: true`
     - ✅ `Secure: true` (en HTTPS)
     - ✅ `SameSite: Strict`

2. **Verificar NO Accesible desde JavaScript**:
   - Abrir Console en DevTools
   - Ejecutar: `document.cookie`
   - ✅ NO debería mostrar `auth_token`

3. **Verificar Logout**:
   - Hacer logout
   - Verificar en Application → Cookies
   - ✅ Cookie `auth_token` debería desaparecer

---

## Beneficios de Seguridad

### Antes (localStorage):
- ❌ Vulnerable a XSS
- ❌ Token accesible desde JavaScript malicioso
- ❌ Persiste después de cerrar navegador
- ❌ Sin protección CSRF integrada

### Después (httpOnly Cookies):
- ✅ **NO vulnerable a XSS** (httpOnly)
- ✅ Token NO accesible desde JavaScript
- ✅ Expiración automática (MaxAge)
- ✅ Protección CSRF (SameSite=Strict)
- ✅ Solo se envía por HTTPS en producción (Secure)

---

## CORS Configuration

**IMPORTANTE**: Para que las cookies funcionen cross-origin, se debe configurar CORS correctamente.

### Backend - `backend/internal/middleware/cors.go`

**Verificar**:
```go
w.Header().Set("Access-Control-Allow-Credentials", "true")
w.Header().Set("Access-Control-Allow-Origin", origin) // Specific origin, NOT *
```

**⚠️ CRÍTICO**: NO se puede usar `Access-Control-Allow-Origin: *` con `credentials: true`

### Frontend - `web/vite.config.ts`

Para desarrollo local:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

---

## Rollback Plan (En caso de problemas)

Si la migración causa problemas en producción:

### Paso 1: Rollback Backend
```bash
# Revertir commit
git revert <commit-hash>

# Deploy anterior versión
# Backend volverá a funcionar solo con Authorization headers
```

### Paso 2: Rollback Frontend
```bash
# Revertir cambio de credentials: 'include'
# Frontend volverá a usar solo localStorage
git revert <commit-hash>
```

### Paso 3: Database/State
- ✅ NO hay cambios en base de datos
- ✅ NO hay migraciones SQL
- ✅ Rollback es limpio

---

## Monitoreo Post-Deployment

### Métricas a Vigilar:

1. **Login Success Rate**:
   - Debería mantenerse >95%
   - Si cae, investigar inmediatamente

2. **401 Unauthorized Errors**:
   - Monitor spike en errores 401
   - Puede indicar problemas con cookies

3. **Browser Compatibility**:
   - Verificar en Chrome, Firefox, Safari, Edge
   - httpOnly cookies son soportadas universalmente

4. **CORS Errors**:
   - Monitor en logs del navegador
   - Puede indicar config CORS incorrecta

### Logs a Revisar:

Backend:
```bash
# Login attempts con cookie
grep "auth_token cookie" /var/log/solennix.log

# Fallbacks a Authorization header
grep "Authorization header fallback" /var/log/solennix.log
```

Frontend (Browser Console):
```
Failed to set cookie: SameSite attribute...
```

---

## Próximos Pasos

### Fase 1 (Actual): Migración Dual ✅
- [x] Backend envía cookies
- [x] Backend lee cookies + headers
- [x] Frontend envía cookies
- [x] Frontend mantiene localStorage (temp)

### Fase 2 (En 2 semanas): Limpieza
- [ ] Remover tokens de JSON response en backend
- [ ] Remover lógica de localStorage en frontend
- [ ] Actualizar documentación API

### Fase 3 (En 1 mes): Validación
- [ ] Confirmar 0% de requests con Authorization header desde web
- [ ] Remover compatibilidad con headers en middleware (opcional)
- [ ] Security audit final

---

## Referencias

- [OWASP: Token Storage Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [RFC 6265: HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)
- [OWASP Top 10 2021: A02 Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

---

**Fin del Documento** | Última actualización: 25 de febrero de 2026
