from groq import Groq
from typing import List
from app.core.config import settings


def get_grupo_eucast(microorganismo: str, grupos_disponibles: List[str], groq_api_key: str, modelo: str) -> str:
    """
    Usa el LLM de Groq para mapear un nombre de microorganismo al grupo EUCAST
    más apropiado de entre los disponibles en la base de datos.
    """
    client = Groq(api_key=groq_api_key)
    grupos_str = "\n".join(f"- {g}" for g in grupos_disponibles)

    prompt = f"""You are a clinical microbiology expert. Your task is to map a microorganism name 
                to the most appropriate EUCAST breakpoint group from the list below.

                Microorganism entered by the user: "{microorganismo}"

                Available EUCAST groups:
                {grupos_str}

                Instructions:
                - First determine the taxonomic identity of the microorganism.
                - Treat common abbreviations as equivalent (E. coli = Escherichia coli, S. aureus = Staphylococcus aureus).
                - Then select the most appropriate EUCAST group from the list above.
                - Return ONLY the group name exactly as written in the list above.
                - Do not add explanations or extra text.
                - If no group is appropriate, return: UNKNOWN
                """

    response = client.chat.completions.create(
        model=modelo or settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=200,
    )

    grupo = response.choices[0].message.content.strip()
    print(f"Groq devolvió: '{grupo}'")
    print(f"Stop reason: {response.choices[0].finish_reason}")

    # Validar que la respuesta es uno de los grupos válidos
    if grupo not in grupos_disponibles:
        # Intento de coincidencia case-insensitive como fallback
        for g in grupos_disponibles:
            if g.lower() == grupo.lower():
                return g
        return "UNKNOWN"

    return grupo


def get_aplicacion_especies(
    microorganismo: str,
    aplicaciones_disponibles: List[str],
    groq_api_key: str,
    modelo: str,
) -> str:
    client = Groq(api_key=groq_api_key)

    if len(aplicaciones_disponibles) == 1:
        prompt = f"""You are a clinical microbiology expert.

                    Determine whether the microorganism belongs to the species/group below.

                    Microorganism: "{microorganismo}"

                    Group:
                    - {aplicaciones_disponibles[0]}

                    Instructions:
                    - First determine the taxonomic identity of the microorganism.
                    - Consider common abbreviations equivalent (e.g. E. faecalis = Enterococcus faecalis).
                    - Then determine whether the microorganism is explicitly covered by the group.
                    - Respect exclusions such as "except X".
                    - Return ONLY one word: YES or NO.
                    """
        response = client.chat.completions.create(
            model=modelo or settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=200,
        )
        resultado = response.choices[0].message.content.strip().upper()
        return aplicaciones_disponibles[0] if resultado.startswith("YES") else "UNKNOWN"

    opciones_str = "\n".join(f"- {a}" for a in aplicaciones_disponibles) + "\n- None of the above"

    prompt = f"""You are a clinical microbiology expert.

                A breakpoint may apply only to certain species or groups.

                Microorganism:
                "{microorganismo}"

                Available applications:
                {opciones_str}

                Instructions:
                - First determine the taxonomic identity of the microorganism.
                - Consider abbreviations equivalent (e.g. E. coli = Escherichia coli).
                - Determine whether the microorganism is explicitly included in one of the groups.
                - Respect exclusions such as "except X".
                - If no option explicitly applies, select "None of the above".

                Your answer MUST be exactly one of the options listed above.
                Return ONLY the selected option.
                """

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=200,
    )

    resultado = response.choices[0].message.content.strip()

    if resultado in aplicaciones_disponibles:
        return resultado

    for a in aplicaciones_disponibles:
        if a.lower() == resultado.lower():
            return a

    return "UNKNOWN"

def verificar_resistencia_intrinseca(microorganismo: str, antibiotico: str, groq_api_key: str, modelo: str) -> bool:
    client = Groq(api_key=groq_api_key)
    prompt = f"""You are a clinical microbiology expert.
                Is "{microorganismo}" intrinsically resistant to "{antibiotico}"?
                Intrinsic resistance means ALL wild-type isolates of this species are naturally resistant, regardless of acquired mechanisms.
                Examples: Klebsiella pneumoniae is intrinsically resistant to ampicillin. E. coli is intrinsically resistant to vancomycin.
                Answer only YES or NO.
                """
    response = client.chat.completions.create(
        model=modelo or settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=200,
    )
    resultado = response.choices[0].message.content.strip().upper()
    print(f"DEBUG resistencia_intrinseca: '{resultado}'")
    return resultado.startswith("YES")
