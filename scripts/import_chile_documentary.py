#!/usr/bin/env python3
"""Genera registros documentales chilenos y archiva las páginas oficiales usadas.

La curaduría está declarada en este archivo; no extrae ni infiere relaciones
políticas. Cada registro remite a una instantánea local y a su URL oficial.
"""

from __future__ import annotations

import hashlib
import html
import json
import os
import re
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "canonical"
RAW = ROOT / "data" / "raw" / "chile-oficial"
ACCESS_DATE = date.today().isoformat()
TODAY = date.today()

PAGES = {
    "presidents": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/presidentes_de_la_republica/index.html"),
    "pinochet": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_biograficas/wiki/Augusto_Pinochet_Ugarte"),
    "ibanez": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_biograficas/wiki/Carlos_Ib%C3%A1%C3%B1ez_del_Campo"),
    "alessandri": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_biograficas/wiki/Jorge_Alessandri_Rodr%C3%ADguez"),
    "allende": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_biograficas/wiki/Salvador_Allende_Gossens"),
    "kast": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Jos%C3%A9_Antonio_Kast_Adriasola"),
    "congress_absent": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/congreso_nacional/historia/index.html?periodo=1973-1990"),
    "congress_modern": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/congreso_nacional/historia?periodo=1990-2026"),
    "congress_1925": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/congreso_nacional/historia?periodo=1925-1973"),
    "corporations": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/corporaciones"),
    "elections_early": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/elecciones/index.html?periodo=1925-"),
    "elections_dictatorship": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/elecciones/index.html?periodo=1973-1990"),
    "elections_modern": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/elecciones/index.html?periodo"),
    "winter": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Gonzalo_Rodolfo_Winter_Etcheberry"),
    "coloma": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_biograficas/wiki/Juan_Antonio_Coloma_Correa"),
    "keitel": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_biograficas/wiki/Sebasti%C3%A1n_Keitel_Bianchi"),
    "lee": ("bcn-historia-politica", "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Enrique_Lee_Flores"),
    "judicial_reform": ("bcn-historia-constitucional", "https://www.bcn.cl/obtienearchivo?id=recursoslegales/10221.3/422/1/HLArt10CPR.pdf"),
    "judicial_history": ("poder-judicial-chile", "https://www.pjud.cl/post/historia-del-poder-judicial"),
}


def days(start: str, end: str | None) -> int:
    return ((date.fromisoformat(end) if end else TODAY) - date.fromisoformat(start)).days


def provenance(page: str, definition: str, start_year: int, end_year: int, note: str) -> dict[str, Any]:
    source_id, url = PAGES[page]
    suffix = ".pdf" if "obtienearchivo" in url else ".html"
    return {
        "sourceId": source_id, "datasetVersionId": f"{source_id}-{ACCESS_DATE}",
        "originalVariable": "Contenido documental HTML" if suffix == ".html" else "Historia de la ley · artículo 10 · PDF",
        "definition": definition, "unit": "fechas ISO 8601 y descripción documental",
        "coverage": {"startYear": start_year, "endYear": end_year, "territorialLevel": "national"},
        "transformations": ["Transcripción curada de fechas y atributos explícitos; sin inferencia por proximidad temporal."],
        "verificationStatus": "verified", "sourceFile": f"data/raw/chile-oficial/{page}{suffix}",
        "sourceSheet": None, "sourceRow": 1, "url": url, "accessDate": ACCESS_DATE,
        "methodologyId": "curaduria-documental-chile-fase05", "methodologyVariant": "Fuente oficial y fechas explícitas",
        "notes": note, "verificationNote": "Revisión documental y cotejo contra instantánea oficial; no constituye validación metodológica independiente de toda la fuente.",
    }


