#!/usr/bin/env python3
"""Importa exclusivamente ARG y CHL sin modificar materiales_curso."""

from __future__ import annotations

import hashlib
import json
import math
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "materiales_curso"
OUTPUT_DIR = ROOT / "data" / "canonical"
COUNTRIES = {"ARG": "Argentina", "CHL": "Chile"}
UNITS = {
    "gdp-per-capita-ppp-2021": "dólares internacionales constantes de 2021",
    "electoral-democracy": "índice de 0 a 1",
    "general-strikes": "eventos por año",
}


def scalar(value: Any) -> Any:
    if value is None or (isinstance(value, float) and math.isnan(value)) or pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.strftime("%Y-%m-%d")
    if hasattr(value, "item"):
        return value.item()
    return value


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def coverage(start: int | None, end: int | None) -> dict[str, Any]:
    return {"startYear": start, "endYear": end, "territorialLevel": "national"}


def provenance(
    source_id: str,
    version_id: str,
    variable: str,
    definition: str,
    unit: str,
    start: int | None,
    end: int | None,
    file: str,
    sheet: str | None,
    row: int,
    transformations: list[str],
    notes: str,
) -> dict[str, Any]:
    return {
        "sourceId": source_id,
        "datasetVersionId": version_id,
        "originalVariable": variable,
        "definition": definition,
        "unit": unit,
        "coverage": coverage(start, end),
        "transformations": transformations,
        "verificationStatus": "unverified",
        "sourceFile": file,
        "sourceSheet": sheet,
        "sourceRow": row,
        "notes": notes,
    }


def read_csv(name: str, variable: str) -> pd.DataFrame:
    path = SOURCE_DIR / name
    frame = pd.read_csv(path)
    required = {"country", "countrycode", "year", variable}
    if not required.issubset(frame.columns):
        raise ValueError(f"Variables ausentes en {name}: {sorted(required - set(frame.columns))}")
    for code, country_name in COUNTRIES.items():
        rows = frame.loc[frame["country"].eq(country_name)]
        if rows.empty or not rows["countrycode"].eq(code).all():
            raise ValueError(f"Código desconocido o inconsistente para {country_name} en {name}")
    return frame.loc[frame["countrycode"].isin(COUNTRIES)].copy()


