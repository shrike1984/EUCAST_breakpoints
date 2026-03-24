"use client";

import { useState, useEffect, useRef } from "react";
import {
  interpretar,
  getVersiones,
  getAntibioticos,
  getIndicaciones,
  cargarTablas,
  ResultadoAPI,
  ResultadoInterpretacion,
  ResultadosInterpretacion,
  BreakpointInfo,
} from "@/lib/api";

// ___________________ Design tokens (CSS-in-JS para no depender de clinical-* en Tailwind) _____________________

const glass = {
  card: "bg-white/[0.04] backdrop-blur-md border border-white/[0.08] shadow-xl shadow-black/40",
  cardInner: "bg-white/[0.03] border border-white/[0.06]",
  input:
    "w-full rounded-lg bg-white/[0.06] border border-white/[0.10] px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-teal-400/60 focus:border-teal-400/40 transition-all",
  label: "block text-[10px] font-semibold text-teal-300/70 uppercase tracking-[0.12em] mb-1.5",
  divider: "flex-1 h-px bg-white/[0.07]",
  section: "text-[10px] font-semibold text-white/25 uppercase tracking-[0.12em]",
};

// ___________________ Helpers _____________________

function InterpretacionBadge({ value }: { value: string }) {
  const cfg: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
    S: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-400/25",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
      label: "Sensible",
    },
    I: {
      bg: "bg-amber-500/10",
      border: "border-amber-400/25",
      text: "text-amber-300",
      dot: "bg-amber-400",
      label: "Sensible a exposición incrementada (I)",
    },
    R: {
      bg: "bg-red-500/10",
      border: "border-red-400/25",
      text: "text-red-300",
      dot: "bg-red-400",
      label: "Resistente",
    },
    ATU: {
      bg: "bg-amber-500/10",
      border: "border-amber-400/25",
      text: "text-amber-300",
      dot: "bg-amber-400",
      label: "Indeterminado",
    },
    Indeterminado: {
      bg: "bg-white/5",
      border: "border-white/10",
      text: "text-white/50",
      dot: "bg-white/30",
      label: "Indeterminado",
    },
  };
  const c = cfg[value] ?? cfg["Indeterminado"];
  return (
    <span
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${c.bg} ${c.border} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
      <span className="font-bold text-base">{value}</span>
      <span className="font-normal opacity-70 text-xs">{c.label}</span>
    </span>
  );
}

function BreakpointRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0">
      <span className="text-xs text-white/40 font-medium">{label}</span>
      <span className="font-mono text-sm font-semibold text-teal-300">
        {value}{" "}
        <span className="text-xs text-white/30 font-sans font-normal">{unit}</span>
      </span>
    </div>
  );
}