PRESIDENTS = [
    ("gabriel-gonzalez-videla", "Gabriel González Videla", "1946-11-03", "1952-11-03", "constitutional", "completed", "presidents", "3 de noviembre de 1946"),
    ("carlos-ibanez-1952", "Carlos Ibáñez del Campo", "1952-11-03", "1958-11-03", "constitutional", "completed", "ibanez", "3 de noviembre de 1952"),
    ("jorge-alessandri", "Jorge Alessandri Rodríguez", "1958-11-03", "1964-11-03", "constitutional", "completed", "alessandri", "3 de noviembre de 1958"),
    ("eduardo-frei-montalva", "Eduardo Frei Montalva", "1964-11-03", "1970-11-03", "constitutional", "completed", "presidents", "3 de noviembre de 1964"),
    ("salvador-allende", "Salvador Allende Gossens", "1970-11-03", "1973-09-11", "constitutional", "interrupted", "allende", "3 de noviembre de 1970"),
    ("junta-gobierno-1973", "Junta de Gobierno · Augusto Pinochet Ugarte", "1973-09-11", "1974-06-25", "de_facto", "completed", "pinochet", "Presidente de la Junta de Gobierno"),
    ("augusto-pinochet-jefe-supremo", "Augusto Pinochet Ugarte · Jefe Supremo de la Nación", "1974-06-26", "1974-12-16", "de_facto", "completed", "pinochet", "26 de junio de 1974"),
    ("augusto-pinochet-de-facto", "Augusto Pinochet Ugarte · Jefatura de Estado de facto", "1974-12-17", "1981-03-10", "de_facto", "completed", "pinochet", "17 de diciembre de 1974"),
    ("augusto-pinochet-constitucional", "Augusto Pinochet Ugarte · Presidente constitucional", "1981-03-11", "1990-03-11", "constitutional", "completed", "pinochet", "11 de marzo de 1981"),
    ("patricio-aylwin", "Patricio Aylwin Azócar", "1990-03-11", "1994-03-11", "constitutional", "completed", "congress_modern", "11 de marzo de 1990"),
    ("eduardo-frei-ruiz-tagle", "Eduardo Frei Ruiz-Tagle", "1994-03-11", "2000-03-11", "constitutional", "completed", "presidents", "Eduardo Frei Ruiz"),
    ("ricardo-lagos", "Ricardo Lagos Escobar", "2000-03-11", "2006-03-11", "constitutional", "completed", "presidents", "Ricardo Lagos"),
    ("michelle-bachelet-1", "Michelle Bachelet Jeria · primer gobierno", "2006-03-11", "2010-03-11", "constitutional", "completed", "congress_modern", "Michelle Bachelet Jeria (2006-2010)"),
    ("sebastian-pinera-1", "Sebastián Piñera Echenique · primer gobierno", "2010-03-11", "2014-03-11", "constitutional", "completed", "congress_modern", "Sebastián Piñera Echenique (2010-2014)"),
    ("michelle-bachelet-2", "Michelle Bachelet Jeria · segundo gobierno", "2014-03-11", "2018-03-11", "constitutional", "completed", "congress_modern", "Michelle Bachelet Jeria (2014-2018)"),
    ("sebastian-pinera-2", "Sebastián Piñera Echenique · segundo gobierno", "2018-03-11", "2022-03-11", "constitutional", "completed", "presidents", "Sebastián Piñera"),
    ("gabriel-boric", "Gabriel Boric Font", "2022-03-11", "2026-03-11", "constitutional", "completed", "presidents", "11 de marzo de 2022"),
    ("jose-antonio-kast", "José Antonio Kast Rist", "2026-03-11", None, "constitutional", "unknown", "kast", "presidente de la República desde el 11 de marzo de 2026"),
]


