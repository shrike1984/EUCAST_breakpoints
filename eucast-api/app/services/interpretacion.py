from typing import Literal, Tuple


def interpretar_mic(
    valor: float,
    mic_s: float | None,
    mic_r: float | None,
    mic_atu_min: float | None = None,
    mic_atu_max: float | None = None,
) -> Tuple[Literal["S", "I", "R", "ATU", "Indeterminado"], str]:
    '''Interpreta un valor de CMI según los breakpoints S/R y la posible región ATU.'''

    if mic_s is None and mic_r is None:
        return "Indeterminado", "No hay breakpoints de MIC disponibles para esta combinación."

    # Chequeo ATU antes que determinar una categoría clínica S/I/R
    if mic_atu_min is not None and mic_atu_max is not None:
        if mic_atu_min <= valor <= mic_atu_max:
            return "ATU", (
                f"MIC {valor} mg/L está dentro de la región ATU "
                f"[{mic_atu_min}–{mic_atu_max} mg/L] → No interpretable directamente"
            )

    if mic_s is not None and valor <= mic_s:
        return "S", f"MIC {valor} mg/L ≤ S breakpoint {mic_s} mg/L → Sensible"

    if mic_r is not None and valor >= mic_r:
        return "R", f"MIC {valor} mg/L ≥ R breakpoint {mic_r} mg/L → Resistente"

    if mic_s is not None and mic_r is not None:
        return "I", f"MIC {valor} mg/L entre S breakpoint {mic_s} y R breakpoint {mic_r} mg/L → Sensible a exposición incrementada (I)"

    return "Indeterminado", f"Valor {valor} mg/L no puede clasificarse con los breakpoints disponibles (S={mic_s}, R={mic_r})."


def interpretar_zone(
    valor: float,
    zone_s: int | None,
    zone_r: int | None,
    zone_atu_min: int | None = None,
    zone_atu_max: int | None = None,
) -> Tuple[Literal["S", "I", "R", "ATU", "Indeterminado"], str]:
    '''Interpreta un valor de halo de inhibición según los breakpoints S/R y la posible región ATU.'''

    if zone_s is None and zone_r is None:
        return "Indeterminado", "No hay breakpoints de Zone disponibles para esta combinación."

    if zone_atu_min is not None and zone_atu_max is not None:
        if zone_atu_min <= valor <= zone_atu_max:
            return "ATU", (
                f"Halo {valor} mm está dentro de la región ATU "
                f"[{zone_atu_min}–{zone_atu_max} mm] → No interpretable directamente"
            )

    if zone_s is not None and valor >= zone_s:
        return "S", f"Halo {valor} mm ≥ S breakpoint {zone_s} mm → Sensible"

    if zone_r is not None and valor <= zone_r:
        return "R", f"Halo {valor} mm ≤ R breakpoint {zone_r} mm → Resistente"

    if zone_s is not None and zone_r is not None:
        return "I", f"Halo {valor} mm entre R breakpoint {zone_r} mm y S breakpoint {zone_s} mm → Sensible a exposición incrementada (I)"

    return "Indeterminado", f"Valor {valor} mm no puede clasificarse con los breakpoints disponibles (S={zone_s}, R={zone_r})."


def interpretar(
    tipo_medicion: str,
    valor: float,
    mic_s: float | None,
    mic_r: float | None,
    mic_atu_min: float | None = None,
    mic_atu_max: float | None = None,
    zone_s: int | None = None,
    zone_r: int | None = None,
    zone_atu_min: int | None = None,
    zone_atu_max: int | None = None,
) -> Tuple[Literal["S", "I", "R", "ATU", "Indeterminado"], str]:
    if tipo_medicion == "MIC":
        return interpretar_mic(valor, mic_s, mic_r, mic_atu_min, mic_atu_max)
    else:
        return interpretar_zone(valor, zone_s, zone_r, zone_atu_min, zone_atu_max)