function BreakpointCard({
  bp,
}: {
  bp: BreakpointInfo;
  tipo_medicion?: "MIC" | "Zone";
}) {
  return (
    <div className={`rounded-xl ${glass.cardInner} p-4 space-y-1`}>
      <div className="flex flex-wrap gap-2 mb-3">
        {bp.via_administracion && (
          <Pill color="teal">{bp.via_administracion.toUpperCase()}</Pill>
        )}
        {bp.indicacion && (
          <Pill color="slate">{bp.indicacion}</Pill>
        )}
        {bp.aplicacion_especies && (
          <Pill color="violet">{bp.aplicacion_especies}</Pill>
        )}
        {bp.brackets === 1 && (
          <Pill color="amber">⚠ Puntos de corte con paréntesis</Pill>
        )}
      </div>
      {bp.mic_s != null && <BreakpointRow label="MIC S ≤" value={bp.mic_s} unit="mg/L" />}
      {bp.mic_r != null && <BreakpointRow label="MIC R ≥" value={bp.mic_r} unit="mg/L" />}
      {bp.atu_mic_min != null && (
        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0">
          <span className="text-xs text-white/40 font-medium">ATU MIC</span>
          <span className="font-mono text-sm font-semibold text-amber-300">
            {bp.atu_mic_min === bp.atu_mic_max ? bp.atu_mic_min : null}{" "}
            <span className="text-xs text-white/30 font-sans font-normal">mg/L</span>
          </span>
        </div>
      )}
      {bp.zone_s != null && <BreakpointRow label="Zone S ≥" value={bp.zone_s} unit="mm" />}
      {bp.zone_r != null && <BreakpointRow label="Zone R ≤" value={bp.zone_r} unit="mm" />}
      {bp.atu_zone_min != null && (
        <BreakpointRow
          label="ATU Zone"
          value={bp.atu_zone_min === bp.atu_zone_max ? bp.atu_zone_min : null}
          unit="mm"
        />
      )}
      {bp.notes && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-xs text-white/40 leading-relaxed">
            <span className="font-semibold text-white/55">Notas: </span>
            {bp.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function Pill({
  color,
  children,
}: {
  color: "teal" | "slate" | "violet" | "amber";
  children: React.ReactNode;
}) {
  const styles = {
    teal: "bg-teal-500/10 text-teal-300 border-teal-400/20",
    slate: "bg-white/5 text-white/50 border-white/10",
    violet: "bg-violet-500/10 text-violet-300 border-violet-400/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-400/20",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-xs font-medium border ${styles[color]}`}
    >
      {children}
    </span>
  );
}

// _____________________________ Result panels _____________________________

function ResultadoUnico({ result }: { result: ResultadoInterpretacion }) {
  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className={`${glass.section} mb-2`}>Resultado</p>
          <div className="flex items-center gap-3 flex-wrap">
            <InterpretacionBadge value={result.interpretacion} />
            <span className="text-sm text-white/40">{result.explicacion}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-0.5">
            Grupo EUCAST
          </p>
          <p className="text-sm font-semibold text-teal-300">{result.grupo_eucast}</p>
        </div>
      </div>
      <div>
        <p className={`${glass.section} mb-2`}>Breakpoints usados</p>
        <BreakpointCard bp={result.breakpoint} tipo_medicion={result.tipo_medicion} />
      </div>
    </div>
  );
}

function ResultadoMult({ result }: { result: ResultadosInterpretacion }) {
  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <p className={`${glass.section} mb-2`}>Múltiples interpretaciones</p>
        <span className="text-sm text-white/40">
          Grupo:{" "}
          <strong className="text-teal-300 font-semibold">{result.grupo_eucast}</strong>
        </span>
      </div>
      <div className="space-y-4 divide-y divide-white/[0.06]">
        {result.resultados.map((r, i) => (
          <div key={i} className={i > 0 ? "pt-4" : ""}>
            <ResultadoUnico result={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

// __________________________ Main Page _______________________________________________

export default function Home() {
  const [groqKey, setGroqKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [microorganismo, setMicroorganismo] = useState("");
  const [antibiotico, setAntibiotico] = useState("");
  const [tipoMedicion, setTipoMedicion] = useState<"MIC" | "Zone">("MIC");
  const [valor, setValor] = useState("");
  const [via, setVia] = useState<"" | "iv" | "oral">("");
  const [indicacion, setIndicacion] = useState("");

  const [modelo, setModelo] = useState("openai/gpt-oss-120b");
  const [versiones, setVersiones] = useState<string[]>([]);
  const [version, setVersion] = useState<string>("");

  const [antibioticos, setAntibioticos] = useState<string[]>([]);
  const [indicaciones, setIndicaciones] = useState<(string | null)[]>([]);
  const [loadingAntibioticos, setLoadingAntibioticos] = useState(false);

  const [uploadVersion, setUploadVersion] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [hojaInicio, setHojaInicio] = useState("7");
  const [hojaFin, setHojaFin] = useState("38");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAPI | null>(null);

  const [grupoEucast, setGrupoEucast] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const MODELOS_GROQ = [
                          { value: "openai/gpt-oss-120b", label: "GPT OSS 120B (recomendado)" },
                          { value: "openai/gpt-oss-20b", label: "GPT OSS 20B" },
                          { value: "qwen/qwen3-32b", label: "Qwen 3 32B" },
                          { value: "qwen/moonshotai/kimi-k2-instruct-0905-32b", label: "Kimi K2 Instruct 0905 32B" },
                          { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
                          { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
                          { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
                        ]

  useEffect(() => {
    const saved = localStorage.getItem("groq_api_key");
    if (saved) setGroqKey(saved);
  }, []);

  useEffect(() => {
    if (groqKey) localStorage.setItem("groq_api_key", groqKey);
  }, [groqKey]);

  useEffect(() => {
    getVersiones()
      .then((v) => {
        setVersiones(v);
        setVersion(v[0] ?? "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!version) return;
    setLoadingAntibioticos(true);
    setAntibiotico("");
    setIndicacion("");
    setIndicaciones([]);
    getAntibioticos(version)
      .then(setAntibioticos)
      .catch(() => {})
      .finally(() => setLoadingAntibioticos(false));
  }, [version]);

  useEffect(() => {
    setGrupoEucast(null);
    setIndicaciones([]);
  }, [microorganismo]);

  useEffect(() => {
    if (!antibiotico) { setIndicaciones([]); return; }
    console.log("getIndicaciones →", { antibiotico, grupoEucast, version });
    getIndicaciones(antibiotico, grupoEucast ?? undefined, version)
      .then(setIndicaciones)
      .catch(() => {});
  }, [antibiotico, grupoEucast, version]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    setLoading(true);
    try {
      const res = await interpretar({
        groq_api_key: groqKey,
        version: version || null,
        modelo: modelo,
        microorganismo,
        antibiotico,
        tipo_medicion: tipoMedicion,
        valor: parseFloat(valor),
        via_administracion: via || null,
        indicacion: indicacion || null,
      });
      setResultado(res);
      if ("grupo_eucast" in res && res.grupo_eucast) {
        setGrupoEucast(res.grupo_eucast);
      }
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await cargarTablas(
        uploadVersion,
        uploadFile,
        parseInt(hojaInicio),
        parseInt(hojaFin)
      );
      setUploadMsg({
        ok: true,
        text: `${res.mensaje} (${res.filas_insertadas} filas, ${res.grupos} grupos)`,
      });
      getVersiones().then((v) => {
        setVersiones(v);
        setVersion(v[0] ?? "");
      });
    } catch (err: unknown) {
      setUploadMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center px-4 py-12">

      {/* ── Header ── */}
      <header className="w-full max-w-xl mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/20 text-teal-300 text-xs font-semibold mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse inline-block" />
          EUCAST Breakpoint Interpreter
        </div>
        <h1 className="font-sans text-3xl font-bold text-white tracking-tight leading-tight">
          Antibiotic Susceptibility
          <br />
          <span className="text-teal-400">Interpreter</span>
        </h1>
        <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
          Introduce una medición de CMI o diámetro de halo y obtén la interpretación
          S/I/R según las tablas EUCAST.
        </p>
      </header>

      {/* ── Main card ── */}
      <div className={`w-full max-w-xl rounded-2xl overflow-hidden ${glass.card}`}>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Groq API Key */}
          <div className="rounded-xl bg-teal-500/[0.06] border border-teal-400/[0.15] p-4 space-y-2">
            <label className={`block text-[10px] font-semibold text-teal-300/80 uppercase tracking-[0.12em] mb-1`}>
              Groq API Key
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-teal-400/60 hover:text-teal-300 normal-case font-normal tracking-normal underline underline-offset-2 text-[11px] transition-colors"
              >
                Obtener clave gratuita →
              </a>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                required
                className={`${glass.input} pr-14 font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-teal-300 text-xs font-medium transition-colors"
              >
                {showKey ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p className="text-[11px] text-teal-300/40">
              Tu clave se guarda localmente y nunca se envía a ningún servidor.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className={glass.divider} />
            <span className={glass.section}>Consulta</span>
            <div className={glass.divider} />
          </div>

          {/* Modelo LLM */}
          <div>
            <label className={glass.label}>Modelo LLM</label>
            <select
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className={`${glass.input} cursor-pointer`}
            >
              {MODELOS_GROQ.map((m) => (
                <option key={m.value} value={m.value} className="bg-[#071426] text-white">{m.label}</option>
              ))}
            </select>
          </div>

          {/* Versión EUCAST */}
          {versiones.length > 0 && (
            <div>
              <label className={glass.label}>Versión EUCAST</label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={`${glass.input} cursor-pointer`}
              >
                {versiones.map((v) => (
                  <option key={v} value={v} className="bg-[#071426] text-white">
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Microorganismo + Antibiótico */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={glass.label}>Microorganismo</label>
              <input
                type="text"
                value={microorganismo}
                onChange={(e) => setMicroorganismo(e.target.value)}
                placeholder="Ej: E. coli"
                required
                className={glass.input}
              />
            </div>
            <div>
              <label className={glass.label}>Antibiótico</label>
              <select
                value={antibiotico}
                onChange={(e) => {
                  setAntibiotico(e.target.value);
                  setIndicacion("");
                }}
                required
                disabled={loadingAntibioticos || antibioticos.length === 0}
                className={`${glass.input} cursor-pointer`}
              >
                <option value="" className="bg-[#071426] text-white/40">
                  {loadingAntibioticos ? "Cargando..." : "— Selecciona antibiótico —"}
                </option>
                {antibioticos.map((a) => (
                  <option key={a} value={a} className="bg-[#071426] text-white">
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo medición + Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={glass.label}>Tipo de medición</label>
              <div className="flex rounded-lg border border-white/[0.10] overflow-hidden">
                {(["MIC", "Zone"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoMedicion(t)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                      tipoMedicion === t
                        ? "bg-teal-500/20 text-teal-300 border-teal-400/30"
                        : "bg-transparent text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={glass.label}>
                Valor {tipoMedicion === "MIC" ? "(mg/L)" : "(mm)"}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={tipoMedicion === "MIC" ? "Ej: 4" : "Ej: 22"}
                required
                className={`${glass.input} font-mono`}
              />
            </div>
          </div>

          {/* Filtros opcionales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={glass.label}>
                Vía admin.{" "}
                <span className="normal-case font-normal text-white/20 tracking-normal">
                  (opcional)
                </span>
              </label>
              <select
                value={via}
                onChange={(e) => setVia(e.target.value as "" | "iv" | "oral")}
                className={`${glass.input} cursor-pointer`}
              >
                <option value="" className="bg-[#071426] text-white/40">— Sin especificar —</option>
                <option value="iv" className="bg-[#071426] text-white">IV (intravenoso)</option>
                <option value="oral" className="bg-[#071426] text-white">Oral</option>
              </select>
            </div>
            <div>
              <label className={glass.label}>
                Indicación{" "}
                <span className="normal-case font-normal text-white/20 tracking-normal">
                  (opcional)
                </span>
              </label>
              <select
                value={indicacion}
                onChange={(e) => setIndicacion(e.target.value)}
                disabled={!antibiotico}
                className={`${glass.input} cursor-pointer`}
              >
                <option value="" className="bg-[#071426] text-white/40">— Sin especificar —</option>
                {indicaciones
                  .filter((i) => i !== null)
                  .map((i) => (
                    <option key={i!} value={i!} className="bg-[#071426] text-white">
                      {i}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 active:bg-teal-500/40 border border-teal-400/25 hover:border-teal-400/40 text-teal-300 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20"
          >
            {loading ? (
              <>
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-teal-400/70 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
                Consultando EUCAST...
              </>
            ) : (
              "Interpretar"
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-6 p-4 rounded-xl bg-red-500/[0.08] border border-red-400/20">
            <p className="text-sm font-semibold text-red-300 mb-0.5">Error</p>
            <p className="text-sm text-red-300/70">{error}</p>
          </div>
        )}

        {/* Result */}
        {resultado && (
          <div ref={resultRef} className="border-t border-white/[0.07] p-6">
            {resultado.tipo === "unico" ? (
              <ResultadoUnico result={resultado as ResultadoInterpretacion} />
            ) : (
              <ResultadoMult result={resultado as ResultadosInterpretacion} />
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 text-center text-xs text-white/20 space-y-1">
        <p>
          Datos basados en{" "}
          <strong className="text-white/35 font-semibold">EUCAST Breakpoint Tables</strong>
        </p>
        <p>Para uso informativo. No sustituye el criterio clínico.</p>
      </footer>
    </main>
  );
}