# Contribuir a Solennix

¡Gracias por tu interés en contribuir a Solennix! Este documento proporciona las guías para contribuir al proyecto.

## Código de Conducta

Este proyecto sigue un código de conducta simple:

- Sé respetuoso con todos
- Construye constructivamente
- Acepta críticas gracefully
- Enfócate en lo que es mejor para la comunidad

## Cómo Contribuir

### Reportar Bugs

Si encuentras un bug:

1. **Verifica** que no existe un issue similar
2. **Crea un issue** con:
   - Título descriptivo
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica
   - Información del entorno (OS, navegador, versión)

### Sugerir Features

Para sugerir nuevas características:

1. Crea un issue con label `enhancement`
2. Describe el feature y su caso de uso
3. Explica por qué sería útil
4. Si es posible, proporciona ejemplos o mockups

### Pull Requests

#### Proceso

1. **Fork** el repositorio
2. **Crea una rama** desde `main`:
   ```bash
   git checkout -b feature/nombre-feature
   # o
   git checkout -b fix/nombre-fix
   ```
3. **Haz tus cambios** siguiendo las guías de estilo
4. **Prueba** tus cambios localmente
5. **Commit** siguiendo [Conventional Commits](#conventional-commits)
6. **Push** a tu fork
7. **Crea un Pull Request** a `main`

#### Requisitos de PR

- [ ] Código compila sin errores
- [ ] Tests pasan (`npm run test:e2e` para web)
- [ ] No hay errores de lint (`npm run lint`)
- [ ] Tipos TypeScript correctos (`npm run check`)
- [ ] Documentación actualizada si es necesario
- [ ] Descripción clara del PR

## Guías de Estilo

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<alcance>): <descripción>

[cuerpo opcional]

[footer opcional]
```

#### Tipos

- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan código)
- `refactor`: Refactorización de código
- `perf`: Mejora de performance
- `test`: Cambios en tests
- `chore`: Tareas de mantenimiento

#### Ejemplos

```bash
feat(auth): add password reset functionality

fix(events): correct total calculation with discounts

docs(api): update endpoint documentation

refactor(services): extract common API logic
```

### Código TypeScript/React

#### Estilo General

- Usa **TypeScript** estricto
- Prefiere `const` sobre `let`, evita `var`
- Usa nombres descriptivos (no abreviaciones)
- Comentarios solo cuando sean necesarios

#### Componentes React

```typescript
// ✅ Bueno
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary'
}) => {
  return (
    <button
      className={cn(styles.button, styles[variant])}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

// ❌ Evitar
function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>
}
```

#### Servicios

```typescript
// ✅ Bueno
interface CreateClientRequest {
  name: string;
  email: string;
  phone: string;
}

export const clientService = {
  async create(data: CreateClientRequest): Promise<Client> {
    return api.post<Client>("/clients", data);
  },

  async getById(id: string): Promise<Client> {
    return api.get<Client>(`/clients/${id}`);
  },
};

// ❌ Evitar
export function createClient(data) {
  return api.post("/clients", data);
}
```

#### Hooks

```typescript
// ✅ Bueno
export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getAll();
      setClients(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { clients, loading, error, refetch: fetchClients };
};
```

### Código Go

#### Estilo

Sigue [Effective Go](https://golang.org/doc/effective_go.html) y usa `gofmt`.

```go
// ✅ Bueno
package handlers

import (
    "net/http"

    "github.com/go-chi/chi/v5"
)

type ClientHandler struct {
    repo repository.ClientRepository
}

func NewClientHandler(repo repository.ClientRepository) *ClientHandler {
    return &ClientHandler{repo: repo}
}

func (h *ClientHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    userID := middleware.GetUserID(r.Context())

    client, err := h.repo.GetByID(r.Context(), id, userID)
    if err != nil {
        writeError(w, http.StatusNotFound, "client not found")
        return
    }

    writeJSON(w, http.StatusOK, client)
}
```

#### Nombres

- **Packages**: minúsculas, sin underscores (ej: `handlers`, `repository`)
- **Interfaces**: terminan en `-er` o descriptivo (ej: `Handler`, `Repository`)
- **Structs**: CamelCase (ej: `ClientHandler`, `EventService`)
- **Funciones**: CamelCase, descriptivas
- **Variables**: camelCase
- **Constantes**: UPPER_SNAKE_CASE o CamelCase

### CSS/Tailwind

```tsx
// ✅ Bueno
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h1 className="text-xl font-bold text-gray-900">Título</h1>
  <Button variant="primary">Acción</Button>
</div>

// ❌ Evitar
<div style={{display: 'flex', padding: '16px'}}>
  <h1 style={{fontSize: '20px'}}>Título</h1>
</div>
```

## Estructura de Ramas

```
main
├── feature/nombre-feature
├── fix/nombre-fix
├── docs/nombre-docs
└── refactor/nombre-refactor
```

## Testing

### Web (Playwright)

```bash
cd web

# Instalar browsers
npm run test:e2e:install

# Correr tests
npm run test:e2e

# Correr en modo UI
npm run test:e2e:ui
```

### Backend (Go)

```bash
cd backend

# Correr tests
go test ./...

# Correr tests con coverage
go test -cover ./...
```

## Documentación

- Actualiza el README si agregas features significativos
- Documenta funciones públicas con comentarios GoDoc/TS Doc
- Actualiza CHANGELOG.md con tus cambios
- Si cambias la API, actualiza docs/architecture/system-overview.md

## Revisión de Código

Todos los PRs requieren revisión antes de mergear. Los revisores verificarán:

- Funcionalidad correcta
- Calidad del código
- Tests apropiados
- Documentación actualizada
- Sin errores de seguridad

## Preguntas?

Si tienes preguntas:

1. Revisa la documentación existente
2. Busca en issues existentes
3. Crea un issue con label `question`
4. Pregunta en Discussions (si está habilitado)

## Agradecimientos

¡Gracias por contribuir a hacer Solennix mejor!
