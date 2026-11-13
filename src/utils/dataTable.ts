import { indicatorById } from '../data/indicators';
import { observations as canonicalObservations } from '../data/repositories';
import type {
  CountryCode,
  CountryYearObservation,
  Coverage,
  HistoricalDomain,
  Indicator,
  ValueOrigin,
  VerificationStatus,
} from '../types/data';
import { derivePopulationObservation } from './derivedPopulation';

const DERIVABLE_COMPOSITION_IDS = [
  'population-age-0-14', 'population-age-15-64', 'population-age-65-plus',
  'urban-population-share', 'rural-population-share',
];

export type VariationMode = 'absolute' | 'percent' | 'percentage_points';

export interface TableSeries {
  seriesId: string;
  countryCode: CountryCode;
  indicator: Indicator;
  variant: string;
  methodology: string;
  unit: string;
  sourceId: string;
  datasetVersionId: string;
  origins: ValueOrigin[];
  coverage: Coverage;
  observations: CountryYearObservation[];
}

export interface TableFilters {
  search: string;
  domain: 'all' | HistoricalDomain;
  theme: string;
  origin: 'all' | ValueOrigin;
  verification: 'all' | VerificationStatus;
  onlyWithData: boolean;
}

export const DEFAULT_TABLE_FILTERS: TableFilters = {
  search: '',
  domain: 'all',
  theme: 'all',
  origin: 'all',
  verification: 'all',
  onlyWithData: true,
};

export const VALUE_ORIGIN_LABELS: Record<ValueOrigin, string> = {
  observed: 'Observado',
  source_estimate: 'Estimado por la fuente',
  derived: 'Derivado',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: 'Cotejado con el original',
  unverified: 'Importado; sin cotejo individual',
  in_review: 'En revisión',
};

function observationOrigin(item: CountryYearObservation): ValueOrigin {
  return item.derivation ? 'derived' : item.valueOrigin ?? 'observed';
}

function seriesIdentity(item: CountryYearObservation, indicator: Indicator): string {
  return JSON.stringify([
    item.countryCode,
    item.indicatorId,
    indicator.variant,
    item.provenance.methodologyId ?? item.provenance.methodologyVariant ?? '',
    item.provenance.unit,
    item.provenance.sourceId,
    item.provenance.datasetVersionId,
  ]);
}

/** Crea filas inequívocas sin modificar ni reagrupar las observaciones canónicas. */
export function buildTableSeries(
  countryCode: CountryCode,
  includeDerived = true,
  sourceObservations: CountryYearObservation[] = canonicalObservations,
): TableSeries[] {
  const countryObservations = sourceObservations.filter((item) => item.countryCode === countryCode);
  const population = countryObservations.filter((item) => item.indicatorId === 'total-population');
  const derived = includeDerived
    ? countryObservations
      .filter((item) => DERIVABLE_COMPOSITION_IDS.includes(item.indicatorId))
      .map((percentage) => derivePopulationObservation(
        population.find((item) => item.year === percentage.year),
        percentage,
      ))
      .filter((item): item is CountryYearObservation => Boolean(item))
    : [];
  const groups = new Map<string, CountryYearObservation[]>();
  for (const item of [...countryObservations, ...derived]) {
    const indicator = indicatorById[item.indicatorId];
    if (!indicator) continue;
    const key = seriesIdentity(item, indicator);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([seriesId, items]) => {
    const ordered = [...items].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
    const first = ordered[0];
    const indicator = indicatorById[first.indicatorId];
    const provenance = first.provenance;
    return {
      seriesId,
      countryCode,
      indicator,
      variant: indicator.variant,
      methodology: provenance.methodologyVariant ?? provenance.methodologyId ?? indicator.variant,
      unit: provenance.unit,
      sourceId: provenance.sourceId,
      datasetVersionId: provenance.datasetVersionId,
      origins: [...new Set(ordered.map(observationOrigin))],
      coverage: provenance.coverage,
      observations: ordered,
    };
  }).sort((a, b) => a.indicator.domain.localeCompare(b.indicator.domain)
    || a.indicator.theme.localeCompare(b.indicator.theme)
    || a.indicator.name.localeCompare(b.indicator.name)
    || a.seriesId.localeCompare(b.seriesId));
}

function normalizedSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function hasNumericValue(item: CountryYearObservation | undefined): item is CountryYearObservation {
  return Boolean(item)
    && typeof item!.normalizedValue === 'number'
    && item!.valueStatus !== 'no_data'
    && item!.valueStatus !== 'not_applicable';
}

export function filterTableSeries(
  rows: TableSeries[],
  filters: TableFilters,
  startYear: number,
  endYear: number,
): TableSeries[] {
  const search = normalizedSearch(filters.search);
  return rows.filter((row) => {
    if (filters.domain !== 'all' && row.indicator.domain !== filters.domain) return false;
    if (filters.theme !== 'all' && row.indicator.theme !== filters.theme) return false;
    if (filters.origin !== 'all' && !row.origins.includes(filters.origin)) return false;
    if (filters.verification !== 'all' && !row.observations.some((item) => item.provenance.verificationStatus === filters.verification)) return false;
    if (filters.onlyWithData && !row.observations.some((item) => item.year >= startYear && item.year <= endYear && hasNumericValue(item))) return false;
    if (!search) return true;
    const haystack = normalizedSearch([
      row.indicator.name, row.indicator.shortName, row.indicator.id, row.indicator.theme,
      row.variant, row.methodology, row.unit, row.sourceId,
    ].join(' '));
    return haystack.includes(search);
  });
}

export function isPercentageUnit(unit: string): boolean {
  return /%|porcentaje|por ciento/i.test(unit);
}

export interface AnnualVariation {
  value: number;
  unit: string;
  formula: string;
}

/**
 * Variación efímera de presentación. Exige el año inmediatamente anterior en la misma fila.
 */
export function calculateAnnualVariation(
  row: TableSeries,
  year: number,
  mode: VariationMode,
): AnnualVariation | null {
  const current = row.observations.find((item) => item.year === year);
  const previous = row.observations.find((item) => item.year === year - 1);
  if (!hasNumericValue(current) || !hasNumericValue(previous)) return null;
  const currentValue = Number(current.normalizedValue);
  const previousValue = Number(previous.normalizedValue);
  if (mode === 'percentage_points') {
    if (!isPercentageUnit(row.unit)) return null;
    return {
      value: currentValue - previousValue,
      unit: 'puntos porcentuales',
      formula: 'valor del año − valor del año anterior',
    };
  }
  if (mode === 'percent') {
    if (previousValue <= 0 || isPercentageUnit(row.unit)) return null;
    return {
      value: ((currentValue - previousValue) / Math.abs(previousValue)) * 100,
      unit: '%',
      formula: '(valor del año − valor del año anterior) / valor del año anterior × 100',
    };
  }
  return {
    value: currentValue - previousValue,
    unit: row.unit,
    formula: 'valor del año − valor del año anterior',
  };
}

export type CellStatus = 'available' | 'no_data' | 'outside_coverage' | 'not_applicable';

export interface TableCellPresentation {
  status: CellStatus;
  label: string;
  detail: string;
  observation?: CountryYearObservation;
}

export function getTableCell(row: TableSeries, year: number): TableCellPresentation {
  const observation = row.observations.find((item) => item.year === year);
  if (observation?.valueStatus === 'not_applicable') {
    return { status: 'not_applicable', label: 'No aplicable', detail: 'El indicador no aplica a este territorio o período.', observation };
  }
  if (observation && observation.valueStatus !== 'no_data') {
    return {
      status: 'available',
      label: observation.valueStatus === 'zero_events' ? '0' : String(observation.normalizedValue ?? observation.originalValue ?? ''),
      detail: observation.valueStatus === 'zero_events' ? 'Cero eventos registrados dentro de la cobertura.' : 'Valor disponible.',
      observation,
    };
  }
  const outside = row.coverage.startYear === null || row.coverage.endYear === null
    || year < row.coverage.startYear || year > row.coverage.endYear;
  return outside
    ? { status: 'outside_coverage', label: 'Fuera de cobertura', detail: `Cobertura efectiva declarada: ${row.coverage.startYear ?? 'inicio pendiente'}–${row.coverage.endYear ?? 'término pendiente'}.`, observation }
    : { status: 'no_data', label: 'Sin dato', detail: 'No hay una observación cargada dentro de la cobertura; no se sustituye por cero.', observation };
}
