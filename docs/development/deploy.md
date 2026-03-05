# Guía de Despliegue

Esta guía cubre el despliegue de la aplicación Solennix completa (frontend + backend).

## Arquitectura de Despliegue

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Web Frontend  │ ◄─────► │   Go Backend    │ ◄─────► │   PostgreSQL    │
│   (React/Vite)  │  HTTPS  │    (Docker)     │   SQL   │    (Docker)     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Opciones de Despliegue

### Opción 1: Docker Compose (Recomendado)

Despliega toda la aplicación con un solo comando.

**Requisitos:**
- Docker 20.10+
- Docker Compose 2.0+

**Pasos:**

1. **Clonar el repositorio:**
```bash
git clone <repo-url>
cd solennix
```

2. **Configurar variables de entorno:**
```bash
# Crear archivo .env en la raíz
cat > .env << EOF
# Backend
PORT=8080
ENVIRONMENT=production
DATABASE_URL=postgres://postgres:postgres@db:5432/solennix?sslmode=disable
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRY_HOURS=24
CORS_ALLOWED_ORIGINS=https://tu-dominio.com

# Frontend (construido en build time)
VITE_API_URL=https://api.tu-dominio.com/api
EOF
```

3. **Crear docker-compose.yml:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: solennix
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DATABASE_URL=postgres://postgres:postgres@db:5432/solennix?sslmode=disable
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRY_HOURS=24
      - CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./web
    ports:
      - "80:80"
      - "443:443"
    environment:
      - VITE_API_URL=${VITE_API_URL}
    depends_on:
      - backend

volumes:
  postgres_data:
```

4. **Desplegar:**
```bash
docker-compose up -d
```

### Opción 2: Despliegue Manual

#### Backend (Go)

**Requisitos:**
- Go 1.21+
- PostgreSQL 15+
- Servidor Linux (Ubuntu 22.04 recomendado)

**Pasos:**

1. **Instalar PostgreSQL:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

2. **Crear base de datos:**
```bash
sudo -u postgres psql -c "CREATE DATABASE solennix;"
sudo -u postgres psql -c "CREATE USER solennix WITH PASSWORD 'tu-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE solennix TO solennix;"
```

3. **Compilar y ejecutar backend:**
```bash
cd backend
go build -o server cmd/server/main.go

# Configurar variables de entorno
export PORT=8080
export DATABASE_URL="postgres://solennix:tu-password@localhost:5432/solennix?sslmode=disable"
export JWT_SECRET="tu-secret-key-muy-seguro"

# Ejecutar
./server
```

4. **Configurar systemd (opcional):**
```bash
sudo tee /etc/systemd/system/solennix.service << EOF
[Unit]
Description=Solennix Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/solennix/backend
ExecStart=/var/www/solennix/backend/server
Restart=on-failure
Environment=PORT=8080
Environment=DATABASE_URL=postgres://solennix:tu-password@localhost:5432/solennix?sslmode=disable
Environment=JWT_SECRET=tu-secret-key

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable solennix
sudo systemctl start solennix
```

#### Frontend (React)

1. **Compilar:**
```bash
cd web
npm install
npm run build
```

2. **Servir con Nginx:**
```bash
sudo tee /etc/nginx/sites-available/solennix << 'EOF'
server {
    listen 80;
    server_name tu-dominio.com;
    
    root /var/www/solennix/web/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/solennix /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Opción 3: Plataformas Cloud

#### Railway / Render / Fly.io

Estas plataformas soportan despliegue directo desde GitHub.

**Pasos generales:**

1. Conectar repositorio GitHub
2. Configurar variables de entorno en el dashboard
3. Railway/Render detectará el Dockerfile
4. Desplegar automáticamente

**Variables necesarias:**
- `DATABASE_URL` (la plataforma suele provisionar PostgreSQL)
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `VITE_API_URL`

## Configuración SSL (HTTPS)

### Con Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
sudo systemctl reload nginx
```

### Renew automático

```bash
sudo tee /etc/cron.d/certbot-renew << EOF
0 3 * * * root certbot renew --quiet --nginx
EOF
```

## Variables de Entorno

### Backend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `8080` |
| `DATABASE_URL` | URL de PostgreSQL | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | Clave secreta JWT | `base64-string` |
| `JWT_EXPIRY_HOURS` | Horas de expiración token | `24` |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos | `https://app.com,http://localhost:5173` |
| `ENVIRONMENT` | Entorno | `production` |

### Frontend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend | `https://api.tu-dominio.com/api` |

## Verificación Post-Deploy

### Checklist de Verificación

- [ ] Backend responde en `/health`
- [ ] Frontend carga sin errores
- [ ] Login funciona correctamente
- [ ] Registro de nuevos usuarios
- [ ] Crear un cliente
- [ ] Crear un evento con productos
- [ ] Generar PDF de presupuesto
- [ ] Calendario muestra eventos
- [ ] Responsive design funciona
- [ ] HTTPS funcionando (sin warnings)

### Comandos de Verificación

```bash
# Health check backend
curl https://api.tu-dominio.com/health

# Verificar SSL
curl -I https://tu-dominio.com

# Logs backend
docker-compose logs -f backend

# Logs frontend
docker-compose logs -f frontend
```

## Backup y Recuperación

### Backup de Base de Datos

```bash
# Backup diario automatizado
0 2 * * * postgres pg_dump solennix > /backups/solennix-$(date +%Y%m%d).sql

# Backup manual
pg_dump -U postgres solennix > backup.sql
```

### Restaurar Backup

```bash
psql -U postgres solennix < backup.sql
```

## Monitoreo

### Logs

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Logs específicos
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Métricas Básicas

- Uso de CPU/RAM: `docker stats`
- Espacio disco: `df -h`
- Conexiones DB: `psql -c "SELECT count(*) FROM pg_stat_activity;"`

## Troubleshooting

### Error: "Failed to fetch"

1. Verificar que backend esté corriendo
2. Verificar CORS_ALLOWED_ORIGINS incluya el dominio del frontend
3. Verificar que no haya firewall bloqueando puertos

### Error: "Database connection refused"

1. Verificar que PostgreSQL esté corriendo
2. Verificar DATABASE_URL
3. Verificar que la red Docker permita conexión

### Error: "JWT validation failed"

1. Verificar JWT_SECRET coincida entre instancias
2. Verificar que el token no haya expirado
3. Verificar formato del header Authorization

## Escalado

### Escalar Backend

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Load Balancer (Nginx)

```nginx
upstream backend {
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

## Actualizaciones

### Actualizar Aplicación

```bash
# Pull cambios
git pull origin main

# Reconstruir
docker-compose down
docker-compose up -d --build

# Verificar
./scripts/health-check.sh
```

### Rollback

```bash
# Volver a versión anterior
git checkout <version-anterior>
docker-compose up -d --build
```
