# EUCAST Project

Aplicación web para análisis y gestión de datos basados en EUCAST, compuesta por:

* **Backend API** (`eucast-api`) — servicio en Python (FastAPI)
* **Frontend** (`eucast-frontend`) — aplicación web (Next.js)
* **Base de datos** — PostgreSQL

Todo el sistema se orquesta mediante Docker Compose.

---

## 🧱 Arquitectura

```
.
├── docker-compose.yml
├── eucast-api/
└── eucast-frontend/
```

Servicios:

* `postgres` → Base de datos
* `api` → Backend
* `frontend` → Interfaz web

---

## 🚀 Puesta en marcha

### 1. Requisitos

* Docker
* Docker Compose

Para usuarios de Windows, se recomienda instalar Docker Desktop:

👉 https://docs.docker.com/desktop/setup/install/windows-install/

### 2. Levantar el entorno

Desde la raíz del proyecto:

```bash
docker compose up --build
```

---

## 🌐 Acceso a los servicios

* Frontend → http://localhost:3000
* API → http://localhost:8000
* PostgreSQL → localhost:5433

---

## 🗄️ Base de datos

Configuración:

* Usuario: `postgres`
* Password: `abcdefg`
* DB: `eucast`
* Puerto externo: `5433`

Los datos persisten en el volumen:

```
eucast_data
```

---

## ⚙️ Variables de entorno

### API (`eucast-api/.env`)

Se cargan automáticamente mediante `env_file`.

Variables relevantes:

* `DB_HOST=localhost`
* `DB_PORT=5432`
* `DB_USER=postgres`
* `DB_PASSWORD=abcdefg`
* `DB_NAME=eucast`
* `GROQ_MODEL=openai/gpt-oss-120b`

---

## 🔄 Dependencias entre servicios

* `api` espera a que PostgreSQL esté listo (`healthcheck`)
* `frontend` depende de `api`

---

## 🧪 Desarrollo

Para reconstruir tras cambios:

```bash
docker compose up --build
```

Para parar:

```bash
docker compose down
```

Para borrar datos (⚠️ destructivo):

```bash
docker compose down -v
```

---

## 📦 Notas

* El frontend consume la API en:

  ```
  http://localhost:8000
  ```
* Dentro de Docker, los servicios se comunican por nombre (`postgres`, `api`, etc.)
* No es necesario instalar Python ni Node localmente

---
