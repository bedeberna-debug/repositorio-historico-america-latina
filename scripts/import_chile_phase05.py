#!/usr/bin/env python3
"""Importa series WDI de Chile para la fase 05 con procedencia reproducible.

No modifica las series anteriores ni materiales_curso. Cada indicador conserva
su ficha, respuesta JSON, versión WDI, unidad original y cobertura efectiva.
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
RAW_DIR = ROOT / "data" / "raw" / "world-bank" / "chile-fase05"
API_ROOT = "https://api.worldbank.org/v2"
ACCESS_DATE = date.today().isoformat()
CURRENT_YEAR = date.today().year
SOURCE_ID = "world-bank-wdi-chile-fase05"
EMPLOYMENT_IDS = ("employment-agriculture-share", "employment-industry-share", "employment-services-share")


def config(
    code: str, id: str, short_name: str, theme: str, variant: str, unit: str,
    definition: str, domain: str = "economy", original_unit: str | None = None,
    scale: float = 1, value_origin: str = "observed", notes: str = "",
    methodology: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "code": code, "id": id, "shortName": short_name, "theme": theme,
        "variant": variant, "unit": unit, "originalUnit": original_unit or unit,
        "definition": definition, "domain": domain, "scale": scale,
        "valueOrigin": value_origin, "notes": notes,
        "methodology": methodology or {"id": f"wdi-{code.lower()}"},
    }


CONFIGS = [
    config("NY.GDP.MKTP.KD", "gdp-total-constant-2015-usd", "PIB total real", "Actividad económica", "USD constantes de 2015", "miles de millones de USD constantes de 2015", "Producto interno bruto a precios constantes de 2015, expresado en dólares estadounidenses; la normalización solo cambia la escala de presentación.", original_unit="USD constantes de 2015", scale=1_000_000_000, notes="No es una serie PPA ni nominal. El valor original se conserva en USD y el normalizado en miles de millones."),
    config("NY.GDP.MKTP.KD.ZG", "gdp-growth-annual", "Crecimiento del PIB", "Actividad económica", "Tasa anual · PIB real", "% anual", "Tasa de crecimiento anual del PIB a precios constantes, calculada por la fuente en moneda local constante.", notes="No se recalcula desde el PIB expresado en USD; se conserva la tasa publicada por WDI."),
    config("FP.CPI.TOTL.ZG", "inflation-cpi-annual", "Inflación IPC", "Precios", "Variación anual del IPC", "% anual", "Variación porcentual anual del índice de precios al consumidor, según el promedio anual publicado por WDI."),
    config("SL.UEM.TOTL.ZS", "unemployment-ilo-modeled", "Desempleo · OIT modelado", "Trabajo", "Estimación modelada OIT · % de la fuerza laboral", "% de la fuerza laboral", "Personas desempleadas como porcentaje de la fuerza laboral; estimación modelada de la OIT armonizada por WDI.", value_origin="source_estimate", notes="Estimación de la fuente, no observación directa ni cálculo del proyecto."),
    config("PA.NUS.FCRF", "official-exchange-rate", "Tipo de cambio oficial", "Precios y tipo de cambio", "Promedio anual · moneda local por USD", "CLP por USD, promedio anual", "Tipo de cambio oficial promedio anual: unidades de moneda local por dólar estadounidense.", notes="Promedio anual publicado por la fuente; no representa valores de fin de período."),
    config("FR.INR.LEND", "lending-interest-rate", "Tasa de interés activa", "Tasas de interés", "Tasa bancaria activa", "% anual", "Tasa que cobran los bancos por préstamos a clientes preferentes, según la definición y cobertura de WDI.", notes="No se interpreta como tasa de política monetaria ni como tasa real."),
    config("NV.AGR.TOTL.ZS", "gdp-agriculture-share", "PIB · agricultura", "Composición del PIB por actividad", "Valor agregado · % del PIB", "% del PIB", "Valor agregado de agricultura, silvicultura y pesca como porcentaje del PIB.", notes="Componente por actividad; no apilar como total completo sin impuestos netos y otros ajustes."),
    config("NV.IND.TOTL.ZS", "gdp-industry-share", "PIB · industria", "Composición del PIB por actividad", "Valor agregado · % del PIB", "% del PIB", "Valor agregado de la industria, incluida la construcción, como porcentaje del PIB.", notes="Componente por actividad; no apilar como total completo sin impuestos netos y otros ajustes."),
    config("NV.SRV.TOTL.ZS", "gdp-services-share", "PIB · servicios", "Composición del PIB por actividad", "Valor agregado · % del PIB", "% del PIB", "Valor agregado de los servicios como porcentaje del PIB.", notes="Componente por actividad; no apilar como total completo sin impuestos netos y otros ajustes."),
    config("SI.POV.GINI", "gini-index", "Índice de Gini", "Distribución de ingresos", "Desigualdad de ingreso o consumo según encuesta", "índice de 0 a 100", "Índice de Gini de la distribución del ingreso o consumo; cero representa igualdad perfecta y cien desigualdad perfecta.", domain="society", notes="Cobertura irregular basada en encuestas. Revisar las notas de cada año antes de comparar instrumentos o agregados de bienestar."),
    config("SL.TLF.CACT.ZS", "labor-force-participation-rate", "Participación laboral", "Ocupación y actividad", "Estimación modelada OIT · 15 años o más", "% de la población de 15 años o más", "Proporción de la población de 15 años o más que participa económicamente; estimación modelada de la OIT.", domain="society", value_origin="source_estimate", notes="Estimación de la fuente; no es una observación directa del proyecto."),
    config("SL.AGR.EMPL.ZS", "employment-agriculture-share", "Empleo · agricultura", "Composición laboral", "Estimación modelada OIT · % del empleo", "% del empleo total", "Empleo en agricultura como porcentaje del empleo total; estimación modelada de la OIT.", domain="society", value_origin="source_estimate", methodology={"id": "wdi-ilo-modeled-employment-agriculture", "compositionGroup": "employment", "compositionTolerance": 0.2, "comparabilityNotes": "Los tres componentes comparten la estimación modelada OIT y se validan como composición del empleo total."}),
    config("SL.IND.EMPL.ZS", "employment-industry-share", "Empleo · industria", "Composición laboral", "Estimación modelada OIT · % del empleo", "% del empleo total", "Empleo en industria como porcentaje del empleo total; estimación modelada de la OIT.", domain="society", value_origin="source_estimate", methodology={"id": "wdi-ilo-modeled-employment-industry", "compositionGroup": "employment", "compositionTolerance": 0.2, "comparabilityNotes": "Los tres componentes comparten la estimación modelada OIT y se validan como composición del empleo total."}),
    config("SL.SRV.EMPL.ZS", "employment-services-share", "Empleo · servicios", "Composición laboral", "Estimación modelada OIT · % del empleo", "% del empleo total", "Empleo en servicios como porcentaje del empleo total; estimación modelada de la OIT.", domain="society", value_origin="source_estimate", methodology={"id": "wdi-ilo-modeled-employment-services", "compositionGroup": "employment", "compositionTolerance": 0.2, "comparabilityNotes": "Los tres componentes comparten la estimación modelada OIT y se validan como composición del empleo total."}),
    config("EG.ELC.ACCS.ZS", "electricity-access", "Acceso a electricidad", "Servicios básicos", "% de la población", "% de la población", "Porcentaje de la población con acceso a electricidad, según la base WDI y sus fuentes de origen.", domain="society", notes="No se infiere cobertura para años sin valor publicado."),
    config("GC.XPN.TOTL.GD.ZS", "government-expense-share-gdp", "Gasto público", "Presupuesto público", "Gasto · % del PIB", "% del PIB", "Gasto del gobierno como porcentaje del PIB según la variable GC.XPN.TOTL.GD.ZS; el alcance institucional exacto se conserva en la ficha oficial.", notes="No combinar con ingresos para inferir balance sin revisar cobertura institucional y tratamiento contable."),
    config("GC.REV.XGRT.GD.ZS", "government-revenue-share-gdp", "Ingresos públicos sin donaciones", "Presupuesto público", "Ingresos excluyendo donaciones · % del PIB", "% del PIB", "Ingresos públicos excluyendo donaciones como porcentaje del PIB, según WDI.", notes="No equivalen a ingresos totales con donaciones ni se combinan automáticamente con gasto."),
    config("GC.DOD.TOTL.GD.ZS", "central-government-debt-share-gdp", "Deuda del gobierno central", "Deuda pública", "Gobierno central · % del PIB", "% del PIB", "Deuda bruta del gobierno central como porcentaje del PIB; no representa necesariamente la deuda del gobierno general o del sector público.", notes="Cobertura muy irregular. No se extrapola ni se denomina deuda pública general."),
]


def fetch_json(url: str) -> tuple[bytes, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "RepositorioHistoricoAL/0.5 (investigacion academica reproducible)"})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read()
    return raw, json.loads(raw)


def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def course_hashes() -> dict[str, str]:
    source_dir = ROOT / "materiales_curso"
    return {str(path.relative_to(ROOT)): sha256_file(path) for path in sorted(source_dir.rglob("*")) if path.is_file()}


def core(item: dict[str, Any]) -> tuple[Any, ...]:
    return (item["countryCode"], item["indicatorId"], item["year"], item["originalValue"], item["normalizedValue"], item["valueOrigin"], item["provenance"].get("methodologyVariant"))


def validate(observations: list[dict[str, Any]]) -> dict[str, Any]:
    by_id = {item["id"]: item for item in CONFIGS}
    seen: set[tuple[str, str, str, int]] = set()
    lookup: dict[tuple[str, int], dict[str, Any]] = {}
    composition_checks = []
    for item in observations:
        cfg = by_id[item["indicatorId"]]
        key = (item["countryCode"], item["indicatorId"], item["provenance"]["methodologyVariant"], item["year"])
        if key in seen:
            raise ValueError(f"Duplicado: {key}")
        seen.add(key)
        lookup[(item["indicatorId"], item["year"])] = item
        if item["countryCode"] != "CHL" or not 1950 <= item["year"] <= CURRENT_YEAR:
            raise ValueError(f"Fuera de alcance: {item['id']}")
        if item["valueOrigin"] != cfg["valueOrigin"] or item["originalFrequency"] != "annual":
            raise ValueError(f"Origen o frecuencia incorrectos: {item['id']}")
        for field in ("originalValue", "normalizedValue"):
            value = item[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"Valor no numérico: {item['id']}")
        expected = float(item["originalValue"]) / cfg["scale"]
        if not math.isclose(float(item["normalizedValue"]), expected, rel_tol=0, abs_tol=1e-12):
            raise ValueError(f"Normalización incorrecta: {item['id']}")
        if cfg["scale"] != 1 and cfg["id"] != "gdp-total-constant-2015-usd":
            raise ValueError(f"Escala no registrada: {item['id']}")
        if cfg["unit"].startswith("%") and cfg["id"] not in {"gdp-growth-annual", "inflation-cpi-annual", "lending-interest-rate", "government-expense-share-gdp", "government-revenue-share-gdp", "central-government-debt-share-gdp"} and not 0 <= item["normalizedValue"] <= 100:
            raise ValueError(f"Porcentaje fuera de rango: {item['id']}")
        if cfg["id"] == "gini-index" and not 0 <= item["normalizedValue"] <= 100:
            raise ValueError(f"Gini fuera de rango: {item['id']}")
        if item["valueStatus"] != "available":
            raise ValueError(f"Vacío convertido en cero: {item['id']}")
    years = sorted({year for indicator, year in lookup if indicator in EMPLOYMENT_IDS})
    for year in years:
        rows = [lookup.get((id, year)) for id in EMPLOYMENT_IDS]
        if any(row is None for row in rows):
            raise ValueError(f"Composición laboral incompleta: {year}")
        total = sum(float(row["normalizedValue"]) for row in rows if row)
        if abs(total - 100) > 0.2:
            raise ValueError(f"Composición laboral incompatible: {year}, suma {total}")
        composition_checks.append({"group": "employment", "countryCode": "CHL", "year": year, "sum": total, "tolerance": 0.2, "result": "dentro de tolerancia"})
    return {"duplicates": 0, "nullsImported": 0, "compositionChecks": composition_checks, "origins": {origin: sum(item["valueOrigin"] == origin for item in observations) for origin in ("observed", "source_estimate", "derived", "inferred", "imputed")}}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    before_course = course_hashes()
    previous_path = OUTPUT_DIR / "chile-observations.json"
    previous_list = json.loads(previous_path.read_text(encoding="utf-8")) if previous_path.exists() else []
    previous = {item["id"]: core(item) for item in previous_list}
    observations: list[dict[str, Any]] = []
    indicators: list[dict[str, Any]] = []
    versions: list[dict[str, Any]] = []
    raw_files: dict[str, str] = {}
    metadata_audit = []
    samples: dict[str, dict[str, Any]] = {}
    null_years_omitted = 0

    for cfg in CONFIGS:
        code = cfg["code"]
        metadata_url = f"{API_ROOT}/indicator/{code}?format=json"
        metadata_raw, metadata = fetch_json(metadata_url)
        if not isinstance(metadata, list) or len(metadata) != 2 or not metadata[1]:
            raise ValueError(f"Ficha oficial no disponible: {code}")
        official = metadata[1][0]
        if official.get("id") != code or not official.get("sourceNote") or official.get("source", {}).get("value") != "World Development Indicators":
            raise ValueError(f"Ficha incompatible: {code}")
        metadata_name = f"{code}-metadata.json"
        (RAW_DIR / metadata_name).write_bytes(metadata_raw)
        raw_files[str((RAW_DIR / metadata_name).relative_to(ROOT))] = sha256_bytes(metadata_raw)
        metadata_audit.append({"indicator": code, "metadataUrl": metadata_url, "accessDate": ACCESS_DATE, "officialName": official.get("name"), "definitionReviewed": bool(official.get("sourceNote")), "sourceOrganization": official.get("sourceOrganization"), "licenseUrl": "https://datacatalog.worldbank.org/public-licenses"})

        data_url = f"{API_ROOT}/country/CHL/indicator/{code}?format=json&per_page=20000&date=1950:{CURRENT_YEAR}"
        data_raw, payload = fetch_json(data_url)
        if not isinstance(payload, list) or len(payload) != 2 or not isinstance(payload[1], list):
            raise ValueError(f"Respuesta inesperada: {code}")
        header, rows = payload
        if header.get("pages") != 1 or not header.get("lastupdated"):
            raise ValueError(f"Paginación o versión incompleta: {code}")
        last_updated = header["lastupdated"]
        data_name = f"{code}-CHL.json"
        (RAW_DIR / data_name).write_bytes(data_raw)
        raw_files[str((RAW_DIR / data_name).relative_to(ROOT))] = sha256_bytes(data_raw)
        version_id = f"wdi-chile-{cfg['id']}-{last_updated}"
        versions.append({"id": version_id, "datasetName": f"WDI · Chile · {code}", "version": f"Actualización WDI {last_updated}", "publicationDate": None, "accessDate": ACCESS_DATE, "license": "CC BY 4.0 (con términos adicionales del catálogo del Banco Mundial)", "status": "imported", "sourceFile": str((RAW_DIR / data_name).relative_to(ROOT)), "sourceSheet": None, "sha256": sha256_bytes(data_raw)})
        indicators.append({"id": cfg["id"], "domain": cfg["domain"], "theme": cfg["theme"], "variant": cfg["variant"], "family": "Economía" if cfg["domain"] == "economy" else "Sociedad, demografía y condiciones de vida", "name": cfg["shortName"], "shortName": cfg["shortName"], "kind": "continuous", "unit": cfg["unit"], "definition": cfg["definition"], "originalVariable": code, "sourceIds": [SOURCE_ID], "mapCompatible": False, "methodology": cfg["methodology"]})

        valid_rows = [row for row in rows if row.get("countryiso3code") == "CHL" and row.get("value") is not None]
        if not valid_rows:
            raise ValueError(f"Sin cobertura efectiva: {code}")
        start = min(int(row["date"]) for row in valid_rows)
        end = max(int(row["date"]) for row in valid_rows)
        for source_row, row in enumerate(rows, start=1):
            if row.get("countryiso3code") != "CHL" or row.get("indicator", {}).get("id") != code:
                raise ValueError(f"País o indicador desconocido: {code}, fila {source_row}")
            year = int(row["date"])
            value = row.get("value")
            if value is None:
                null_years_omitted += 1
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"Valor no numérico: {code}, fila {source_row}")
            item = {
                "id": f"obs-chl-{cfg['id']}-{year}", "countryCode": "CHL", "indicatorId": cfg["id"], "year": year,
                "originalValue": value, "normalizedValue": float(value) / cfg["scale"], "valueStatus": "available",
                "valueOrigin": cfg["valueOrigin"], "originalFrequency": "annual",
                "provenance": {
                    "sourceId": SOURCE_ID, "datasetVersionId": version_id, "originalVariable": code,
                    "definition": cfg["definition"], "unit": cfg["unit"], "originalUnit": cfg["originalUnit"],
                    "coverage": {"startYear": start, "endYear": end, "territorialLevel": "national"},
                    "transformations": [f"Valor original dividido por {int(cfg['scale']):,} para cambiar únicamente la escala; sin redondeo ni imputación.".replace(",", ".") ] if cfg["scale"] != 1 else ["Lectura directa del valor numérico; sin cambio de escala, imputación ni interpolación."],
                    "verificationStatus": "unverified", "sourceFile": str((RAW_DIR / data_name).relative_to(ROOT)),
                    "sourceSheet": None, "sourceRow": source_row, "url": data_url, "accessDate": ACCESS_DATE,
                    "methodologyId": cfg["methodology"]["id"], "methodologyVariant": cfg["variant"], "notes": cfg["notes"],
                },
            }
            observations.append(item)
            if cfg["id"] not in samples or year > samples[cfg["id"]]["year"]:
                samples[cfg["id"]] = item

    validation = validate(observations)
    sample_checks = []
    for id in sorted(samples):
        item = samples[id]
        prov = item["provenance"]
        raw = json.loads((ROOT / prov["sourceFile"]).read_text(encoding="utf-8"))
        original = raw[1][prov["sourceRow"] - 1]
        passed = original["value"] == item["originalValue"] and int(original["date"]) == item["year"] and original["countryiso3code"] == "CHL" and original["indicator"]["id"] == prov["originalVariable"]
        if not passed:
            raise ValueError(f"Falló el cotejo: {item['id']}")
        prov["verificationStatus"] = "verified"
        prov["verificationNote"] = "Cotejado automatizadamente contra la respuesta JSON original; no equivale a validación metodológica independiente."
        sample_checks.append({"id": item["id"], "sourceFile": prov["sourceFile"], "sourceRow": prov["sourceRow"], "checked": f"{prov['originalVariable']}={item['originalValue']}; year={item['year']}; country=CHL", "result": "coincide"})

    current = {item["id"]: core(item) for item in observations}
    changed = sorted(key for key in current.keys() & previous.keys() if current[key] != previous[key])
    by_indicator = {}
    for cfg in CONFIGS:
        rows = [item for item in observations if item["indicatorId"] == cfg["id"]]
        by_indicator[cfg["id"]] = {"count": len(rows), "startYear": min(item["year"] for item in rows), "endYear": max(item["year"] for item in rows), "valueOrigin": cfg["valueOrigin"]}
    report = {
        "scope": {"country": "CHL", "period": f"1950–{CURRENT_YEAR}", "indicators": [cfg["code"] for cfg in CONFIGS]},
        "accessDate": ACCESS_DATE, "counts": {"observations": len(observations), "verifiedAgainstOriginalSample": len(sample_checks), "nullYearsOmitted": null_years_omitted, "byIndicator": by_indicator},
        "metadataAudit": metadata_audit, "rawFiles": raw_files,
        "update": {"previousObservationCount": len(previous), "addedIds": sorted(current.keys() - previous.keys()), "removedIds": sorted(previous.keys() - current.keys()), "changedIds": changed, "unchangedCount": sum(current[key] == previous[key] for key in current.keys() & previous.keys())},
        "validations": validation, "sampleChecks": sample_checks,
        "verificationMeaning": "verified significa coincidencia con la respuesta original; no es validación metodológica independiente.",
        "originalCourseFilesUnmodified": before_course == course_hashes(),
        "complementaryConnectorSnapshot": "data/raw/world-bank/chile-fase05-consulta.csv",
    }
    if before_course != course_hashes():
        raise RuntimeError("materiales_curso cambió durante la importación")
    payloads = {"chile-observations.json": observations, "chile-indicators.json": indicators, "chile-sources.json": [{"id": SOURCE_ID, "institution": "Banco Mundial", "title": "World Development Indicators (WDI) · ampliación Chile", "url": "https://data.worldbank.org/indicator", "bibliographicReference": f"Banco Mundial, World Development Indicators, API v2. Acceso: {ACCESS_DATE}. Variables, actualizaciones y archivos originales registrados por indicador.", "metadataNote": "Fichas y respuestas JSON conservadas por indicador. CC BY 4.0 sujeta a términos adicionales de https://datacatalog.worldbank.org/public-licenses. Las organizaciones de origen figuran en cada ficha.", "versions": versions}], "chile-import-report.json": report}
    for name, payload in payloads.items():
        temporary = OUTPUT_DIR / f".{name}.tmp"
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, OUTPUT_DIR / name)
    print(json.dumps({"observations": len(observations), "indicators": len(indicators), "samples": len(sample_checks), "nullsOmitted": null_years_omitted, "added": len(report["update"]["addedIds"]), "changed": len(changed), "removed": len(report["update"]["removedIds"])}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
