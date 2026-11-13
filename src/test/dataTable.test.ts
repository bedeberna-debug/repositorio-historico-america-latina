import { describe, expect, it } from 'vitest';
import {
  buildTableSeries,
  calculateAnnualVariation,
  DEFAULT_TABLE_FILTERS,
  filterTableSeries,
  getTableCell,
  type TableSeries,
} from '../utils/dataTable';
import type { CountryYearObservation } from '../types/data';

function sampleRow(): TableSeries {
  const source = buildTableSeries('ARG', false).find((row) => row.indicator.id === 'gdp-per-capita-ppp-2021')!;
  const template = source.observations[0];
  const observation = (year: number, value: number): CountryYearObservation => ({
    ...template,
    id: `test-${year}`,
    year,
    originalValue: value,
    normalizedValue: value,
    provenance: { ...template.provenance, coverage: { ...template.provenance.coverage, startYear: 2000, endYear: 2005 } },
  });
  return { ...source, observations: [observation(2000, 100), observation(2001, 110), observation(2003, 165)] };
}

describe('matriz histórica de la fase 06', () => {
  it('asigna una identidad única y separa metodología, unidad, fuente y derivados', () => {
    for (const country of ['ARG', 'CHL'] as const) {
      const rows = buildTableSeries(country);
      expect(new Set(rows.map((row) => row.seriesId)).size).toBe(rows.length);
      rows.forEach((row) => {
        expect(row.countryCode).toBe(country);
        expect(row.seriesId).toContain(row.indicator.id);
        expect(row.seriesId).toContain(row.sourceId);
        expect(row.seriesId).toContain(row.unit);
      });
      const original = rows.find((row) => row.indicator.id === 'population-age-0-14' && row.origins[0] === 'observed');
      const derived = rows.find((row) => row.indicator.id === 'population-age-0-14' && row.origins[0] === 'derived');
      expect(original).toBeDefined();
      expect(derived).toBeDefined();
      expect(original!.seriesId).not.toBe(derived!.seriesId);
      expect(derived!.observations[0].derivation?.formula).toContain('población total × porcentaje');
    }
  });

  it('filtra por texto, ámbito, tema, origen, verificación y datos del intervalo', () => {
    const rows = buildTableSeries('CHL');
    expect(filterTableSeries(rows, { ...DEFAULT_TABLE_FILTERS, search: 'PIB per cápita' }, 2000, 2024)).toHaveLength(1);
    expect(filterTableSeries(rows, { ...DEFAULT_TABLE_FILTERS, domain: 'society' }, 2000, 2024).every((row) => row.indicator.domain === 'society')).toBe(true);
    expect(filterTableSeries(rows, { ...DEFAULT_TABLE_FILTERS, origin: 'source_estimate' }, 2000, 2024).every((row) => row.origins.includes('source_estimate'))).toBe(true);
    expect(filterTableSeries(rows, { ...DEFAULT_TABLE_FILTERS, verification: 'verified' }, 2000, 2024).length).toBeGreaterThan(0);
    expect(filterTableSeries(rows, { ...DEFAULT_TABLE_FILTERS, search: 'alfabetización' }, 1950, 1955)).toHaveLength(0);
    expect(filterTableSeries(rows, { ...DEFAULT_TABLE_FILTERS, search: 'alfabetización', onlyWithData: false }, 1950, 1955)).toHaveLength(1);
  });

  it('distingue ausencia interior, fuera de cobertura, no aplicable y cero', () => {
    const row = sampleRow();
    expect(getTableCell(row, 1999).status).toBe('outside_coverage');
    expect(getTableCell(row, 2002).status).toBe('no_data');
    expect(getTableCell(row, 2002).label).not.toBe('0');
    const strikes = buildTableSeries('ARG', false).find((item) => item.indicator.id === 'general-strikes')!;
    const zero = getTableCell(strikes, 1989);
    expect(zero.status).toBe('available');
    expect(zero.label).toBe('0');
    expect(zero.detail).toContain('Cero eventos');
    const notApplicable = { ...row, observations: [{ ...row.observations[0], valueStatus: 'not_applicable' as const, normalizedValue: null }] };
    expect(getTableCell(notApplicable, 2000).label).toBe('No aplicable');
  });

  it('calcula variación absoluta solo con el año consecutivo anterior', () => {
    const row = sampleRow();
    expect(calculateAnnualVariation(row, 2001, 'absolute')?.value).toBe(10);
    expect(calculateAnnualVariation(row, 2003, 'absolute')).toBeNull();
    expect(calculateAnnualVariation(row, 2000, 'absolute')).toBeNull();
  });

  it('calcula porcentajes con denominador válido y bloquea denominadores no interpretables', () => {
    const row = sampleRow();
    expect(calculateAnnualVariation(row, 2001, 'percent')?.value).toBe(10);
    const zero = { ...row, observations: row.observations.map((item) => item.year === 2000 ? { ...item, originalValue: 0, normalizedValue: 0 } : item) };
    expect(calculateAnnualVariation(zero, 2001, 'percent')).toBeNull();
    const negative = { ...row, observations: row.observations.map((item) => item.year === 2000 ? { ...item, originalValue: -100, normalizedValue: -100 } : item) };
    expect(calculateAnnualVariation(negative, 2001, 'percent')).toBeNull();
  });

  it('calcula puntos porcentuales solo para unidades porcentuales', () => {
    const row = sampleRow();
    const percentage = { ...row, unit: '% de la población', observations: row.observations.map((item) => ({ ...item, provenance: { ...item.provenance, unit: '% de la población' } })) };
    expect(calculateAnnualVariation(percentage, 2001, 'percentage_points')?.value).toBe(10);
    expect(calculateAnnualVariation(percentage, 2001, 'percentage_points')?.unit).toBe('puntos porcentuales');
    expect(calculateAnnualVariation(row, 2001, 'percentage_points')).toBeNull();
    expect(calculateAnnualVariation(percentage, 2001, 'percent')).toBeNull();
  });
});
