from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import interpretacion
from contextlib import asynccontextmanager
from app.services.db import get_connection, create_table

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Se ejecuta una vez al arrancar
    conn = get_connection()
    create_table(conn)
    conn.close()
    yield

app = FastAPI(
    title="EUCAST Breakpoint API",
    description=(
        "API REST para interpretación de sensibilidad antibiótica según tablas EUCAST. "
        "El microorganismo se mapea automáticamente al grupo EUCAST correspondiente mediante IA (Groq). "
        "El usuario debe proveer su propia Groq API Key."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — permite peticiones desde el frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://eucast-breakpoints.vercel.app", "http://localhost:3000"],  # añadir dominio de producción si se despliega
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(interpretacion.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

@app.get("/", tags=["Root"])
def read_root():
    return {"status": "ok", "message": "¡Todo funcionando correctamente!"}
