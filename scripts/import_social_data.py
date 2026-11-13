#!/usr/bin/env python3
"""Importa el paquete social WDI de ARG y CHL con respaldo y trazabilidad.

No lee ni modifica materiales_curso ni reescribe las observaciones de fases previas.
La ficha oficial de cada indicador se descarga y valida antes de solicitar sus datos.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "canonical"
RAW_DIR = ROOT / "data" / "raw" / "world-bank"
COUNTRIES = ("ARG", "CHL")
API_ROOT = "https://api.worldbank.org/v2"
ACCESS_DATE = date.today().isoformat()
CURRENT_YEAR = date.today().year
PERCENT_TOLERANCE = 0.2

CONFIGS: list[dict[str, Any]] = [
    {
        "code": "SP.POP.TOTL", "id": "total-population", "name": "Population, total",
        "shortName": "Población total", "theme": "Población", "variant": "Estimación de mitad de año",
        "unit": "millones de personas", "originalUnit": "personas", "scale": 1_000_000,
        "definition": "Población total según la definición de facto, que cuenta a todos los residentes con independencia de su situación legal o ciudadanía; estimaciones de mitad de año.",
        "notes": "El valor original en personas se divide por 1.000.000 solo para presentación. No se redondea el dato canónico normalizado.",
        "methodology": {"id": "wdi-sp-pop-totl-midyear"},
    },
    {
        "code": "SP.POP.0014.TO.ZS", "id": "population-age-0-14", "name": "Population ages 0-14 (% of total population)",
        "shortName": "Población de 0 a 14 años", "theme": "Composición de la población", "variant": "Participación sobre población total",
        "unit": "% de la población total", "originalUnit": "% de la población total", "scale": 1,
        "definition": "Población de 0 a 14 años como porcentaje de la población total, según la definición de facto de población.",
        "notes": "Componente de la composición etaria; no se ajusta para forzar una suma exacta.",
        "methodology": {"id": "wdi-wpp-age-0-14-share", "compositionGroup": "age", "compositionTolerance": PERCENT_TOLERANCE},
    },
    {
        "code": "SP.POP.1564.TO.ZS", "id": "population-age-15-64", "name": "Population ages 15-64 (% of total population)",
        "shortName": "Población de 15 a 64 años", "theme": "Composición de la población", "variant": "Participación sobre población total",
        "unit": "% de la población total", "originalUnit": "% de la población total", "scale": 1,
        "definition": "Población de 15 a 64 años como porcentaje de la población total, según la definición de facto de población.",
        "notes": "Componente de la composición etaria; compatible con los otros dos grupos WPP cargados.",
        "methodology": {"id": "wdi-wpp-age-15-64-share", "compositionGroup": "age", "compositionTolerance": PERCENT_TOLERANCE},
    },
    {
        "code": "SP.POP.65UP.TO.ZS", "id": "population-age-65-plus", "name": "Population ages 65 and above (% of total population)",
        "shortName": "Población de 65 años o más", "theme": "Composición de la población", "variant": "Participación sobre población total",
        "unit": "% de la población total", "originalUnit": "% de la población total", "scale": 1,
        "definition": "Población de 65 años o más como porcentaje de la población total, según la definición de facto de población.",
        "notes": "Componente de la composición etaria; compatible con los otros dos grupos WPP cargados.",
        "methodology": {"id": "wdi-wpp-age-65-plus-share", "compositionGroup": "age", "compositionTolerance": PERCENT_TOLERANCE},
    },
    {
        "code": "SP.URB.TOTL.IN.ZS", "id": "urban-population-share", "name": "Urban population (% of total population)",
        "shortName": "Población urbana", "theme": "Composición de la población", "variant": "Definiciones urbanas nacionales armonizadas por ONU",
        "unit": "% de la población total", "originalUnit": "% de la población total", "scale": 1,
        "definition": "Población que vive en áreas urbanas definidas por las oficinas nacionales de estadística; datos recopilados y suavizados por la División de Población de la ONU.",
        "notes": "Se presenta junto con el componente rural como composición de un mismo total. Las definiciones urbanas nacionales limitan la comparabilidad.",
        "methodology": {"id": "wdi-wup-urban-share", "compositionGroup": "residence", "compositionTolerance": PERCENT_TOLERANCE, "comparabilityNotes": "Las áreas urbanas se definen según criterios de las oficinas estadísticas nacionales."},
    },
    {
        "code": "SP.RUR.TOTL.ZS", "id": "rural-population-share", "name": "Rural population (% of total population)",
        "shortName": "Población rural", "theme": "Composición de la población", "variant": "Residuo entre población total y urbana",
        "unit": "% de la población total", "originalUnit": "% de la población total", "scale": 1,
        "definition": "Población que vive en áreas rurales según definiciones de las oficinas nacionales de estadística; se calcula como diferencia entre población total y urbana.",
        "notes": "La fuente lo define como componente residual del mismo total; se visualiza como composición y no como serie independiente.",
        "methodology": {"id": "wdi-wup-rural-residual-share", "compositionGroup": "residence", "compositionTolerance": PERCENT_TOLERANCE, "comparabilityNotes": "Componente residual de la población urbana; comparte las definiciones territoriales nacionales."},
    },
    {
        "code": "SI.POV.NAHC", "id": "poverty-national-headcount", "name": "Poverty headcount ratio at national poverty lines (% of population)",
        "shortName": "Pobreza · línea nacional", "theme": "Pobreza", "variant": "Incidencia · línea nacional",
        "unit": "% de la población", "originalUnit": "% de la población", "scale": 1,
        "definition": "Porcentaje de la población que vive por debajo de la línea o líneas nacionales de pobreza; estimaciones basadas en subgrupos de encuestas de hogares ponderados por población.",
        "notes": "Las líneas nacionales son específicas de cada país. WDI no documenta un valor monetario único para esta serie; ese campo queda sin dato y no se infiere.",
        "methodology": {"id": "wdi-pip-national-headcount", "lineType": "national", "povertyLine": None, "monetaryUnit": None, "referenceYear": None, "measure": "incidence", "comparabilityNotes": "No comparar directamente las líneas nacionales entre países ni empalmarlas con líneas internacionales. Los años sin encuesta permanecen sin dato."},
    },
    {
        "code": "SI.POV.DDAY", "id": "poverty-international-3-2021ppp", "name": "Poverty headcount ratio at $3.00 a day (2021 PPP) (% of population)",
        "shortName": "Pobreza · USD 3,00 PPA 2021", "theme": "Pobreza", "variant": "Incidencia · línea internacional USD 3,00 · PPA 2021",
        "unit": "% de la población", "originalUnit": "% de la población", "scale": 1,
        "definition": "Porcentaje de la población que vive con menos de USD 3,00 por día a precios ajustados por paridad de poder adquisitivo de 2021.",
        "notes": "Variante metodológica independiente. Las revisiones de PPA impiden comparar estos valores con ediciones calculadas con una PPA anterior.",
        "methodology": {"id": "wdi-pip-international-3-2021ppp", "lineType": "international", "povertyLine": 3.0, "monetaryUnit": "USD por persona y día, PPA", "referenceYear": 2021, "measure": "incidence", "comparabilityNotes": "No combinar con líneas nacionales ni con líneas internacionales de otras versiones de PPA. Los años sin encuesta permanecen sin dato."},
    },
    {
        "code": "SE.ADT.LITR.ZS", "id": "adult-literacy-rate", "name": "Literacy rate, adult total (% of people ages 15 and above)",
        "shortName": "Alfabetización adulta", "theme": "Educación", "variant": "Personas de 15 años o más · UNESCO-UIS",
        "unit": "% de personas de 15 años o más", "originalUnit": "% de personas de 15 años o más", "scale": 1,
        "definition": "Porcentaje de personas de 15 años o más que pueden leer y escribir, comprendiendo una afirmación breve y sencilla sobre su vida cotidiana.",
        "notes": "Prueba educacional con definición clara y cobertura muy espaciada. Los puntos no se conectan a través de años sin observación.",
        "methodology": {"id": "unesco-uis-adult-literacy-15-plus", "comparabilityNotes": "La cobertura depende de censos o encuestas disponibles; no se interpola entre años."},
    },
]

COMPOSITIONS = {
    "age": ("population-age-0-14", "population-age-15-64", "population-age-65-plus"),
    "residence": ("urban-population-share", "rural-population-share"),
}


def fetch_json(url: str) -> tuple[bytes, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "RepositorioHistoricoAL/0.4 (importacion academica reproducible)"})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read()
    return raw, json.loads(raw)


def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def course_hashes() -> dict[str, str]:
    source_dir = ROOT / "materiales_curso"
    return {
        str(path.relative_to(ROOT)): sha256_file(path)
        for path in sorted(source_dir.rglob("*")) if path.is_file()
    }


def previous_core() -> dict[str, tuple[Any, ...]]:
    path = OUTPUT_DIR / "social-observations.json"
    if not path.exists():
        return {}
    return {
        item["id"]: (item["countryCode"], item["indicatorId"], item["year"], item["originalValue"], item["normalizedValue"], item["provenance"].get("methodologyVariant"))
        for item in json.loads(path.read_text(encoding="utf-8"))
    }


def observation_core(item: dict[str, Any]) -> tuple[Any, ...]:
    return (item["countryCode"], item["indicatorId"], item["year"], item["originalValue"], item["normalizedValue"], item["provenance"].get("methodologyVariant"))


def validate_social(observations: list[dict[str, Any]], sources: list[dict[str, Any]]) -> dict[str, Any]:
    by_id = {config["id"]: config for config in CONFIGS}
    source_ids = {source["id"] for source in sources}
    version_ids = {version["id"] for source in sources for version in source["versions"]}
    seen: set[tuple[str, str, str, int]] = set()
    lookup: dict[tuple[str, str, int], dict[str, Any]] = {}
    null_years_omitted = 0
    for item in observations:
        config = by_id.get(item["indicatorId"])
        if not config:
            raise ValueError(f"Indicador desconocido: {item['indicatorId']}")
        if item["countryCode"] not in COUNTRIES:
            raise ValueError(f"País desconocido: {item['countryCode']}")
        if not isinstance(item["year"], int) or not 1950 <= item["year"] <= CURRENT_YEAR:
            raise ValueError(f"Año desconocido o fuera de alcance: {item['id']}")
        variant = item["provenance"].get("methodologyVariant")
        key = (item["countryCode"], item["indicatorId"], variant, item["year"])
        if key in seen:
            raise ValueError(f"Duplicado país-año-indicador-variante: {key}")
        seen.add(key)
        lookup[(item["countryCode"], item["indicatorId"], item["year"])] = item
        for field in ("originalValue", "normalizedValue"):
            value = item[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"Valor numérico almacenado como texto o no finito: {item['id']}")
        if config["code"] == "SP.POP.TOTL":
            if item["normalizedValue"] <= 0:
                raise ValueError(f"Población fuera de rango: {item['id']}")
            if not math.isclose(item["normalizedValue"], item["originalValue"] / 1_000_000, rel_tol=0, abs_tol=1e-12):
                raise ValueError(f"Normalización de población incorrecta: {item['id']}")
        elif not 0 <= item["normalizedValue"] <= 100:
            raise ValueError(f"Porcentaje fuera de rango: {item['id']}")
        prov = item["provenance"]
        if prov["unit"] != config["unit"] or prov.get("originalUnit") != config["originalUnit"]:
            raise ValueError(f"Unidad incompatible dentro de la serie: {item['id']}")
        if variant != config["variant"] or prov.get("methodologyId") != config["methodology"]["id"]:
            raise ValueError(f"Cambio de metodología no registrado: {item['id']}")
        if prov["sourceId"] not in source_ids or prov["datasetVersionId"] not in version_ids:
            raise ValueError(f"Observación sin fuente o versión: {item['id']}")
        if not prov.get("sourceFile") or not prov.get("sourceRow") or not prov.get("url") or not prov.get("accessDate"):
            raise ValueError(f"Observación sin procedencia completa: {item['id']}")
        if item["valueStatus"] != "available":
            raise ValueError(f"Año sin dato convertido incorrectamente en observación o cero: {item['id']}")

    composition_checks: list[dict[str, Any]] = []
    for group, indicator_ids in COMPOSITIONS.items():
        for country in COUNTRIES:
            years = sorted({year for code, indicator, year in lookup if code == country and indicator in indicator_ids})
            for year in years:
                rows = [lookup.get((country, indicator, year)) for indicator in indicator_ids]
                if any(row is None for row in rows):
                    raise ValueError(f"Composición {group} incompleta: {country}-{year}")
                total = sum(float(row["normalizedValue"]) for row in rows if row)
                if abs(total - 100) > PERCENT_TOLERANCE:
                    raise ValueError(f"Composición {group} incompatible: {country}-{year} suma {total}")
                composition_checks.append({"group": group, "countryCode": country, "year": year, "sum": total, "tolerance": PERCENT_TOLERANCE, "result": "dentro de tolerancia"})
    return {"compositionChecks": composition_checks, "nullYearsOmitted": null_years_omitted, "percentageRange": "0–100", "populationUnitTransformTolerance": 1e-12}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    before_course = course_hashes()
    previous = previous_core()
    observations: list[dict[str, Any]] = []
    indicator_payloads: list[dict[str, Any]] = []
    versions: list[dict[str, Any]] = []
    raw_files: dict[str, str] = {}
    metadata_audit: list[dict[str, Any]] = []
    sample_candidates: dict[str, dict[str, Any]] = {}
    null_years_omitted = 0

    for config in CONFIGS:
        code = config["code"]
        metadata_url = f"{API_ROOT}/indicator/{code}?format=json"
        metadata_raw, metadata = fetch_json(metadata_url)
        if not isinstance(metadata, list) or len(metadata) != 2 or not metadata[1]:
            raise ValueError(f"Ficha oficial no disponible: {code}")
        official = metadata[1][0]
        if official.get("id") != code or official.get("name") != config["name"] or not official.get("sourceNote") or official.get("source", {}).get("value") != "World Development Indicators":
            raise ValueError(f"La ficha oficial no coincide con el indicador configurado: {code}")
        metadata_name = f"{code}-metadata.json"
        (RAW_DIR / metadata_name).write_bytes(metadata_raw)
        raw_files[str((RAW_DIR / metadata_name).relative_to(ROOT))] = sha256_bytes(metadata_raw)
        metadata_audit.append({"indicator": code, "metadataUrl": metadata_url, "accessDate": ACCESS_DATE, "officialName": official["name"], "definitionVerified": True, "sourceOrganization": official.get("sourceOrganization"), "licenseUrl": "https://datacatalog.worldbank.org/public-licenses"})

        data_url = f"{API_ROOT}/country/ARG;CHL/indicator/{code}?format=json&per_page=20000&date=1950:{CURRENT_YEAR}"
        data_raw, payload = fetch_json(data_url)
        if not isinstance(payload, list) or len(payload) != 2 or not isinstance(payload[1], list):
            raise ValueError(f"Respuesta de datos inesperada: {code}")
        header, rows = payload
        if header.get("pages") != 1:
            raise ValueError(f"Paginación incompleta: {code}")
        last_updated = header.get("lastupdated")
        if not last_updated:
            raise ValueError(f"WDI no informó fecha de actualización: {code}")
        data_name = f"{code}-ARG-CHL.json"
        (RAW_DIR / data_name).write_bytes(data_raw)
        raw_files[str((RAW_DIR / data_name).relative_to(ROOT))] = sha256_bytes(data_raw)
        version_id = f"wdi-{config['id']}-{last_updated}"
        versions.append({
            "id": version_id, "datasetName": f"WDI · {code}", "version": f"Actualización WDI {last_updated}",
            "publicationDate": None, "accessDate": ACCESS_DATE, "license": "CC BY 4.0 (con términos adicionales del catálogo del Banco Mundial)",
            "status": "imported", "sourceFile": str((RAW_DIR / data_name).relative_to(ROOT)), "sourceSheet": None,
            "sha256": sha256_bytes(data_raw),
        })
        indicator_payloads.append({
            "id": config["id"], "domain": "society", "theme": config["theme"], "variant": config["variant"],
            "family": "Sociedad, demografía y condiciones de vida", "name": config["shortName"],
            "shortName": config["shortName"], "kind": "continuous", "unit": config["unit"], "definition": config["definition"],
            "originalVariable": code, "sourceIds": ["world-bank-wdi"], "mapCompatible": False, "methodology": config["methodology"],
        })

        valid_by_country = {country: [row for row in rows if row.get("countryiso3code") == country and row.get("value") is not None] for country in COUNTRIES}
        for country, valid_rows in valid_by_country.items():
            if not valid_rows:
                raise ValueError(f"Cobertura efectiva ausente para {country}: {code}")
        for source_row, row in enumerate(rows, start=1):
            country = row.get("countryiso3code")
            if country not in COUNTRIES or row.get("indicator", {}).get("id") != code:
                raise ValueError(f"País o indicador desconocido en respuesta: {code}, fila {source_row}")
            year = int(row["date"])
            value = row.get("value")
            if value is None:
                null_years_omitted += 1
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"Valor no numérico en fuente: {code}, fila {source_row}")
            country_valid = valid_by_country[country]
            start, end = min(int(item["date"]) for item in country_valid), max(int(item["date"]) for item in country_valid)
            normalized = float(value) / config["scale"]
            item = {
                "id": f"obs-{country.lower()}-{config['id']}-{year}", "countryCode": country, "indicatorId": config["id"], "year": year,
                "originalValue": value, "normalizedValue": normalized, "valueStatus": "available",
                "provenance": {
                    "sourceId": "world-bank-wdi", "datasetVersionId": version_id, "originalVariable": code,
                    "definition": config["definition"], "unit": config["unit"], "originalUnit": config["originalUnit"],
                    "coverage": {"startYear": start, "endYear": end, "territorialLevel": "national"},
                    "transformations": ["Valor original dividido por 1.000.000 para expresar millones; sin redondeo ni imputación."] if config["scale"] != 1 else ["Lectura directa del valor numérico; sin cambio de escala, imputación ni interpolación."],
                    "verificationStatus": "unverified", "sourceFile": str((RAW_DIR / data_name).relative_to(ROOT)),
                    "sourceSheet": None, "sourceRow": source_row, "url": data_url, "accessDate": ACCESS_DATE,
                    "methodologyId": config["methodology"]["id"], "methodologyVariant": config["variant"], "notes": config["notes"],
                },
            }
            observations.append(item)
            sample_key = f"{country}:{config['id']}"
            if sample_key not in sample_candidates or year > sample_candidates[sample_key]["year"]:
                sample_candidates[sample_key] = item

    sources = [{
        "id": "world-bank-wdi", "institution": "Banco Mundial", "title": "World Development Indicators (WDI)",
        "url": "https://data.worldbank.org/indicator", "bibliographicReference": f"Banco Mundial, World Development Indicators, API v2. Acceso: {ACCESS_DATE}. Las actualizaciones y variables originales se registran por indicador.",
        "metadataNote": "Fichas oficiales y respuestas JSON conservadas por indicador. Licencia predeterminada de datos abiertos producidos por el Banco Mundial: CC BY 4.0, sujeta a los términos adicionales de https://datacatalog.worldbank.org/public-licenses. Las organizaciones de origen figuran en cada ficha oficial.",
        "versions": versions,
    }]
    validation = validate_social(observations, sources)
    validation["nullYearsOmitted"] = null_years_omitted

    sample_checks = []
    for key in sorted(sample_candidates):
        item = sample_candidates[key]
        prov = item["provenance"]
        raw = json.loads((ROOT / prov["sourceFile"]).read_text(encoding="utf-8"))
        original = raw[1][prov["sourceRow"] - 1]
        passed = original["value"] == item["originalValue"] and int(original["date"]) == item["year"] and original["countryiso3code"] == item["countryCode"] and original["indicator"]["id"] == prov["originalVariable"]
        if not passed:
            raise ValueError(f"Falló el cotejo social: {item['id']}")
        prov["verificationStatus"] = "verified"
        prov["verificationNote"] = "Cotejado automatizadamente contra el registro de la respuesta JSON original; no equivale a validación metodológica independiente."
        sample_checks.append({"id": item["id"], "sourceFile": prov["sourceFile"], "sourceRow": prov["sourceRow"], "checked": f"{prov['originalVariable']}={item['originalValue']}; year={item['year']}; country={item['countryCode']}", "result": "coincide"})

    current = {item["id"]: observation_core(item) for item in observations}
    changed = sorted(key for key in current.keys() & previous.keys() if current[key] != previous[key])
    update = {"previousObservationCount": len(previous), "addedIds": sorted(current.keys() - previous.keys()), "removedIds": sorted(previous.keys() - current.keys()), "changedIds": changed, "unchangedCount": sum(current[key] == previous[key] for key in current.keys() & previous.keys())}
    by_indicator = {}
    for config in CONFIGS:
        for country in COUNTRIES:
            rows = [item for item in observations if item["indicatorId"] == config["id"] and item["countryCode"] == country]
            by_indicator[f"{country}:{config['id']}"] = {"count": len(rows), "startYear": min(item["year"] for item in rows), "endYear": max(item["year"] for item in rows)}
    report = {
        "scope": {"countries": list(COUNTRIES), "indicators": [config["code"] for config in CONFIGS], "canonicalIndicators": [config["id"] for config in CONFIGS]},
        "accessDate": ACCESS_DATE, "counts": {"observations": len(observations), "verifiedAgainstOriginalSample": len(sample_checks), "byIndicator": by_indicator},
        "metadataAudit": metadata_audit, "rawFiles": raw_files, "update": update, "validations": validation,
        "compositionTolerancePercentagePoints": PERCENT_TOLERANCE, "sampleChecks": sample_checks,
        "verificationMeaning": "verified significa coincidencia con el registro de la respuesta JSON original; no es una validación metodológica independiente.",
        "pendingSeries": [
            {"indicator": "SI.POV.LMIC y SI.POV.UMIC", "status": "pendiente", "reason": "No se cargan líneas internacionales adicionales sin una necesidad analítica específica; nunca deben empalmarse con SI.POV.DDAY."},
            {"indicator": "Otras medidas educativas", "status": "pendiente", "reason": "Requieren revisar nivel educativo, población de referencia y cobertura antes de elegir una variante adicional."},
        ],
        "originalCourseFilesUnmodified": before_course == course_hashes(),
    }
    if before_course != course_hashes():
        raise RuntimeError("materiales_curso cambió durante la importación social")

    payloads = {"social-observations.json": observations, "social-indicators.json": indicator_payloads, "social-sources.json": sources, "social-import-report.json": report}
    for name, payload in payloads.items():
        temporary = OUTPUT_DIR / f".{name}.tmp"
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, OUTPUT_DIR / name)
    print(json.dumps({"observations": len(observations), "samples": len(sample_checks), "added": len(update["addedIds"]), "changed": len(changed), "removed": len(update["removedIds"])}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