def event(id: str, name: str, kind: str, event_type: str, day: str, description: str, page: str, check: str, actors: list[str] | None = None, government: str | None = None, domains: list[str] | None = None, notes: str = "") -> dict[str, Any]:
    return {
        "id": f"event-chl-{id}", "sourceRecordId": f"curated-chl-{id}", "countryCode": "CHL",
        "kind": kind, "eventType": event_type, "temporalType": "exact", "year": int(day[:4]),
        "startDate": day, "endDate": day, "name": name, "description": description,
        "domains": domains or ["institutions"], "actors": actors or [], "governmentId": government,
        "confidence": "fecha y descripción explícitas en fuente oficial", "relatedEventIds": [],
        "verificationStatus": "verified", "uncertaintyNotes": notes or "Sin incertidumbre adicional registrada; la selección no implica exhaustividad.",
        "inclusionReason": "Hito institucional, electoral o normativo con fecha explícita en fuente oficial y utilidad para la lectura temporal del módulo.",
        "provenance": provenance(page, description, int(day[:4]), int(day[:4]), "Registro documental curado; no se infiere gobierno, actor ni resultado no declarado en la fuente."),
        "_page": page, "_check": check,
    }


EVENTS = [
    event("election-1952", "Elección presidencial de 1952", "election", "Elección presidencial", "1952-09-04", "Elección presidencial celebrada el 4 de septiembre de 1952.", "elections_early", "04-09-1952"),
    event("election-1953", "Elecciones parlamentarias de 1953", "election", "Elecciones parlamentarias", "1953-03-01", "Elecciones parlamentarias celebradas el 1 de marzo de 1953.", "elections_early", "01-03-1953"),
    event("election-1957", "Elecciones parlamentarias de 1957", "election", "Elecciones parlamentarias", "1957-03-03", "Elecciones parlamentarias celebradas el 3 de marzo de 1957.", "elections_early", "03-03-1957"),
    event("election-1958", "Elección presidencial de 1958", "election", "Elección presidencial", "1958-09-04", "Elección presidencial celebrada el 4 de septiembre de 1958.", "elections_early", "04-09-1958"),
    event("election-1961", "Elecciones parlamentarias de 1961", "election", "Elecciones parlamentarias", "1961-03-05", "Elecciones parlamentarias celebradas el 5 de marzo de 1961.", "elections_early", "05-03-1961"),
    event("agrarian-reform-1962", "Ley 15.020 de Reforma Agraria", "reform", "Reforma agraria", "1962-11-27", "Primera Ley de Reforma Agraria del período, dictada el 27 de noviembre de 1962.", "congress_1925", "27 de noviembre de 1962", ["Congreso Nacional", "Gobierno de Jorge Alessandri Rodríguez"], "jorge-alessandri"),
    event("election-1964", "Elección presidencial de 1964", "election", "Elección presidencial", "1964-09-04", "Elección presidencial celebrada el 4 de septiembre de 1964.", "elections_early", "04-09-1964"),
    event("election-1965", "Elecciones parlamentarias de 1965", "election", "Elecciones parlamentarias", "1965-03-07", "Elecciones parlamentarias celebradas el 7 de marzo de 1965.", "elections_early", "07-03-1965"),
    event("election-1969", "Elecciones parlamentarias de 1969", "election", "Elecciones parlamentarias", "1969-03-02", "Elecciones parlamentarias celebradas el 2 de marzo de 1969.", "elections_early", "02-03-1969"),
    event("election-1970", "Elección presidencial de 1970", "election", "Elección presidencial", "1970-09-04", "Elección presidencial celebrada el 4 de septiembre de 1970.", "elections_early", "04-09-1970"),
    event("copper-nationalization-1971", "Nacionalización de la Gran Minería del Cobre", "constitution", "Reforma constitucional · Ley 17.450", "1971-07-11", "El Congreso aprobó la reforma constitucional que nacionalizó los yacimientos de la Gran Minería del Cobre.", "congress_1925", "11 de julio de 1971", ["Congreso Nacional", "Gobierno de Salvador Allende"], "salvador-allende", ["institutions", "economy"]),
    event("election-1973", "Elecciones parlamentarias de 1973", "election", "Elecciones parlamentarias", "1973-03-04", "Elecciones parlamentarias celebradas el 4 de marzo de 1973.", "elections_early", "04-03-1973"),
    event("coup-1973", "Golpe de Estado e interrupción del gobierno de Salvador Allende", "institutional_conflict", "Golpe de Estado", "1973-09-11", "Las Fuerzas Armadas y de Orden llevaron a cabo un golpe de Estado que interrumpió el gobierno constitucional y el funcionamiento del Congreso.", "congress_1925", "11 de septiembre de 1973", ["Fuerzas Armadas y de Orden", "Gobierno de Salvador Allende"], "salvador-allende"),
    event("constitution-1980", "Plebiscito de la Constitución Política de 1980", "constitution", "Plebiscito constitucional", "1980-09-11", "Plebiscito que aprobó una nueva Constitución Política durante el régimen militar.", "elections_dictatorship", "11 de septiembre de 1980"),
    event("tricel-1985", "Ley 18.460 · Tribunal Calificador de Elecciones", "reform", "Reforma institucional electoral", "1985-11-15", "La Ley 18.460 restableció el Tribunal Calificador de Elecciones.", "elections_modern", "15-11-1985"),
    event("servel-1986", "Ley 18.556 · creación del Servicio Electoral", "reform", "Reforma institucional electoral", "1986-10-01", "La Ley 18.556 estableció el sistema electoral y creó el Servicio Electoral.", "elections_dictatorship", "1 de octubre de 1986"),
    event("elections-law-1988", "Ley 18.700 de Votaciones Populares y Escrutinios", "reform", "Reforma electoral", "1988-05-06", "Publicación de la ley orgánica constitucional sobre votaciones populares y escrutinios.", "elections_dictatorship", "6 de mayo de 1988"),
    event("plebiscite-1988", "Plebiscito nacional de 1988", "election", "Plebiscito", "1988-10-05", "La ciudadanía rechazó la continuidad de Augusto Pinochet por ocho años más, abriendo el itinerario de transición.", "elections_dictatorship", "5 de octubre de 1988", ["Ciudadanía", "Régimen militar"]),
    event("binominal-1989", "Ley 18.799 · sistema electoral binominal", "reform", "Reforma electoral", "1989-05-26", "La Ley 18.799 creó el sistema electoral binominal.", "elections_dictatorship", "26 de mayo de 1989"),
    event("plebiscite-1989", "Plebiscito de reformas constitucionales de 1989", "constitution", "Plebiscito de reforma constitucional", "1989-07-30", "Plebiscito que aprobó cincuenta y cuatro reformas constitucionales.", "elections_dictatorship", "30 de julio de 1989"),
    event("elections-1989", "Elecciones presidenciales y parlamentarias de 1989", "election", "Elecciones generales", "1989-12-14", "Elecciones presidenciales y parlamentarias celebradas el 14 de diciembre de 1989.", "elections_dictatorship", "14 de diciembre de 1989"),
    event("congress-return-1990", "Traspaso de mando y reinstalación del Congreso Nacional", "succession", "Transición y reinstalación institucional", "1990-03-11", "Patricio Aylwin asumió la presidencia y el Congreso Nacional retomó sus actividades legislativas en reemplazo de la Junta Militar.", "congress_modern", "retomando sus actividades legislativas", ["Patricio Aylwin Azócar", "Congreso Nacional"]),
    event("elections-1993", "Elecciones parlamentarias de 1993", "election", "Elecciones parlamentarias", "1993-12-11", "Elecciones parlamentarias celebradas el 11 de diciembre de 1993.", "elections_modern", "11-12-1993"),
    event("election-1999", "Elección presidencial de 1999–2000", "election", "Elección presidencial", "1999-12-12", "Primera fecha de la elección presidencial de 1999–2000 registrada por BCN.", "elections_modern", "12-12-1999", notes="El nombre conserva el ciclo 1999–2000; el nodo usa la primera fecha explícita y no agrega la segunda vuelta como si fuera el mismo día."),
    event("constitutional-reform-2005", "Ley 20.050 · reforma constitucional de 2005", "constitution", "Reforma constitucional", "2005-08-26", "La Ley 20.050 implementó cincuenta y cuatro reformas constitucionales.", "elections_modern", "26-08-2005"),
    event("elections-2005", "Elecciones presidenciales y parlamentarias de 2005", "election", "Elecciones generales", "2005-12-11", "Elecciones presidenciales y parlamentarias celebradas el 11 de diciembre de 2005.", "elections_modern", "11-12-2005"),
    event("elections-2013", "Elecciones presidenciales y parlamentarias de 2013", "election", "Elecciones generales", "2013-11-17", "Elecciones presidenciales y parlamentarias celebradas el 17 de noviembre de 2013.", "elections_modern", "17-11-2013"),
    event("electoral-reform-2015", "Ley 20.840 · fin del sistema binominal", "reform", "Reforma electoral", "2015-05-05", "La Ley 20.840 sustituyó el sistema binominal por uno proporcional inclusivo y modificó la composición de las cámaras.", "congress_modern", "Ley 20840"),
    event("elections-2017", "Elecciones presidenciales y parlamentarias de 2017", "election", "Elecciones generales", "2017-11-19", "Elecciones presidenciales y parlamentarias celebradas el 19 de noviembre de 2017.", "elections_modern", "19-11-2017"),
    event("plebiscite-2020", "Plebiscito constitucional de 2020", "constitution", "Plebiscito constitucional", "2020-10-25", "Plebiscito sobre una nueva Constitución Política registrado por la cronología electoral de BCN.", "elections_modern", "25-10-2020"),
    event("elections-2021", "Elecciones presidenciales y parlamentarias de 2021", "election", "Elecciones generales", "2021-11-21", "Elecciones presidenciales y parlamentarias celebradas el 21 de noviembre de 2021.", "elections_modern", "21-11-2021"),
    event("plebiscite-2022", "Plebiscito constitucional de salida de 2022", "constitution", "Plebiscito constitucional", "2022-09-04", "Plebiscito que rechazó la propuesta de nueva Constitución, según la cronología de BCN.", "elections_modern", "04-09-2022"),
    event("elections-2025", "Elecciones presidenciales y parlamentarias de 2025", "election", "Elecciones generales", "2025-11-16", "Elecciones parlamentarias del 16 de noviembre de 2025 documentadas en reseñas BCN; se registra el inicio del ciclo electoral sin agregar resultados no incluidos en la página.", "kast", "16 de noviembre de 2025"),
    event("succession-2026", "Inicio de la presidencia de José Antonio Kast", "succession", "Traspaso presidencial", "2026-03-11", "José Antonio Kast Rist asumió la presidencia de la República el 11 de marzo de 2026.", "kast", "presidente de la República desde el 11 de marzo de 2026", ["José Antonio Kast Rist"], "jose-antonio-kast"),
]


