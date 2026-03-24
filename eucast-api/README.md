# EUCAST Breakpoint API

API REST para interpretación de sensibilidad antibiótica según tablas EUCAST.
El microorganismo introducido se mapea automáticamente al grupo EUCAST correspondiente mediante IA (Groq).

---

## Estructura del proyecto

```
eucast-api/
├── Dockerfile
├── requirements.txt
├── .env 
├── eucast_extractor.py                       
└── app/
    ├── main.py
    ├── core/
    │   └── config.py
    ├── models/
    │   └── schemas.py
    ├── routers/
    │   └── interpretacion.py
    └── services/
        ├── db.py
        ├── groq_service.py
        └── interpretacion.py
```

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Cuenta en [Groq](https://console.groq.com) para obtener una API Key gratuita

---

## Configuración

Edita el archivo `.env` con tus valores:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=abcdefg
DB_NAME=eucast

GROQ_MODEL=openai/gpt-oss-120b
```

---

## Arranque

### API + base de datos

```bash
docker compose up postgres -d
docker compose up -d
```

La API queda disponible en: http://localhost:8000  
Documentación interactiva: http://localhost:8000/docs

---

## Uso del endpoint

### `POST /api/v1/interpretar`

**Body (JSON):**
```json
{
  "groq_api_key": "groq_api_key",
  "version": "14.0",
  "microorganismo": "Escherichia coli",
  "antibiotico": "Amoxicillin-clavulanic acid",
  "tipo_medicion": "MIC",
  "valor": 4,
  "via_administracion": "iv",
  "indicacion": "systemic infection"
}
```

**Respuesta — resultado interpretado (S/I/R):**
```json
{
  "microorganismo": "Escherichia coli",
  "grupo_eucast": "Enterobacterales",
  "breakpoint": {
    "antibiotico": "Amoxicillin-clavulanic acid",
    "via_administracion": "iv",
    "indicacion": "",
    "aplicacion_especies": "",
    "brackets": 0,
    "mic_s": 8.0,
    "mic_r": 8.0,
    ...
    "notes": "..."
  },
  "tipo_medicion": "MIC",
  "valor": 4.0,
  "interpretacion": "S",
  "explicacion": "MIC 8.0 mg/L ≤ S breakpoint 8.0 mg/L → Sensible"
}
```

---

## Comandos útiles

```bash
docker compose up -d           # arrancar
docker compose down            # parar (datos persisten)
docker compose down -v         # parar y borrar datos
docker compose logs -f api     # logs de la API en tiempo real

# Backup de la BD
docker exec eucast_db pg_dump -U postgres eucast > backup.sql

# Restaurar
docker exec -i eucast_db psql -U postgres eucast < backup.sql
```