def annual_observations() -> list[dict[str, Any]]:
    configurations = [
        {
            "file": "variables_economicas.csv",
            "variable": "GDP_pc_PPP_2021",
            "indicator": "gdp-per-capita-ppp-2021",
            "source": "course-economic",
            "version": "course-economic-local",
            "definition": "PIB per cápita ajustado por PPA en valores constantes de 2021, según el nombre de variable del archivo.",
            "notes": "Observación importada. El CSV no incluye cita bibliográfica, versión ni metadatos institucionales; esos campos permanecen pendientes.",
        },
        {
            "file": "variables_vdem.csv",
            "variable": "v2x_polyarchy",
            "indicator": "electoral-democracy",
            "source": "vdem",
            "version": "vdem-local-unconfirmed",
            "definition": "Índice de democracia electoral v2x_polyarchy; versión y documentación metodológica pendientes de confirmación.",
            "notes": "Observación importada. La fila 2025 existe sin valor y no genera una observación. Versión V-Dem no confirmada.",
        },
    ]
    result: list[dict[str, Any]] = []
    for config in configurations:
        frame = read_csv(config["file"], config["variable"])
        for code, country_rows in frame.groupby("countrycode", sort=True):
            valid_years = country_rows.loc[country_rows[config["variable"]].notna(), "year"]
            start, end = int(valid_years.min()), int(valid_years.max())
            for index, row in country_rows.iterrows():
                value = scalar(row[config["variable"]])
                if value is None:
                    continue
                year = int(row["year"])
                result.append({
                    "id": f"obs-{code.lower()}-{config['indicator']}-{year}",
                    "countryCode": code,
                    "indicatorId": config["indicator"],
                    "year": year,
                    "originalValue": value,
                    "normalizedValue": float(value),
                    "valueStatus": "available",
                    "provenance": provenance(
                        config["source"], config["version"], config["variable"], config["definition"],
                        UNITS[config["indicator"]], start, end, config["file"], None, int(index) + 2,
                        ["Lectura del valor numérico original; sin cambio de escala, unidad ni cobertura."],
                        config["notes"],
                    ),
                })

    name = "CMartinez (2020) Pol Events LatAm.xlsx"
    frame = pd.read_excel(SOURCE_DIR / name, sheet_name="DATA")
    required = {"country", "countrycode", "year", "strikes"}
    if not required.issubset(frame.columns):
        raise ValueError(f"Variables ausentes en {name}: {sorted(required - set(frame.columns))}")
    for code, country_name in COUNTRIES.items():
        rows = frame.loc[frame["country"].eq(country_name)]
        if rows.empty or not rows["countrycode"].eq(code).all():
            raise ValueError(f"Código desconocido o inconsistente para {country_name} en {name}")
    frame = frame.loc[frame["countrycode"].isin(COUNTRIES)]
    for code, country_rows in frame.groupby("countrycode", sort=True):
        valid = country_rows.loc[country_rows["strikes"].notna()]
        start, end = int(valid["year"].min()), int(valid["year"].max())
        for index, row in country_rows.iterrows():
            value = scalar(row["strikes"])
            if value is None:
                continue
            year = int(row["year"])
            number = int(value)
            result.append({
                "id": f"obs-{code.lower()}-general-strikes-{year}",
                "countryCode": code,
                "indicatorId": "general-strikes",
                "year": year,
                "originalValue": number,
                "normalizedValue": number,
                "valueStatus": "zero_events" if number == 0 else "available",
                "provenance": provenance(
                    "martinez-pol-events", "martinez-pol-events-v2", "strikes",
                    "Número de huelgas generales nacionales por año organizadas por organizaciones de trabajadores, según README.",
                    UNITS["general-strikes"], start, end, name, "DATA", int(index) + 2,
                    ["Conversión del conteo a entero; el cero se conserva como evento registrado dentro de la cobertura."],
                    "Observación importada de la hoja DATA. Cero no equivale a ausencia; fuera de cobertura no se generan registros.",
                ),
            })
    return result


def presidential_periods() -> list[dict[str, Any]]:
    name = "comparative survival.xlsx"
    frame = pd.read_excel(SOURCE_DIR / name, sheet_name="Sheet1")
    required = {"countrycode", "adm", "datein", "dateout", "tenure", "failure", "name", "surname"}
    if not required.issubset(frame.columns):
        raise ValueError(f"Variables ausentes en {name}: {sorted(required - set(frame.columns))}")
    frame = frame.loc[frame["countrycode"].isin(COUNTRIES)]
    result = []
    for index, row in frame.iterrows():
        code = str(row["countrycode"])
        surname = str(scalar(row["surname"]))
        normalized_surname = surname.rstrip("0123456789").strip()
        president_name = f"{scalar(row['name'])} {normalized_surname}".strip()
        failure = int(row["failure"])
        country_rows = frame.loc[frame["countrycode"].eq(code)]
        result.append({
            "id": f"pres-{code.lower()}-{int(row['adm'])}",
            "countryCode": code,
            "presidentName": president_name,
            "startDate": scalar(row["datein"]),
            "endDate": scalar(row["dateout"]),
            "durationDays": int(row["tenure"]),
            "party": None,
            "coalition": None,
            "interruptionStatus": "interrupted" if failure == 1 else "unknown",
            "originalValues": {
                "adm": int(row["adm"]), "name": scalar(row["name"]), "surname": surname,
                "failure": failure, "failure2": int(row["failure2"]),
            },
            "provenance": provenance(
                "comparative-survival", "comparative-survival-local", "adm; name; surname; datein; dateout; tenure; failure",
                "Período de administración tal como aparece en comparative survival.xlsx; no representa necesariamente un mandato constitucional completo.",
                "fechas ISO 8601; duración en días", int(country_rows["datein"].dt.year.min()), int(country_rows["dateout"].dt.year.max()),
                name, "Sheet1", int(index) + 2,
                [
                    "Fechas convertidas a ISO 8601 sin agregarlas a años.",
                    "Nombre normalizado por concatenación de name y surname; sufijos numéricos de surname retirados solo para visualización.",
                    "failure=1 se traduce como interrupción; failure=0 se conserva como estado no determinado para no inferir mandato completado.",
                ],
                "No se usó Hegemony.dta. Partido y coalición permanecen sin dato. La cobertura termina en 2020 y no se extrapola.",
            ),
        })
    return result