def legislative_periods() -> list[dict[str, Any]]:
    records = []
    for chamber in ("upper", "lower"):
        absent_prov = provenance("congress_absent", "Congreso Nacional disuelto; la Junta Militar ejerció la función legislativa en su reemplazo.", 1973, 1990, "Estado institucional documentado, no dato faltante ni mayoría política.")
        records.append({
            "id": f"leg-chl-{chamber}-absent-1973-1990", "countryCode": "CHL", "chamber": chamber,
            "startDate": "1973-09-11", "endDate": "1990-03-11", "termYears": None, "renewal": "not_applicable",
            "segments": [{"id": f"leg-chl-{chamber}-absent-segment", "startDate": "1973-09-11", "endDate": "1990-03-11", "relation": "congress_absent_or_dissolved", "majorityCriterion": None, "measuredAt": None, "provenance": absent_prov}],
            "provenance": absent_prov,
        })
        modern = [(1990, 1994), (1994, 1998), (1998, 2002), (2002, 2006), (2006, 2010), (2010, 2014), (2014, 2018), (2018, 2022), (2022, 2026), (2026, 2030)]
        for start_year, end_year in modern:
            if start_year <= 2014:
                page = "congress_modern"
            elif chamber == "lower":
                page = "winter"
            elif start_year == 2018:
                page = "coloma"
            elif start_year == 2022:
                page = "keitel"
            else:
                page = "lee"
            start = f"{start_year}-03-11"
            end = f"{end_year}-03-10"
            term_years = 8 if chamber == "upper" else 4
            renewal = "partial" if chamber == "upper" else "full"
            prov = provenance(page, f"Período legislativo {start_year}–{end_year}; la cámara conserva temporalidad propia.", start_year, end_year, "Senadores: mandatos de ocho años con renovación parcial. Diputados: mandatos de cuatro años. No se carga correlación de fuerzas sin una medición documentada.")
            records.append({
                "id": f"leg-chl-{chamber}-{start_year}-{end_year}", "countryCode": "CHL", "chamber": chamber,
                "startDate": start, "endDate": end, "termYears": term_years, "renewal": renewal,
                "segments": [{"id": f"leg-chl-{chamber}-{start_year}-unknown", "startDate": start, "endDate": end, "relation": "unknown", "majorityCriterion": None, "measuredAt": None, "provenance": prov}],
                "provenance": prov,
            })
    return records


