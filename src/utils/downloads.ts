import type { SheetData } from 'write-excel-file/browser';
import { countryByCode } from '../data/countries';
import {
  getHistoricalEvents,
  getJudicialChanges,
  getLegislativePeriods,
  getPresidentialPeriods,
} from '../data/repositories';
import { getSource } from '../data/sources';
import type { CountryCode, CountryYearObservation, Provenance } from '../types/data';
import {
  getTableCell,
  VALUE_ORIGIN_LABELS,
  VERIFICATION_LABELS,
  type TableSeries,
} from './dataTable';

export type DownloadScope = 'selection' | 'category' | 'module';

export interface DownloadManifest {
  country: string;
  countryCode: CountryCode;
  generatedAt: string;
  scope: DownloadScope;
  scopeLabel: string;
  filters: Record<string, string>;
  startYear: number;
  endYear: number;
  seriesCount: number;
  observationCount: number;
  sourceVersions: string;
  licenses: string;
  warnings: string;
}

export interface ExportPackage {
  csv: string;
  sheets: { sheet: string; data: SheetData }[];
  manifest: DownloadManifest;
  fileBase: string;
  longRecords: Record<string, string | number | null>[];
}

export const CSV_FIELDS = [
  'country_code', 'country', 'year', 'series_id', 'indicator_id', 'indicator_name',
  'domain', 'theme', 'variant', 'methodology', 'original_value', 'normalized_value',
  'original_unit', 'normalized_unit', 'value_status', 'value_origin',
  'verification_status', 'verification_scope', 'source_id', 'source_title',
  'dataset_version_id', 'dataset_version', 'source_file', 'source_sheet', 'source_row',
  'transformations', 'notes', 'derivation_formula', 'derivation_input_ids',
] as const;