def crisis_episodes() -> list[dict[str, Any]]:
    name = "Base_Final_RCP_v6.xlsx"
    frame = pd.read_excel(SOURCE_DIR / name, sheet_name="crisis")
    required = {"pais", "tipo", "inicio", "termino", "fecha_peak", "duración_crisis", "actor_horizontal", "actor_vertical", "pres_fail", "salida", "notes", "pivote_confianza"}
    if not required.issubset(frame.columns):
        raise ValueError(f"Variables ausentes en {name}: {sorted(required - set(frame.columns))}")
    frame = frame.loc[frame["pais"].isin(COUNTRIES.values())]
    mechanisms = ["RU", "HPG", "CP", "ILR", "CC", "FJ", "MI", "IC", "D"]
    result = []
    for index, row in frame.iterrows():
        code = next(code for code, country in COUNTRIES.items() if country == row["pais"])
        start = scalar(row["inicio"])
        country_rows = frame.loc[frame["pais"].eq(COUNTRIES[code])]
        result.append({
            "id": f"crisis-{code.lower()}-{start}",
            "countryCode": code,
            "crisisType": str(row["tipo"]),
            "startDate": start,
            "endDate": scalar(row["termino"]),
            "peakDate": scalar(row["fecha_peak"]),
            "durationDays": int(row["duración_crisis"]),
            "durationToPeakDays": scalar(row["duración_inicio_peak"]),
            "description": str(scalar(row["notes"])),
            "actors": {"horizontal": scalar(row["actor_horizontal"]), "vertical": scalar(row["actor_vertical"]), "target": scalar(row["objetivo"])},
            "mechanisms": {key: scalar(row[key]) for key in mechanisms},
            "presidentialInterruption": {"Yes": "yes", "No": "no"}.get(str(row["pres_fail"]), "unknown"),
            "presidentialExit": "yes" if int(row["salida"]) == 1 else "no" if int(row["salida"]) == 0 else "unknown",
            "notes": scalar(row["notes"]),
            "confidence": scalar(row["pivote_confianza"]),
            "justifications": {
                "start": scalar(row["inicio_justifiacion"]), "end": scalar(row["termino_justificacion"]),
                "peak": scalar(row["peak_justificacion"]), "peakNote": scalar(row["pivote_nota"]),
            },
            "originalValues": {"pres_fail": scalar(row["pres_fail"]), "salida": int(row["salida"]), "edited": scalar(row["edited"]), "total_events": scalar(row["total_events"])},
            "provenance": provenance(
                "rcp-crisis", "rcp-crisis-v6-local", "año; pais; tipo; inicio; termino; fecha_peak; duración_crisis; actores; mecanismos; pres_fail; salida; notes; pivote_confianza",
                "Episodio de crisis con dimensiones vertical u horizontal según la hoja crisis y su codebook.",
                "fechas ISO 8601; duración en días", int(country_rows["inicio"].dt.year.min()), int(country_rows["termino"].dt.year.max()),
                name, "crisis", int(index) + 2,
                ["Fechas convertidas a ISO 8601; episodios independientes aunque compartan año.", "Campos de actores, mecanismos, salida, notas y confianza conservados sin imputación."],
                "El codebook usa nombres distintos de varias columnas efectivas; la correspondencia se documenta en el informe de importación.",
            ),
        })
    return result