def normalize_html(raw: bytes) -> str:
    text = raw.decode("utf-8", errors="replace")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip().casefold()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    raw_files = {}
    normalized = {}
    archive_warnings = []
    for key, (_, url) in PAGES.items():
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 RepositorioHistoricoAL/0.5"})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read()
        except Exception as error:
            suffix = ".pdf" if "obtienearchivo" in url else ".html"
            path = RAW / f"{key}{suffix}"
            if path.exists():
                raw = path.read_bytes()
            elif key == "judicial_history":
                # Fuente secundaria de contexto: no alimenta registros canónicos.
                archive_warnings.append({"page": key, "url": url, "error": str(error), "action": "Se conserva la referencia, sin instantánea ni registros dependientes."})
                continue
            else:
                raise RuntimeError(f"No se pudo archivar {url}: {error}") from error
        suffix = ".pdf" if "obtienearchivo" in url else ".html"
        path = RAW / f"{key}{suffix}"
        path.write_bytes(raw)
        raw_files[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
        if suffix == ".html":
            normalized[key] = normalize_html(raw)

    presidents = []
    documentary_checks = []
    for id, name, start, end, period_type, interruption, page, check in PRESIDENTS:
        if check.casefold() not in normalized[page]:
            raise ValueError(f"No se encontró respaldo textual para {id}: {check}")
        presidents.append({
            "id": f"pres-chl-oficial-{id}", "countryCode": "CHL", "presidentName": name,
            "startDate": start, "endDate": end, "durationDays": days(start, end),
            "party": None, "coalition": None, "interruptionStatus": interruption,
            "periodType": period_type, "institutionalNote": "Denominación y fechas explícitas en fuente oficial; partido y coalición no se completan por inferencia.",
            "provenance": provenance(page, f"Período documentado de {name}.", int(start[:4]), int((end or ACCESS_DATE)[:4]), "Serie oficial separada de comparative survival.xlsx; no sustituye ni modifica el archivo canónico anterior."),
        })
        documentary_checks.append({"id": presidents[-1]["id"], "page": page, "checkedText": check, "result": "coincide"})

    for item in EVENTS:
        if item["_check"].casefold() not in normalized[item["_page"]]:
            raise ValueError(f"No se encontró respaldo textual para {item['id']}: {item['_check']}")
        documentary_checks.append({"id": item["id"], "page": item["_page"], "checkedText": item["_check"], "result": "coincide"})
        item.pop("_page")
        item.pop("_check")

    legislative = legislative_periods()
    judicial = [{
        "id": "judicial-chl-supreme-court-reform-1957", "countryCode": "CHL",
        "institutionId": "supreme-court", "institutionName": "Corte Suprema de Chile",
        "changeType": "competence_change", "date": "1957-09-30",
        "description": "La reforma constitucional Ley 12.548 incorporó el reclamo ante la Corte Suprema, actuando como jurado, contra la cancelación de la carta de nacionalización.",
        "provenance": provenance("judicial_reform", "Cambio puntual de competencias de la Corte Suprema por la Ley 12.548 de 1957.", 1957, 1957, "Primera cobertura judicial mínima. No se infiere número de integrantes ni persistencia posterior sin otra fuente."),
    }]

    source_defs = {
        "bcn-historia-politica": ("Biblioteca del Congreso Nacional de Chile", "Historia Política de Chile", "https://www.bcn.cl/historiapolitica/"),
        "bcn-historia-constitucional": ("Biblioteca del Congreso Nacional de Chile", "Historia de la Constitución Política · colección de historias de leyes", PAGES["judicial_reform"][1]),
        "poder-judicial-chile": ("Poder Judicial de Chile", "Historia del Poder Judicial", PAGES["judicial_history"][1]),
    }
    sources = []
    for id, (institution, title, url) in source_defs.items():
        representative = next((Path(path) for key, (source, _) in PAGES.items() if source == id for path in raw_files if Path(path).stem == key), None)
        sources.append({
            "id": id, "institution": institution, "title": title, "url": url,
            "bibliographicReference": f"{institution}. {title}. Consulta y archivo local: {ACCESS_DATE}.",
            "metadataNote": "Instantáneas oficiales conservadas por página cuando el servidor lo permite; los derechos y condiciones de uso permanecen sujetos a los términos institucionales. La revisión documental no equivale a validación externa exhaustiva.",
            "versions": [{"id": f"{id}-{ACCESS_DATE}", "datasetName": title, "version": f"Instantánea {ACCESS_DATE}", "publicationDate": None, "accessDate": ACCESS_DATE, "license": "Contenido institucional; consultar condiciones de uso del organismo", "status": "imported", "sourceFile": str(representative) if representative else None, "sourceSheet": None, "sha256": raw_files.get(str(representative)) if representative else None}],
        })

    report = {
        "scope": {"country": "CHL", "period": "1950–2026", "territorialLevel": "national"},
        "accessDate": ACCESS_DATE,
        "counts": {"officialPresidentialSegments": len(presidents), "legislativePeriods": len(legislative), "legislativeSegments": sum(len(item["segments"]) for item in legislative), "judicialChangeNodes": len(judicial), "documentaryEvents": len(EVENTS), "documentaryChecks": len(documentary_checks)},
        "rawFiles": raw_files, "archiveWarnings": archive_warnings, "documentaryChecks": documentary_checks,
        "presidentialSourceComparison": "docs/fase-05-ampliacion-chile.md#comparación-de-presidencias-antes-de-integrar-la-serie-oficial",
        "limitations": ["No se cargan correlaciones de fuerzas ni mayorías legislativas sin criterio y fecha de medición.", "Los períodos anteriores a 1973 requieren una investigación separada de fechas exactas por cámara.", "La cobertura judicial se limita al nodo de 1957; no hay serie de integrantes.", "La selección de acontecimientos no es exhaustiva y no reemplaza las crisis ni las huelgas del curso."],
        "noInferredValues": True,
    }

    # Comprueba que los identificadores y fechas sean únicos y coherentes.
    for collection in (presidents, legislative, judicial, EVENTS):
        ids = [item["id"] for item in collection]
        if len(ids) != len(set(ids)):
            raise ValueError("Identificadores documentales duplicados")
    for item in presidents + legislative:
        if item["endDate"] and item["endDate"] < item["startDate"]:
            raise ValueError(f"Intervalo inválido: {item['id']}")
    for item in EVENTS:
        if item["temporalType"] != "exact" or not item["startDate"] or not item["provenance"]:
            raise ValueError(f"Acontecimiento sin precisión o fuente: {item['id']}")

    payloads = {
        "chile-official-presidential-periods.json": presidents,
        "chile-legislative-periods.json": legislative,
        "chile-judicial-changes.json": judicial,
        "chile-historical-events.json": EVENTS,
        "chile-documentary-sources.json": sources,
        "chile-documentary-import-report.json": report,
    }
    for name, payload in payloads.items():
        temporary = OUT / f".{name}.tmp"
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, OUT / name)
    print(json.dumps(report["counts"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
