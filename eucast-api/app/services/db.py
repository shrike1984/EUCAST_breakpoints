import psycopg
from psycopg.rows import dict_row
from typing import List, Optional, Dict, Any
from app.core.config import settings

# Conexión a la base de datos usando psycopg. Credenciales y detalles de conexión en el .env y se cargan a través de settings.
def get_connection():
    return psycopg.connect(settings.get_db_dsn())


#___________________________ Funciones para interactuar con la base de datos____________________________

def get_grupos_eucast() -> List[str]:
    """Devuelve todos los valores distintos de grupo_eucast de la BD."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT DISTINCT grupo_eucast FROM eucast_breakpoints ORDER BY grupo_eucast")
                result = [row[0] for row in cur.fetchall()]
                print(f"Grupos encontrados: {len(result)}")
                return result
    except Exception as e:
        print(f"Error en get_grupos_eucast: {e}")
        return []

def get_versiones_disponibles() -> List[str]:
    """Devuelve todas las versiones EUCAST disponibles en la BD, de más reciente a más antigua."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT DISTINCT version " \
                            "FROM eucast_breakpoints " \
                            "ORDER BY version DESC")
                return [row[0] for row in cur.fetchall()]
    except Exception as e:
        print(f"Error en get_versiones_disponibles: {e}")
        return []

def version_existe(version: str) -> bool:
    """Comprueba si una versión EUCAST ya existe en la BD."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM eucast_breakpoints WHERE version = %s LIMIT 1",
                (version,)
            )
            return cur.fetchone() is not None

def create_table(conn):
    """Crea la tabla eucast_breakpoints si no existe."""
    ddl = """
            CREATE TABLE IF NOT EXISTS eucast_breakpoints (
                    id                  SERIAL PRIMARY KEY,

            -- Identificación
            version             VARCHAR(5)     NOT NULL,
            grupo_eucast        VARCHAR(60)    NOT NULL,
            familia_antibiotico VARCHAR(60)    NOT NULL,
            antibiotico         VARCHAR(90)    NOT NULL,

            -- Contexto clínico
            via_administracion  VARCHAR(10)    NULL,
            indicacion          VARCHAR(80)    NULL,
            aplicacion_especies VARCHAR(100)   NULL,

            -- Paréntesis
            brackets            SMALLINT        NOT NULL DEFAULT 0 CHECK (brackets IN (0, 1)),

            -- Valores de CMI
            mic_s               FLOAT           NULL,
            mic_r               FLOAT           NULL,
            atu_mic_min         FLOAT           NULL,
            atu_mic_max         FLOAT           NULL,

            -- Valores de halo de inhibición
            zone_s              INTEGER         NULL,
            zone_r              INTEGER         NULL,
            atu_zone_min        INTEGER         NULL,
            atu_zone_max        INTEGER         NULL,

            -- Notas
            notes               TEXT            NULL
    );
    """
    # Crear tabla si no existe
    with conn.cursor() as cur:
        cur.execute(ddl)
    conn.commit()

def insert_dataframe(conn, df) -> int:
    """
    Inserta el DataFrame en eucast_breakpoints.
    Mapea los nombres de columnas del DataFrame a los de la tabla.
    Retorna el número de filas insertadas.
    """
    import numpy as np
    import pandas as pd

    column_mapping = {
        "grupo": "familia_antibiotico",
        "grupo_EUCAST": "grupo_eucast",
        "MIC_S": "mic_s",
        "MIC_R": "mic_r",
        "ATU_MIC_min": "atu_mic_min",
        "ATU_MIC_max": "atu_mic_max",
        "Zone_S": "zone_s",
        "Zone_R": "zone_r",
        "ATU_Zone_min": "atu_zone_min",
        "ATU_Zone_max": "atu_zone_max",
    }
    df = df.rename(columns=column_mapping)

    table_columns = [
        "version", "grupo_eucast", "familia_antibiotico", "antibiotico",
        "via_administracion", "indicacion", "aplicacion_especies",
        "brackets",
        "mic_s", "mic_r", "atu_mic_min", "atu_mic_max",
        "zone_s", "zone_r", "atu_zone_min", "atu_zone_max",
        "notes"
    ]

    df = df[table_columns].where(pd.notna(df[table_columns]), other=None)

    fields = ", ".join(table_columns)
    placeholders = ", ".join(["%s"] * len(table_columns))
    insert_query = f"INSERT INTO eucast_breakpoints ({fields}) VALUES ({placeholders})"

    def na_to_none(val):
        try:
            if pd.isna(val):
                return None
        except (TypeError, ValueError):
            pass
        if isinstance(val, np.integer):
            return int(val)
        if isinstance(val, np.floating):
            return float(val)
        return val

    rows = [tuple(na_to_none(v) for v in row) for row in df.itertuples(index=False, name=None)]

    with conn.cursor() as cur:
        cur.executemany(insert_query, rows)
    conn.commit()
    return len(rows)

def get_antibioticos(version: Optional[str] = None, grupo_eucast: Optional[str] = None) -> List[str]:
    """Devuelve una lista de todos los antibióticos distintos para una versión y grupo dados."""
    conditions = []
    params = []

    if version:
        conditions.append("version = %s")
        params.append(version)
    else:
        conditions.append("version = (SELECT MAX(version) FROM eucast_breakpoints)")

    if grupo_eucast:
        conditions.append("grupo_eucast = %s")
        params.append(grupo_eucast)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"SELECT DISTINCT antibiotico FROM eucast_breakpoints {where} ORDER BY antibiotico"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return [row[0] for row in cur.fetchall()]


def get_indicaciones(antibiotico: str, grupo_eucast: str, version: Optional[str] = None) -> List[Optional[str]]:
    """Devuelve las indicaciones distintas para un antibiótico y grupo EUCAST dado."""
    conditions = [
        "antibiotico ILIKE %s",
        "grupo_eucast = %s"
    ]
    params = [f"%{antibiotico}%", grupo_eucast]

    if version:
        conditions.append("version = %s")
        params.append(version)
    else:
        conditions.append("version = (SELECT MAX(version) FROM eucast_breakpoints)")

    query = f"""
        SELECT DISTINCT indicacion
        FROM eucast_breakpoints
        WHERE {' AND '.join(conditions)}
        ORDER BY indicacion
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return [row[0] for row in cur.fetchall()]