def source_registry(hashes: dict[str, str]) -> list[dict[str, Any]]:
    def version(id: str, dataset: str, file: str, status: str = "imported", version_value: str | None = None, sheet: str | None = None) -> dict[str, Any]:
        return {"id": id, "datasetName": dataset, "version": version_value, "publicationDate": None, "accessDate": None, "license": None, "status": status, "sourceFile": file, "sourceSheet": sheet, "sha256": hashes[file]}
    return [
        {
            "id": "course-economic", "institution": "Materiales del curso", "title": "variables_economicas.csv",
            "bibliographicReference": None, "metadataNote": "El archivo no contiene referencia bibliográfica, institución, versión, fecha de publicación ni licencia. No se atribuye una procedencia externa por inferencia.",
            "versions": [version("course-economic-local", "variables_economicas.csv", "variables_economicas.csv")],
        },
        {
            "id": "vdem", "institution": "V-Dem Institute", "title": "variables_vdem.csv", "url": "https://www.v-dem.net/",
            "bibliographicReference": None, "metadataNote": "El nombre de variable es v2x_polyarchy, pero el archivo no confirma versión, cita, fecha de publicación ni licencia. La institución figura como prevista, no como validación del archivo.",
            "versions": [version("vdem-local-unconfirmed", "variables_vdem.csv", "variables_vdem.csv")],
        },
        {
            "id": "martinez-pol-events", "institution": "Christopher A. Martínez", "title": "Data Set on Presidential Scandals, Anti-Government Demonstrations and General Strikes in Latin America (1979–2019)",
            "doi": "10.1017/gov.2020.18", "bibliographicReference": "Martínez, Christopher A. (2020). Presidential Instability in Latin America: Why Institutionalized Parties Matter. Government and Opposition, 1–22. doi:10.1017/gov.2020.18",
            "metadataNote": "Referencia y versión 2 leídas en la hoja README. Licencia y fecha exacta de publicación no consignadas en el archivo.",
            "versions": [version("martinez-pol-events-v2", "Pol Events LatAm", "CMartinez (2020) Pol Events LatAm.xlsx", version_value="2", sheet="DATA")],
        },
        {
            "id": "comparative-survival", "institution": "Materiales del curso", "title": "comparative survival.xlsx",
            "bibliographicReference": None, "metadataNote": "El archivo no contiene una hoja de referencia bibliográfica, versión ni licencia. Hegemony.dta no fue utilizado.",
            "versions": [version("comparative-survival-local", "comparative survival", "comparative survival.xlsx", sheet="Sheet1")],
        },
        {
            "id": "rcp-crisis", "institution": "Materiales del curso", "title": "Base_Final_RCP_v6.xlsx",
            "bibliographicReference": None, "metadataNote": "v6 forma parte del nombre del archivo; no se interpreta como versión bibliográfica confirmada. El archivo incluye codebook, pero no cita ni licencia.",
            "versions": [version("rcp-crisis-v6-local", "Base_Final_RCP_v6", "Base_Final_RCP_v6.xlsx", sheet="crisis")],
        },
    ]