function versionFor(provenance: Provenance) {
  const source = getSource(provenance.sourceId);
  return {
    source,
    version: source?.versions.find((item) => item.id === provenance.datasetVersionId),
  };
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

function csvCell(value: unknown): string {
  const raw = text(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function recordsToCsv(records: Record<string, string | number | null>[]): string {
  return [
    CSV_FIELDS.join(','),
    ...records.map((record) => CSV_FIELDS.map((field) => csvCell(record[field])).join(',')),
  ].join('\r\n');
}

function observationRecord(row: TableSeries, item: CountryYearObservation): Record<string, string | number | null> {
  const { provenance } = item;
  const { source, version } = versionFor(provenance);
  return {
    country_code: item.countryCode,
    country: countryByCode[item.countryCode].name,
    year: item.year,
    series_id: row.seriesId,
    indicator_id: item.indicatorId,
    indicator_name: row.indicator.name,
    domain: row.indicator.domain,
    theme: row.indicator.theme,
    variant: row.variant,
    methodology: row.methodology,
    original_value: item.originalValue,
    normalized_value: item.normalizedValue,
    original_unit: provenance.originalUnit ?? provenance.unit,
    normalized_unit: provenance.unit,
    value_status: item.valueStatus,
    value_origin: item.derivation ? 'derived' : item.valueOrigin ?? 'observed',
    verification_status: provenance.verificationStatus,
    verification_scope: VERIFICATION_LABELS[provenance.verificationStatus],
    source_id: provenance.sourceId,
    source_title: source?.title ?? provenance.sourceId,
    dataset_version_id: provenance.datasetVersionId,
    dataset_version: version?.version ?? 'No confirmada',
    source_file: provenance.sourceFile,
    source_sheet: provenance.sourceSheet,
    source_row: provenance.sourceRow,
    transformations: provenance.transformations.join(' | '),
    notes: [provenance.notes, provenance.verificationNote].filter(Boolean).join(' | '),
    derivation_formula: item.derivation?.formula ?? null,
    derivation_input_ids: item.derivation ? [item.derivation.population.id, item.derivation.percentage.id].join(' | ') : null,
  };
}

function header(value: string) {
  return { value, fontWeight: 'bold' as const, backgroundColor: '#E9ECE4', textColor: '#173F35' };
}

function headers(values: string[]): SheetData[number] {
  return values.map(header);
}

function sourceRows(rows: TableSeries[]): SheetData {
  const seen = new Set<string>();
  const output: SheetData = [headers(['Fuente', 'Institución', 'ID de fuente', 'ID de versión', 'Versión', 'Fecha de publicación', 'Fecha de acceso', 'Licencia', 'Archivo', 'SHA-256'])];
  for (const row of rows) {
    const item = row.observations[0];
    if (!item) continue;
    const { source, version } = versionFor(item.provenance);
    const key = `${row.sourceId}|${row.datasetVersionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push([
      source?.title ?? row.sourceId, source?.institution ?? '', row.sourceId, row.datasetVersionId,
      version?.version ?? 'No confirmada', version?.publicationDate ?? '', version?.accessDate ?? item.provenance.accessDate ?? '',
      version?.license ?? 'Pendiente de licencia', version?.sourceFile ?? item.provenance.sourceFile, version?.sha256 ?? '',
    ]);
  }
  return output;
}

function provenanceFields(provenance: Provenance): (string | number | null)[] {
  const { source, version } = versionFor(provenance);
  return [
    source?.title ?? provenance.sourceId, version?.version ?? 'No confirmada',
    provenance.sourceFile, provenance.sourceSheet, provenance.sourceRow,
    VERIFICATION_LABELS[provenance.verificationStatus],
  ];
}

function institutionalSheets(countryCode: CountryCode): { sheet: string; data: SheetData }[] {
  const sheets: { sheet: string; data: SheetData }[] = [];
  const periods = getPresidentialPeriods(countryCode);
  if (periods.length) sheets.push({ sheet: 'Presidencias', data: [
    headers(['ID', 'País', 'Presidente', 'Inicio', 'Término', 'Duración (días)', 'Partido', 'Coalición', 'Interrupción', 'Tipo', 'Fuente', 'Versión', 'Archivo', 'Hoja', 'Fila', 'Verificación']),
    ...periods.map((item) => [item.id, item.countryCode, item.presidentName, item.startDate, item.endDate, item.durationDays, item.party, item.coalition, item.interruptionStatus, item.periodType ?? '', ...provenanceFields(item.provenance)]),
  ] });
  const legislative = getLegislativePeriods(countryCode).flatMap((period) => period.segments.map((segment) => ({ period, segment })));
  if (legislative.length) sheets.push({ sheet: 'Legislatura', data: [
    headers(['ID de período', 'ID de segmento', 'País', 'Cámara', 'Inicio del período', 'Término del período', 'Inicio del segmento', 'Término del segmento', 'Relación', 'Criterio de mayoría', 'Fecha de medición', 'Fuente', 'Versión', 'Archivo', 'Hoja', 'Fila', 'Verificación']),
    ...legislative.map(({ period, segment }) => [period.id, segment.id, period.countryCode, period.chamber, period.startDate, period.endDate, segment.startDate, segment.endDate, segment.relation, segment.majorityCriterion ?? '', segment.measuredAt ?? '', ...provenanceFields(segment.provenance)]),
  ] });
  const judicial = getJudicialChanges(countryCode);
  if (judicial.length) sheets.push({ sheet: 'Judicial', data: [
    headers(['ID', 'País', 'Institución', 'Fecha', 'Tipo de cambio', 'Descripción', 'Fuente', 'Versión', 'Archivo', 'Hoja', 'Fila', 'Verificación']),
    ...judicial.map((item) => [item.id, item.countryCode, item.institutionName, item.date, item.changeType, item.description, ...provenanceFields(item.provenance)]),
  ] });
  const events = getHistoricalEvents(countryCode);
  if (events.length) sheets.push({ sheet: 'Acontecimientos', data: [
    headers(['ID', 'ID de registro original', 'País', 'Tipo', 'Temporalidad', 'Año', 'Inicio', 'Término', 'Conteo anual', 'Nombre o descripción', 'Confianza', 'Fuente', 'Versión', 'Archivo', 'Hoja', 'Fila', 'Verificación']),
    ...events.map((item) => [item.id, item.sourceRecordId, item.countryCode, item.eventType, item.temporalType, item.year, item.startDate, item.endDate, item.count ?? null, item.name ?? item.description, item.confidence, ...provenanceFields(item.provenance)]),
  ] });
  return sheets;
}

export function buildExportPackage({
  rows,
  countryCode,
  scope,
  scopeLabel,
  startYear,
  endYear,
  filters,
  generatedAt = new Date().toISOString(),
}: {
  rows: TableSeries[];
  countryCode: CountryCode;
  scope: DownloadScope;
  scopeLabel: string;
  startYear: number;
  endYear: number;
  filters: Record<string, string>;
  generatedAt?: string;
}): ExportPackage {
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
  const inInterval = rows.map((row) => ({ ...row, observations: row.observations.filter((item) => item.year >= startYear && item.year <= endYear) }));
  const longRecords = inInterval.flatMap((row) => row.observations.map((item) => observationRecord(row, item)));
  const uniqueVersions = new Map<string, { label: string; license: string }>();
  rows.forEach((row) => {
    const item = row.observations[0];
    if (!item) return;
    const { source, version } = versionFor(item.provenance);
    uniqueVersions.set(`${row.sourceId}|${row.datasetVersionId}`, {
      label: `${source?.title ?? row.sourceId}: ${version?.version ?? 'versión no confirmada'} (${row.datasetVersionId})`,
      license: version?.license ?? 'Pendiente de licencia',
    });
  });
  const manifest: DownloadManifest = {
    country: countryByCode[countryCode].name,
    countryCode,
    generatedAt,
    scope,
    scopeLabel,
    filters,
    startYear,
    endYear,
    seriesCount: rows.length,
    observationCount: longRecords.length,
    sourceVersions: [...uniqueVersions.values()].map((item) => item.label).join(' | ') || 'Sin series con observaciones',
    licenses: [...new Set([...uniqueVersions.values()].map((item) => item.license))].join(' | ') || 'No aplicable',
    warnings: 'Sin interpolación ni imputación. “Cotejado” significa coincidencia con el original, no verificación externa. Los derivados y las variaciones son cálculos de presentación. La cobertura no es exhaustiva.',
  };

  const matrix: SheetData = [
    headers(['Ámbito', 'Tema', 'Indicador', 'Variante o metodología', 'Unidad', 'Origen del valor', 'Cobertura efectiva', 'ID de serie', 'Fuente', 'Versión', ...years.map(String)]),
    ...rows.map((row) => [
      row.indicator.domain, row.indicator.theme, row.indicator.name, `${row.variant} · ${row.methodology}`,
      row.unit, row.origins.map((origin) => VALUE_ORIGIN_LABELS[origin]).join(' | '),
      `${row.coverage.startYear ?? 'inicio pendiente'}–${row.coverage.endYear ?? 'término pendiente'}`,
      row.seriesId, row.sourceId, row.datasetVersionId,
      ...years.map((year) => {
        const cell = getTableCell(row, year);
        return cell.observation && typeof cell.observation.normalizedValue === 'number' && cell.status === 'available'
          ? Number(cell.observation.normalizedValue)
          : cell.label;
      }),
    ]),
  ];
  const longSheet: SheetData = [
    headers([...CSV_FIELDS]),
    ...longRecords.map((record) => CSV_FIELDS.map((field) => record[field])),
  ];
  const dictionary: SheetData = [
    headers(['ID de serie', 'ID de indicador', 'Indicador', 'Definición', 'Ámbito', 'Tema', 'Variante', 'Metodología', 'Unidad', 'Origen', 'Cobertura inicial', 'Cobertura final', 'Nivel territorial', 'Fuente', 'Versión']),
    ...rows.map((row) => [row.seriesId, row.indicator.id, row.indicator.name, row.indicator.definition, row.indicator.domain, row.indicator.theme, row.variant, row.methodology, row.unit, row.origins.map((origin) => VALUE_ORIGIN_LABELS[origin]).join(' | '), row.coverage.startYear, row.coverage.endYear, row.coverage.territorialLevel, row.sourceId, row.datasetVersionId]),
  ];
  const notes: SheetData = [
    headers(['Tipo', 'Serie o regla', 'Nota metodológica']),
    ['Regla general', 'Ausencias', 'Sin dato, fuera de cobertura, no aplicable y cero son estados distintos; no se interpolan ni imputan valores.'],
    ['Regla general', 'Verificación', 'Cotejado contra el original no equivale a verificación externa de la fuente.'],
    ['Regla general', 'Variaciones', 'Solo entre años consecutivos de una misma serie; las variaciones no se agregan como observaciones canónicas.'],
    ...rows.flatMap((row) => [
      ['Serie', row.indicator.name, row.indicator.methodology?.comparabilityNotes ?? 'Sin nota de comparabilidad adicional.'],
      ...row.observations.filter((item) => item.derivation).map((item) => ['Derivado', row.indicator.name, `${item.derivation!.formula}. Entradas: ${item.derivation!.population.id}; ${item.derivation!.percentage.id}.`] as SheetData[number]),
    ]),
  ];
  const manifestSheet: SheetData = [
    headers(['Campo', 'Valor']),
    ['País', `${manifest.country} (${countryCode})`],
    ['Fecha de generación', generatedAt],
    ['Alcance', scopeLabel],
    ...Object.entries(filters).map(([key, value]) => [`Filtro: ${key}`, value]),
    ['Intervalo temporal', `${startYear}–${endYear}`],
    ['Número de series', rows.length],
    ['Número de observaciones', longRecords.length],
    ['Versiones de fuentes', manifest.sourceVersions],
    ['Licencias', manifest.licenses],
    ['Advertencias metodológicas', manifest.warnings],
  ];
  const sheets = [
    { sheet: 'Matriz histórica', data: matrix },
    { sheet: 'Datos largos', data: longSheet },
    { sheet: 'Diccionario', data: dictionary },
    { sheet: 'Fuentes y versiones', data: sourceRows(rows) },
    { sheet: 'Notas metodológicas', data: notes },
    { sheet: 'Manifiesto', data: manifestSheet },
    ...(scope === 'module' ? institutionalSheets(countryCode) : []),
  ];
  return { csv: recordsToCsv(longRecords), sheets, manifest, fileBase: `${countryCode.toLowerCase()}-${scope}-${startYear}-${endYear}`, longRecords };
}

export async function exportPackageAsXlsx(pack: ExportPackage): Promise<Blob> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  return writeExcelFile(pack.sheets).toBlob();
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(pack: ExportPackage): void {
  const blob = new Blob([`\uFEFF${pack.csv}`], { type: 'text/csv;charset=utf-8' });
  saveBlob(blob, `${pack.fileBase}.csv`);
}

export async function downloadXlsx(pack: ExportPackage): Promise<void> {
  const blob = await exportPackageAsXlsx(pack);
  saveBlob(blob, `${pack.fileBase}.xlsx`);
}
