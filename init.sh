#!/usr/bin/env bash
# init.sh — Verificación del entorno y ejecución de pruebas de Solennix
#
# Este script es el validador principal del arnés de desarrollo.
# Se ejecuta al iniciar cualquier sesión y antes de declarar una feature finalizada.
#

set -u
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }

EXIT_CODE=0

echo "── 1. Verificando entorno básico ────────────────────────"

# Verificar Go
if ! command -v go >/dev/null 2>&1; then
  fail "Go no está instalado. Es necesario para el backend."
  EXIT_CODE=1
else
  ok "Go -> $(go version)"
fi

# Verificar Node y NPM
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js no está instalado. Es necesario para el frontend."
  EXIT_CODE=1
else
  ok "Node.js -> $(node --version)"
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "NPM no está instalado. Es necesario para el frontend."
  EXIT_CODE=1
else
  ok "NPM -> $(npm --version)"
fi

echo ""
echo "── 2. Verificando archivos base del arnés ──────────────"
for f in AGENTS.md CHECKPOINTS.md feature_list.json progress/current.md docs/agents/architecture.md docs/agents/conventions.md docs/agents/verification.md; do
  if [ ! -f "$f" ]; then
    fail "Falta archivo crítico del arnés: $f"
    EXIT_CODE=1
  else
    ok "Existe $f"
  fi
done

echo ""
echo "── 3. Validando feature_list.json ──────────────────────"
node - <<'JS'
const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
  const validStates = new Set(['pending', 'in_progress', 'done', 'blocked']);
  const inProgress = data.features.filter(f => f.status === 'in_progress');
  
  if (inProgress.length > 1) {
    console.log(`[FAIL]  Hay ${inProgress.length} features marcadas 'in_progress' (máximo 1 permitido)`);
    process.exit(1);
  }
  
  for (const f of data.features) {
    if (!validStates.has(f.status)) {
      console.log(`[FAIL]  Feature ${f.id} tiene un estado inválido: ${f.status}`);
      process.exit(1);
    }
  }
  
  console.log(`[OK]    feature_list.json válido (${data.features.length} features encontradas)`);
} catch (err) {
  console.log(`[FAIL]  Error al parsear o validar feature_list.json: ${err.message}`);
  process.exit(1);
}
JS

if [ $? -ne 0 ]; then
  EXIT_CODE=1
fi

echo ""
echo "── 4. Ejecutando pruebas del Backend (Go) ───────────────"
if [ -d "backend" ]; then
  (cd backend && go test ./...)
  if [ $? -eq 0 ]; then
    ok "Todos los tests de Go pasan correctamente"
  else
    fail "Falla en los tests de Go"
    EXIT_CODE=1
  fi
else
  warn "Directorio 'backend/' no encontrado"
fi

echo ""
echo "── 5. Ejecutando linters y pruebas de Web (React) ────────"
if [ -d "web" ]; then
  echo "Corriendo linter..."
  (cd web && npm run lint)
  if [ $? -eq 0 ]; then
    ok "Linter de React sin errores"
  else
    fail "Error en el linter de React"
    EXIT_CODE=1
  fi

  echo "Corriendo tests unitarios..."
  (cd web && npm run test:run)
  if [ $? -eq 0 ]; then
    ok "Todos los tests unitarios de Vitest pasan correctamente"
  else
    fail "Error en los tests unitarios de Vitest"
    EXIT_CODE=1
  fi
else
  warn "Directorio 'web/' no encontrado"
fi

echo ""
echo "── 6. Resumen de validación del arnés ───────────────────"
if [ $EXIT_CODE -eq 0 ]; then
  ok "Entorno en verde. Listo para desarrollo."
else
  fail "Validación fallida. Por favor resolvé los errores en rojo antes de avanzar."
fi

exit $EXIT_CODE
