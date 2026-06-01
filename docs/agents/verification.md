# Manual de Verificación — Solennix Testing

> El agente no afirma que su código funciona: proporciona evidencia ejecutable de ello.

---

## 1. Pruebas de Backend (Go)

### Dónde crear las pruebas
Las pruebas de backend deben vivir en el mismo directorio del código probado y seguir el sufijo `_test.go`.

### Convención de escritura
- Usá pruebas dirigidas por tablas (Table-Driven Tests) para verificar múltiples casos de entrada y error de manera limpia.
- Evitá acoplarte a una base de datos real en pruebas de lógica de negocio (usá mocks de repositorios o interfaces limpias).

### Comando de ejecución
Corré las pruebas desde la raíz de `backend/`:
```bash
go test ./...
```
Si necesitás ejecutar un test individual:
```bash
go test ./internal/router -run TestNew
```

---

## 2. Pruebas de Frontend (React - Vitest & Playwright)

### Pruebas Unitarias (Vitest)
Toda lógica de custom hooks, formateadores de moneda/fechas o cálculo de cotizaciones debe tener su correspondiente test en `web/src/tests/` o junto al archivo.

#### Comando de ejecución
```bash
cd web && npm run test:run
```

### Pruebas End-to-End (Playwright)
Para validar flujos de usuario completos (como iniciar sesión, crear eventos o actualizar el inventario), las pruebas viven en `web/tests/`.

#### Comando de ejecución
Correr pruebas E2E en background:
```bash
cd web && npm run test:e2e
```
Correr pruebas E2E con interfaz visual de depuración:
```bash
cd web && npm run test:e2e:ui
```

---

## 3. Anti-patrones de Verificación (No Hacer)
- ❌ Declarar una feature completada si `./init.sh` no termina en verde.
- ❌ Usar `console.log` o prints temporales como única forma de verificación del flujo de datos en producción.
- ❌ Mockear archivos y llamadas de red globales cuando podés usar entornos controlados (`t.TempDir()` en Go o mocks acotados en MSW para React).