def validate_canonical(observations: list[dict[str, Any]], periods: list[dict[str, Any]], crises: list[dict[str, Any]], sources: list[dict[str, Any]]) -> None:
    source_ids = {source["id"] for source in sources}
    version_ids = {item["id"] for source in sources for item in source["versions"]}
    indicator_units = UNITS
    seen = set()
    for item in observations:
        key = (item["countryCode"], item["indicatorId"], item["year"])
        if key in seen:
            raise ValueError(f"Duplicado país-año-indicador: {key}")
        seen.add(key)
        if item["countryCode"] not in COUNTRIES:
            raise ValueError(f"Código de país desconocido: {item['countryCode']}")
        if not 1800 <= item["year"] <= date.today().year + 1:
            raise ValueError(f"Año fuera de rango: {item['year']}")
        if not isinstance(item["normalizedValue"], (int, float)) or isinstance(item["normalizedValue"], bool):
            raise ValueError(f"Valor numérico almacenado como texto: {item['id']}")
        if item["indicatorId"] not in indicator_units:
            raise ValueError(f"Indicador inexistente: {item['indicatorId']}")
        if item["provenance"]["unit"] != indicator_units[item["indicatorId"]]:
            raise ValueError(f"Unidad incompatible: {item['id']}")
        if item["valueStatus"] == "zero_events" and item["normalizedValue"] != 0:
            raise ValueError(f"Cero clasificado incorrectamente: {item['id']}")
        if item["valueStatus"] == "no_data" and item["normalizedValue"] is not None:
            raise ValueError(f"Ausencia con valor: {item['id']}")
        if item["provenance"]["sourceId"] not in source_ids or item["provenance"]["datasetVersionId"] not in version_ids:
            raise ValueError(f"Fuente inexistente: {item['id']}")
        if not item["provenance"].get("sourceFile") or not item["provenance"].get("sourceRow"):
            raise ValueError(f"Observación sin procedencia: {item['id']}")
    for item in [*periods, *crises]:
        if item["countryCode"] not in COUNTRIES:
            raise ValueError(f"Código de país desconocido: {item['countryCode']}")
        if item["endDate"] and item["endDate"] < item["startDate"]:
            raise ValueError(f"Fecha de término anterior al inicio: {item['id']}")
        if item["provenance"]["sourceId"] not in source_ids or not item["provenance"].get("sourceRow"):
            raise ValueError(f"Registro sin procedencia válida: {item['id']}")


