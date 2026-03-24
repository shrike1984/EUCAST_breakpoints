from pydantic import BaseModel, Field
from typing import Optional, Literal, List


class InterpretacionRequest(BaseModel):
    '''
    Modelo de datos para la solicitud de interpretación.
    '''
    groq_api_key: str = Field(..., description="API Key de Groq del usuario")
    modelo: Optional[str] = Field(None, description="Modelo LLM de Groq a usar")
    version: Optional[str] = Field(None, description="Versión EUCAST (ej: 'v16.0'). Si no se especifica, usa la más reciente.")
    microorganismo: str = Field(..., description="Nombre del microorganismo (ej: 'Escherichia coli', 'S. aureus')")
    antibiotico: str = Field(..., description="Nombre del antibiótico (ej: 'Amoxicillin', 'Ciprofloxacin')")
    tipo_medicion: Literal["MIC", "Zone"] = Field(..., description="Tipo de medición: MIC (mg/L) o Zone (diámetro de halo en mm)")
    valor: float = Field(..., description="Valor de la medición")
    via_administracion: Optional[Literal["iv", "oral"]] = Field(None, description="Vía de administración, si aplica")
    indicacion: Optional[str] = Field(None, description="Indicación clínica específica (ej: 'uncomplicated UTI only')")


class BreakpointInfo(BaseModel):
    '''
    Información detallada de un breakpoint específico.
    '''
    antibiotico: str
    via_administracion: Optional[str]
    indicacion: Optional[str]
    aplicacion_especies: Optional[str]
    brackets: int

    # CMI
    mic_s: Optional[float]
    mic_r: Optional[float]
    atu_mic_min: Optional[float]
    atu_mic_max: Optional[float]

    # Halo de inhibición
    zone_s: Optional[int]
    zone_r: Optional[int]
    atu_zone_min: Optional[int]
    atu_zone_max: Optional[int]

    notes: Optional[str]


class ResultadoInterpretacion(BaseModel):
    """Resultado de interpretación para un microorganismo y antibiótico específicos."""
    microorganismo: str
    grupo_eucast: Optional[str] = None
    breakpoint: BreakpointInfo
    tipo_medicion: Literal["MIC", "Zone"]
    valor: float
    interpretacion: Literal["S", "I", "R", "Indeterminado", "ATU"]
    explicacion: str


class ResultadosInterpretacion(BaseModel):
    """Resultado cuando hay múltiples interpretaciones válidas para distintas indicaciones/vías."""
    microorganismo: str
    grupo_eucast: Optional[str] = None
    resultados: List[ResultadoInterpretacion]

class ErrorRespuesta(BaseModel):
    error: str
    detalle: Optional[str] = None
