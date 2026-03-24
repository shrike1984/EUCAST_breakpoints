import os
import tempfile
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from typing import Union, List, Optional
from groq import AuthenticationError, APIConnectionError, InternalServerError

from app.models.schemas import (
    InterpretacionRequest,
    BreakpointInfo,
    ResultadoInterpretacion,
    ResultadosInterpretacion,
)
from app.services.db import (
    get_grupos_eucast,
    query_breakpoints,
    get_versiones_disponibles,
    get_antibioticos,
    get_indicaciones,
    version_existe,
    insert_dataframe,
    get_connection,
)
from app.services.groq_service import get_grupo_eucast, get_aplicacion_especies, verificar_resistencia_intrinseca
from app.services.interpretacion import interpretar

router = APIRouter(prefix="/api/v1", tags=["Interpretación"])


@router.get("/versiones", response_model=List[str], summary="Versiones EUCAST disponibles")
def listar_versiones():
    '''Devuelve una lista de las versiones EUCAST disponibles en la base de datos, ordenadas de más reciente a más antigua.'''
    return get_versiones_disponibles()


@router.get("/antibioticos", response_model=List[str], summary="Antibióticos disponibles")
def listar_antibioticos(
    version: Optional[str] = None,
    grupo_eucast: Optional[str] = None,
):
    '''Devuelve una lista de los antibióticos disponibles para una versión e grupo EUCAST específicos. 
    Si no se especifica versión, se usa la más reciente.'''
    return get_antibioticos(version=version, grupo_eucast=grupo_eucast)


@router.get("/indicaciones", response_model=List[Optional[str]], summary="Indicaciones para un antibiótico")
def listar_indicaciones(
    antibiotico: str,
    grupo_eucast: Optional[str] = None,
    version: Optional[str] = None,
):
    '''Devuelve una lista de las indicaciones clínicas disponibles para un antibiótico específico.'''
    return get_indicaciones(antibiotico=antibiotico, grupo_eucast=grupo_eucast, version=version)

@router.post("/cargar", summary="Cargar una nueva versión de breakpoints desde un archivo Excel")
def cargar_tablas(
    version: str = Form(...),
    file: UploadFile = File(...),
    hoja_inicio: int = Form(1, description="Número de hoja inicial"),
    hoja_fin: int = Form(0, description="Número de hoja final"),
):
    # Verificar que la versión no existe ya
    if version_existe(version):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La versión '{version}' ya existe en la base de datos. Elige otro nombre de versión.",
        )

    # Guardar el Excel en un archivo temporal
    try:
        suffix = os.path.splitext(file.filename)[1] or ".xlsx"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {str(e)}",
        )

    # Extraer datos del Excel
    try:
        from eucast_extractor import extract_all_antibiotics
        import pandas as pd

        xl = pd.ExcelFile(tmp_path)
        inicio = hoja_inicio - 1
        fin_real = hoja_fin if hoja_fin != 0 else len(xl.sheet_names)
        sheet_selection = (inicio, fin_real)

        df = extract_all_antibiotics(tmp_path, sheet_selection=sheet_selection, version=version)

    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error al procesar el Excel: {str(e)}",
        )
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Insertar en BD
    try:
        conn = get_connection()
        n = insert_dataframe(conn, df)
        conn.close()
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"\n=== ERROR INSERT ===\n{tb}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al insertar en la base de datos: {str(e)} | Traceback: {tb}",
        )

    grupos = df["grupo_EUCAST"].nunique() if "grupo_EUCAST" in df.columns else 0

    return {
        "mensaje": f"Versión '{version}' cargada correctamente.",
        "filas_insertadas": n,
        "grupos": grupos,
    }

