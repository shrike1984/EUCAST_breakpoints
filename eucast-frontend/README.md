# EUCAST Frontend

Frontend de la aplicación EUCAST, desarrollado con Next.js.

---

## 🚀 Descripción

Aplicación web que consume la API del backend para:

* Consultar datos
* Visualizar resultados
* Interactuar con el sistema EUCAST

---

## ⚙️ Configuración

La URL de la API se define mediante la variable pública de Next.js en el archivo .env.local:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🐳 Ejecución con Docker

El frontend se ejecuta automáticamente desde `docker-compose`.

Para levantar todo el sistema, desde la raíz del proyecto:

```bash
docker compose up --build
```

---

## 🧪 Desarrollo local (opcional)

Si quieres ejecutarlo sin Docker:

### 1. Instalar dependencias

```bash
npm install
```

### 2. Ejecutar

```bash
npm run dev
```

---

## 🌐 Acceso

Aplicación disponible en:

```
http://localhost:3000
```

---

## 🔗 Conexión con la API

El frontend espera que la API esté disponible en:

```
http://localhost:8000
```

Si cambias esto, actualiza la variable:

```
NEXT_PUBLIC_API_URL
```

---

## 📁 Estructura

```
eucast-frontend/
├──Dockerfile
├──package.json
├──next.config.js
├──tsconfig.json
├──.env.local
└──src/
    ├── app/
    ├── components/
    └── lib/
```

## 🧠 Arquitectura

* app/ → Sistema de rutas (Next.js App Router)
* components/ → Componentes reutilizables
* lib/ → Lógica compartida (ej: cliente API)

---

## 📝 Notas

* Las variables `NEXT_PUBLIC_*` son accesibles en el navegador
* Asegúrate de que la API esté levantada antes de usar la app
* En entorno Docker, `localhost` se refiere al host del usuario

---