def query_breakpoints(grupo_eucast: str, antibiotico: str,
    via_administracion: Optional[str] = None,
    indicacion: Optional[str] = None,
    version: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Busca registros en 'eucast_breakpoints' filtrando por 'grupo_eucast' y 'antibiotico'.
    Si no se especifica versión, usa la más reciente disponible.
    Devuelve una lista de diccionarios con los breakpoints encontrados para esa combinación, 
    aplicando filtros adicionales de vía de administración e indicación si se proporcionan.
    """
    conditions = [
        "grupo_eucast = %s",
        "antibiotico ILIKE %s",
    ]
    params = [grupo_eucast, antibiotico]

    if version:
        conditions.append("version = %s")
        params.append(version)
    else:
        conditions.append("version = (SELECT MAX(version) FROM eucast_breakpoints)")

    if via_administracion:
        conditions.append("via_administracion = %s")
        params.append(via_administracion)

    if indicacion:
        conditions.append("indicacion ILIKE %s")
        params.append(indicacion)

    query = f"""
        SELECT
            antibiotico, via_administracion, indicacion, aplicacion_especies,
            brackets,
            mic_s, mic_r, atu_mic_min, atu_mic_max,
            zone_s, zone_r, atu_zone_min, atu_zone_max,
            notes
        FROM eucast_breakpoints
        WHERE {' AND '.join(conditions)}
        ORDER BY antibiotico, via_administracion, indicacion
    """

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