@router.post(
    "/interpretar",
    response_model=Union[ResultadoInterpretacion, ResultadosInterpretacion],
    summary="Interpreta una medición de sensibilidad antibiótica",
)
def interpretar_sensibilidad(
    request: InterpretacionRequest,
) -> Union[ResultadoInterpretacion, ResultadosInterpretacion]:
    ''''Interpreta una medición de sensibilidad antibiótica (CMI o halo de inhibición) para un microorganismo y antibiótico específicos, usando los breakpoints de EUCAST.
    El proceso incluye:
    1. Verificar resistencia intrínseca mediante Groq.
    2. Mapear el microorganismo al grupo EUCAST correspondiente usando Groq.
    3. Consultar los breakpoints aplicables en la base de datos.
    4. Si hay múltiples breakpoints que difieren en 'aplicacion_especies', usar   Groq para determinar cuál es el más adecuado para el microorganismo.
    5. Interpretar la medición según los breakpoints seleccionados.
    6. Devolver el resultado de la interpretación, incluyendo una explicación detallada.
    '''

    # 1. Verificar resistencia intrínseca antes de cualquier otra consulta
    try:
        resistencia_intrinseca = verificar_resistencia_intrinseca(
            microorganismo=request.microorganismo,
            antibiotico=request.antibiotico,
            groq_api_key=request.groq_api_key,
            modelo=request.modelo,
        )
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, # 401 si la API Key de Groq es inválida
            detail="Groq API Key inválida. Verifica que sea correcta en console.groq.com.",
        )
    except APIConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, # 503 si no se pudo conectar con Groq (problema de red o servicio caído)
            detail="No se pudo conectar con Groq. Verifica tu conexión a internet.",
        )
    
    except InternalServerError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"El modelo LLM está saturado. Prueba de nuevo en unos segundos o cambia a otro modelo. ({str(e)[:100]})",
        )

    if resistencia_intrinseca:
        return ResultadoInterpretacion(
            microorganismo=request.microorganismo,
            grupo_eucast=None,
            breakpoint=BreakpointInfo(
                antibiotico=request.antibiotico,
                via_administracion=None,
                indicacion=None,
                aplicacion_especies=None,
                brackets=0,
                mic_s=None, mic_r=None,
                atu_mic_min=None, atu_mic_max=None,
                zone_s=None, zone_r=None,
                atu_zone_min=None, atu_zone_max=None,
                notes=None,
            ),
            tipo_medicion=request.tipo_medicion,
            valor=request.valor,
            interpretacion="R",
            explicacion=f"Resistencia intrínseca: {request.microorganismo} es naturalmente resistente a {request.antibiotico}.",
        )

    # 2. Obtener grupos EUCAST disponibles en la BD
    grupos = get_grupos_eucast()
    if not grupos:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudieron obtener los grupos EUCAST de la base de datos.",
        )

    # 3. Mapear microorganismo -> grupo EUCAST mediante Groq
    try:
        grupo_eucast = get_grupo_eucast(
            microorganismo=request.microorganismo,
            grupos_disponibles=grupos,
            groq_api_key=request.groq_api_key,
            modelo=request.modelo,
        )
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Groq API Key inválida. Verifica que sea correcta en console.groq.com.",
        )
    except APIConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo conectar con Groq. Verifica tu conexión a internet.",
        )
    
    except InternalServerError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"El modelo LLM está saturado. Prueba de nuevo en unos segundos o cambia a otro modelo. ({str(e)[:100]})",
        )

    if grupo_eucast == "UNKNOWN":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, # 422 si el microorganismo no se pudo mapear a ningún grupo EUCAST conocido
            detail=f"No se pudo mapear '{request.microorganismo}' a ningún grupo EUCAST conocido.",
        )

    # 4. Consultar breakpoints en la BD
    registros = query_breakpoints(
        grupo_eucast=grupo_eucast,
        antibiotico=request.antibiotico,
        via_administracion=request.via_administracion,
        indicacion=request.indicacion,
        version=request.version,
    )

    if not registros:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No se encontraron breakpoints para '{request.antibiotico}' "
                f"en el grupo '{grupo_eucast}'"
                + (f" con vía '{request.via_administracion}'" if request.via_administracion else "")
                + (f" e indicación '{request.indicacion}'" if request.indicacion else "")
                + "."
            ),
        )

    breakpoints = [BreakpointInfo(**r) for r in registros]

    # 5a. Si hay múltiples registros que difieren en aplicacion_especies,
    #     usar Groq para determinar cuál aplica al microorganismo
    especie_ya_confirmada = False

    if len(breakpoints) > 1:
        aplicaciones = list({bp.aplicacion_especies for bp in breakpoints if bp.aplicacion_especies})
        if aplicaciones:
            especie_match = get_aplicacion_especies(
                microorganismo=request.microorganismo,
                aplicaciones_disponibles=aplicaciones,
                groq_api_key=request.groq_api_key,
                modelo=request.modelo,
            )
            if especie_match != "UNKNOWN":
                filtrados = [bp for bp in breakpoints if bp.aplicacion_especies == especie_match]
                if filtrados:
                    breakpoints = filtrados
                    especie_ya_confirmada = True

    # 5b. Si queda 1 único registro con aplicacion_especies y no fue confirmado en 5a,
    #     verificar con Groq que el microorganismo pertenece a esa especie
    if len(breakpoints) == 1 and breakpoints[0].aplicacion_especies and not especie_ya_confirmada:
        especie_requerida = breakpoints[0].aplicacion_especies
        confirmacion = get_aplicacion_especies(
            microorganismo=request.microorganismo,
            aplicaciones_disponibles=[especie_requerida],
            groq_api_key=request.groq_api_key,
            modelo=request.modelo,
        )
        if confirmacion == "UNKNOWN":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No se encontraron breakpoints para '{request.antibiotico}' "
                    f"en '{grupo_eucast}' aplicables a '{request.microorganismo}'. "
                    f"Los breakpoints disponibles son específicos para: {especie_requerida}."
                ),
            )

    # 6. Interpretar todos los breakpoints que quedan
    resultados = []
    for bp in breakpoints:
        interpretacion, explicacion = interpretar(
            tipo_medicion=request.tipo_medicion,
            valor=request.valor,
            mic_s=bp.mic_s,
            mic_r=bp.mic_r,
            mic_atu_min=bp.atu_mic_min,
            mic_atu_max=bp.atu_mic_max,
            zone_s=bp.zone_s,
            zone_r=bp.zone_r,
            zone_atu_min=bp.atu_zone_min,
            zone_atu_max=bp.atu_zone_max,
        )
        resultados.append(ResultadoInterpretacion(
            microorganismo=request.microorganismo,
            grupo_eucast=grupo_eucast,
            breakpoint=bp,
            tipo_medicion=request.tipo_medicion,
            valor=request.valor,
            interpretacion=interpretacion,
            explicacion=explicacion,
        ))

    # Si sólo hay un resultado, devolverlo directamente. Si hay múltiples, devolver la lista completa.
    if len(resultados) == 1:
        return resultados[0]

    return ResultadosInterpretacion(
        microorganismo=request.microorganismo,
        grupo_eucast=grupo_eucast,
        resultados=resultados,
    )