def verify_samples(observations: list[dict[str, Any]], periods: list[dict[str, Any]], crises: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Relee los archivos originales y contrasta valores, fechas y filas de una muestra."""
    sample_ids = {
        "obs-arg-gdp-per-capita-ppp-2021-2000", "obs-chl-gdp-per-capita-ppp-2021-2025",
        "obs-arg-electoral-democracy-2000", "obs-chl-electoral-democracy-2024",
        "obs-arg-general-strikes-1989", "obs-chl-general-strikes-1990",
        "pres-arg-3701", "pres-chl-7207",
        "crisis-arg-2001-12-01", "crisis-arg-2002-06-26", "crisis-chl-2019-10-18", "crisis-chl-2021-10-13",
    }
    checks = []
    for item in [*observations, *periods, *crises]:
        if item["id"] not in sample_ids:
            continue
        prov = item["provenance"]
        path = SOURCE_DIR / prov["sourceFile"]
        if path.suffix == ".csv":
            source_row = pd.read_csv(path).iloc[prov["sourceRow"] - 2]
        else:
            source_row = pd.read_excel(path, sheet_name=prov["sourceSheet"]).iloc[prov["sourceRow"] - 2]
        if item["id"].startswith("obs-"):
            variable = prov["originalVariable"]
            expected = scalar(source_row[variable])
            actual = item["originalValue"]
            passed = actual == expected and int(source_row["year"]) == item["year"]
            checked = f"{variable}={expected}; year={item['year']}"
        elif item["id"].startswith("pres-"):
            passed = item["startDate"] == scalar(source_row["datein"]) and item["endDate"] == scalar(source_row["dateout"]) and item["durationDays"] == int(source_row["tenure"])
            checked = f"datein={item['startDate']}; dateout={item['endDate']}; tenure={item['durationDays']}"
        else:
            passed = item["startDate"] == scalar(source_row["inicio"]) and item["endDate"] == scalar(source_row["termino"]) and item["peakDate"] == scalar(source_row["fecha_peak"]) and item["durationDays"] == int(source_row["duración_crisis"])
            checked = f"inicio={item['startDate']}; termino={item['endDate']}; fecha_peak={item['peakDate']}; duración={item['durationDays']}"
        if not passed:
            raise ValueError(f"Falló el cotejo con la fuente: {item['id']}")
        item["provenance"]["verificationStatus"] = "verified"
        item["provenance"]["verificationNote"] = "Cotejado automatizadamente contra la fila original; no constituye validación externa de la fuente."
        checks.append({"id": item["id"], "sourceFile": prov["sourceFile"], "sourceSheet": prov["sourceSheet"], "sourceRow": prov["sourceRow"], "checked": checked, "result": "coincide"})
    missing = sample_ids - {check["id"] for check in checks}
    if missing:
        raise ValueError(f"Muestras no encontradas: {sorted(missing)}")
    return checks


def main() -> None:
    source_files = [
        "variables_economicas.csv", "variables_vdem.csv", "CMartinez (2020) Pol Events LatAm.xlsx",
        "comparative survival.xlsx", "Base_Final_RCP_v6.xlsx",
    ]
    hashes_before = {name: sha256(SOURCE_DIR / name) for name in source_files}
    observations = annual_observations()
    periods = presidential_periods()
    crises = crisis_episodes()
    sources = source_registry(hashes_before)
    validate_canonical(observations, periods, crises, sources)
    sample_checks = verify_samples(observations, periods, crises)
    hashes_after = {name: sha256(SOURCE_DIR / name) for name in source_files}
    if hashes_before != hashes_after:
        raise RuntimeError("Los archivos originales cambiaron durante la importación")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payloads = {
        "observations.json": observations,
        "presidential-periods.json": periods,
        "crisis-episodes.json": crises,
        "sources.json": sources,
    }
    for name, payload in payloads.items():
        (OUTPUT_DIR / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    by_indicator = {}
    for indicator in UNITS:
        for code in COUNTRIES:
            rows = [item for item in observations if item["indicatorId"] == indicator and item["countryCode"] == code]
            by_indicator[f"{code}:{indicator}"] = {"count": len(rows), "startYear": min(item["year"] for item in rows), "endYear": max(item["year"] for item in rows)}
    report = {
        "scope": {"countries": sorted(COUNTRIES), "indicators": sorted(UNITS), "presidentialPeriods": len(periods), "crisisEpisodes": len(crises)},
        "counts": {"observations": len(observations), "verifiedAgainstOriginalSample": len(sample_checks), "byIndicator": by_indicator},
        "sourceHashes": hashes_after,
        "dictionaryDifferences": [
            "variables_economicas.csv usa GDP_pc_PPP_2021; la beta preliminar mencionaba NY.GDP.PCAP.PP.KD. Se adopta exclusivamente la columna efectiva.",
            "Base_Final_RCP_v6.xlsx: el codebook menciona year, country, type, horizontal_actor, vertical_actor, target, exit, flag_review, fecha_pivote y pivote_justificacion; la hoja contiene año, pais, tipo, actor_horizontal, actor_vertical, objetivo, salida, edited, fecha_peak y peak_justificacion.",
            "comparative survival.xlsx contiene Sheet1 y columnas name/surname separadas; no se incorporan nombres desde Hegemony.dta.",
        ],
        "sampleChecks": sample_checks,
        "verificationMeaning": "verified significa que el registro importado coincide con la fila del archivo local. No significa validación externa, bibliográfica ni metodológica de la fuente.",
        "originalFilesUnmodified": True,
    }
    (OUTPUT_DIR / "import-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["counts"], ensure_ascii=False, indent=2))
    print(f"Muestras cotejadas: {len(sample_checks)}. Originales sin modificaciones.")


if __name__ == "__main__":
    main()
