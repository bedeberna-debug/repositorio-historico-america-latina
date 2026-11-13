import type { CountryYearObservation, CrisisEpisode, HistoricalEvent, PresidentialPeriod, Provenance } from '../types/data';
import type { JudicialChangeNode, LegislativePeriod } from '../types/institutions';
import { indicatorById, indicators } from './indicators';
import { getSource } from './sources';

const knownCountries = new Set(['ARG', 'CHL']);
const valueOrigins = new Set(['observed', 'source_estimate', 'derived']);

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validProvenance(provenance: Provenance): boolean {
  return Boolean(
    getSource(provenance.sourceId)
    && provenance.sourceFile
    && provenance.sourceRow !== null
    && provenance.sourceRow !== undefined
    && provenance.originalVariable,
  );
}

export function validateCanonicalData(
  observations: CountryYearObservation[],
  periods: PresidentialPeriod[],
  crises: CrisisEpisode[],
  events: HistoricalEvent[] = [],
  legislativePeriods: LegislativePeriod[] = [],
  judicialChanges: JudicialChangeNode[] = [],
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const lookup = new Map<string, CountryYearObservation>();
  const currentYear = new Date().getFullYear();

  for (const item of observations) {
    const variant = item.provenance.methodologyVariant ?? indicatorById[item.indicatorId]?.variant ?? 'sin-variante';
    const key = `${item.countryCode}:${item.indicatorId}:${variant}:${item.year}`;
    if (seen.has(key)) errors.push(`Duplicado país-año-indicador-variante: ${key}`);
    seen.add(key);
    lookup.set(`${item.countryCode}:${item.indicatorId}:${item.year}`, item);
    if (!knownCountries.has(item.countryCode)) errors.push(`Código de país desconocido: ${item.countryCode}`);
    if (!Number.isInteger(item.year) || item.year < 1800 || item.year > currentYear + 1) errors.push(`Año fuera de rango: ${item.id}`);
    if (typeof item.normalizedValue !== 'number' || !Number.isFinite(item.normalizedValue)) errors.push(`Valor numérico almacenado incorrectamente: ${item.id}`);
    if (item.provenance.methodologyId && typeof item.originalValue !== 'number') errors.push(`Valor original almacenado como texto: ${item.id}`);
    if (item.valueOrigin && !valueOrigins.has(item.valueOrigin)) errors.push(`Origen de valor desconocido: ${item.id}`);
    if (item.originalFrequency && item.originalFrequency !== 'annual') errors.push(`Frecuencia original no registrada: ${item.id}`);
    if (item.derivation && (item.valueOrigin !== 'derived' || item.originalValue !== null)) errors.push(`Derivado sin metadatos de origen: ${item.id}`);
    const indicator = indicatorById[item.indicatorId];
    if (!indicator) errors.push(`Variable inexistente: ${item.indicatorId}`);
    else {
      if (indicator.unit !== item.provenance.unit) errors.push(`Unidad incompatible: ${item.id}`);
      if (indicator.methodology && (item.provenance.methodologyId !== indicator.methodology.id || item.provenance.methodologyVariant !== indicator.variant)) errors.push(`Cambio de metodología no registrado: ${item.id}`);
      const boundedPercentage = indicator.unit.startsWith('%') && indicator.unit !== '% anual';
      if (boundedPercentage && typeof item.normalizedValue === 'number' && (item.normalizedValue < 0 || item.normalizedValue > 100)) errors.push(`Porcentaje fuera de rango: ${item.id}`);
    }
    if (item.valueStatus === 'zero_events' && item.normalizedValue !== 0) errors.push(`Cero clasificado incorrectamente: ${item.id}`);
    if (item.valueStatus === 'no_data' && item.normalizedValue !== null) errors.push(`Ausencia con valor: ${item.id}`);
    if (item.valueStatus === 'no_data' && item.normalizedValue === 0) errors.push(`Año sin dato convertido en cero: ${item.id}`);
    const source = getSource(item.provenance.sourceId);
    if (!source || !source.versions.some((version) => version.id === item.provenance.datasetVersionId)) errors.push(`Fuente inexistente: ${item.id}`);
    if (!validProvenance(item.provenance)) errors.push(`Observación sin procedencia: ${item.id}`);
    if (indicator?.methodology && (!item.provenance.url || !item.provenance.accessDate)) errors.push(`Procedencia institucional incompleta: ${item.id}`);
  }

  const groups = new Map<string, string[]>();
  for (const indicator of indicators) {
    const group = indicator.methodology?.compositionGroup;
    if (group) groups.set(group, [...(groups.get(group) ?? []), indicator.id]);
  }
  for (const [group, indicatorIds] of groups) {
    const countryYears = new Set(observations.filter((item) => indicatorIds.includes(item.indicatorId)).map((item) => `${item.countryCode}:${item.year}`));
    for (const countryYear of countryYears) {
      const [countryCode, yearText] = countryYear.split(':');
      const rows = indicatorIds.map((id) => lookup.get(`${countryCode}:${id}:${yearText}`));
      if (rows.some((row) => !row)) {
        errors.push(`Composición ${group} incompleta: ${countryYear}`);
        continue;
      }
      const total = rows.reduce((sum, row) => sum + Number(row!.normalizedValue), 0);
      const tolerance = indicatorById[indicatorIds[0]].methodology?.compositionTolerance ?? 0.2;
      if (Math.abs(total - 100) > tolerance) errors.push(`Composición ${group} incompatible: ${countryYear} suma ${total}`);
    }
  }

  for (const item of [...periods, ...crises]) {
    if (!knownCountries.has(item.countryCode)) errors.push(`Código de país desconocido: ${item.countryCode}`);
    if (!isIsoDate(item.startDate) || (item.endDate !== null && !isIsoDate(item.endDate))) errors.push(`Fecha ISO inválida: ${item.id}`);
    if (item.endDate && item.endDate < item.startDate) errors.push(`Fecha de término anterior al inicio: ${item.id}`);
    if (!validProvenance(item.provenance)) errors.push(`Registro sin procedencia válida: ${item.id}`);
  }

  for (const event of events) {
    if (!knownCountries.has(event.countryCode)) errors.push(`Código de país desconocido: ${event.countryCode}`);
    if (!event.temporalType || !event.provenance || !validProvenance(event.provenance)) errors.push(`Acontecimiento sin precisión temporal o fuente: ${event.id}`);
    if (event.temporalType === 'annual_aggregate') {
      if (event.startDate !== null || event.endDate !== null || !Number.isFinite(event.count)) errors.push(`Agregado anual con temporalidad incorrecta: ${event.id}`);
    } else {
      if (!event.startDate || !isIsoDate(event.startDate) || (event.endDate !== null && !isIsoDate(event.endDate))) errors.push(`Fecha ISO inválida: ${event.id}`);
      if (event.startDate && Number(event.startDate.slice(0, 4)) !== event.year) errors.push(`Año incompatible con fecha de acontecimiento: ${event.id}`);
      if (event.startDate && event.endDate && event.endDate < event.startDate) errors.push(`Fecha de término anterior al inicio: ${event.id}`);
    }
  }

  for (const period of legislativePeriods) {
    if (!knownCountries.has(period.countryCode) || !validProvenance(period.provenance)) errors.push(`Período legislativo sin país o fuente válida: ${period.id}`);
    if (!isIsoDate(period.startDate) || (period.endDate !== null && !isIsoDate(period.endDate))) errors.push(`Fecha ISO inválida: ${period.id}`);
    if (period.endDate && period.endDate < period.startDate) errors.push(`Fecha de término anterior al inicio: ${period.id}`);
    if (!period.segments.length) errors.push(`Período legislativo sin segmentos: ${period.id}`);
    for (const segment of period.segments) {
      if (!isIsoDate(segment.startDate) || (segment.endDate !== null && !isIsoDate(segment.endDate))) errors.push(`Fecha ISO inválida: ${segment.id}`);
      if (segment.endDate && segment.endDate < segment.startDate) errors.push(`Fecha de término anterior al inicio: ${segment.id}`);
      if (!validProvenance(segment.provenance)) errors.push(`Segmento legislativo sin fuente: ${segment.id}`);
      const needsMeasurement = !['unknown', 'congress_absent_or_dissolved'].includes(segment.relation);
      if (needsMeasurement && (!segment.majorityCriterion || !segment.measuredAt || !isIsoDate(segment.measuredAt))) errors.push(`Mayoría legislativa sin criterio y fecha: ${segment.id}`);
    }
  }

  for (const change of judicialChanges) {
    if (!knownCountries.has(change.countryCode) || !validProvenance(change.provenance)) errors.push(`Cambio judicial sin país o fuente válida: ${change.id}`);
    if (!isIsoDate(change.date) || !change.description) errors.push(`Cambio judicial sin fecha o descripción: ${change.id}`);
  }
  return errors;
}
