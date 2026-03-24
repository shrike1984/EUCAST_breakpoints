const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

export interface InterpretacionRequest {
  groq_api_key: string;
  modelo?: string | null;
  version?: string | null;
  microorganismo: string;
  antibiotico: string;
  tipo_medicion: "MIC" | "Zone";
  valor: number;
  via_administracion?: "iv" | "oral" | null;
  indicacion?: string | null;
}

export interface BreakpointInfo {
  antibiotico: string;
  via_administracion: string | null;
  indicacion: string | null;
  aplicacion_especies: string | null;
  brackets: number;
  mic_s: number | null;
  mic_r: number | null;
  atu_mic_min: number | null;
  atu_mic_max: number | null;
  zone_s: number | null;
  zone_r: number | null;
  atu_zone_min: number | null;
  atu_zone_max: number | null;
  notes: string | null;
}

export interface ResultadoInterpretacion {
  tipo: "unico";
  microorganismo: string;
  grupo_eucast: string;
  breakpoint: BreakpointInfo;
  tipo_medicion: "MIC" | "Zone";
  valor: number;
  interpretacion: "S" | "I" | "R" | "Indeterminado" | "ATU";
  explicacion: string;
}

export interface ResultadosInterpretacion {
  tipo: "multiple";
  microorganismo: string;
  grupo_eucast: string;
  resultados: ResultadoInterpretacion[];
}

export type ResultadoAPI = ResultadoInterpretacion | ResultadosInterpretacion;

export async function getVersiones(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/v1/versiones`);
  if (!res.ok) throw new Error("No se pudieron obtener las versiones");
  return res.json();
}

export async function getAntibioticos(version?: string | null): Promise<string[]> {
  const params = new URLSearchParams();
  if (version) params.append("version", version);
  const res = await fetch(`${API_URL}/api/v1/antibioticos?${params}`);
  if (!res.ok) throw new Error("No se pudieron obtener los antibióticos");
  return res.json();
}

export async function getIndicaciones(antibiotico: string, grupo_eucast?: string | null, version?: string | null): Promise<(string | null)[]> {
  const params = new URLSearchParams({ antibiotico });
  if (grupo_eucast) params.append("grupo_eucast", grupo_eucast);
  if (version) params.append("version", version);
  const res = await fetch(`${API_URL}/api/v1/indicaciones?${params}`);
  if (!res.ok) throw new Error("No se pudieron obtener las indicaciones");
  return res.json();
}

export async function interpretar(req: InterpretacionRequest): Promise<ResultadoAPI> {
  const res = await fetch(`${API_URL}/api/v1/interpretar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Error desconocido en la API");
  }

  if ("interpretacion" in data) {
    return { ...data, tipo: "unico" } as ResultadoInterpretacion;
  } else if ("resultados" in data) {
      return { ...data, tipo: "multiple" } as ResultadosInterpretacion;
  } 
  
  throw new Error("Respuesta inesperada de la API")
}

export async function cargarTablas(
  version: string,
  file: File,
  hojaInicio: number,
  hojaFin: number,
): Promise<{ mensaje: string; filas_insertadas: number; grupos: number }> {
  const formData = new FormData();
  formData.append("version", version);
  formData.append("file", file);
  formData.append("hoja_inicio", String(hojaInicio));
  formData.append("hoja_fin", String(hojaFin));

  const res = await fetch(`${API_URL}/api/v1/cargar`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Error al cargar el archivo");
  return data;
}
