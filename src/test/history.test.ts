import { describe, expect, it } from 'vitest';
import { dateToDecimalYear, zoomInterval } from '../components/HistoricalExplorer';
import { getCompleteCompositionRows, getDerivedCompositionRows } from '../components/SocialBand';
import { derivePopulationObservation, POPULATION_DERIVATION_FORMULA } from '../utils/derivedPopulation';
import { indicators } from '../data/indicators';
import { crisisEpisodes, documentaryEvents, getCountrySeries, getHistoricalEvents } from '../data/repositories';
import { historicalDomains } from '../data/taxonomy';

const currentYear = new Date().getFullYear();

describe('modelo histórico y jerarquía temática', () => {
  it('adapta las crisis sin duplicar sus registros ni perder procedencia ni fechas', () => {
    const events = getHistoricalEvents('ARG').filter((event) => event.kind === 'crisis');
    const original = crisisEpisodes.find((item) => item.id === 'crisis-arg-2001-12-01')!;
    const adapted = events.find((item) => item.id === original.id)!;
    expect(events).toHaveLength(crisisEpisodes.filter((item) => item.countryCode === 'ARG').length);
    expect(adapted).toMatchObject({
      sourceRecordId: original.id,
      kind: 'crisis',
      eventType: original.crisisType,
      temporalType: 'interval',
      year: 2001,
      startDate: original.startDate,
      endDate: original.endDate,
      domains: ['institutions'],
      governmentId: null,
      relatedEventIds: [],
    });
    expect(adapted.provenance).toBe(original.provenance);
    expect(adapted.actors).toContain(original.actors.vertical);
  });

  it('organiza ámbito, tema, indicador y variante con siete temas sociales', () => {
    expect(historicalDomains.map((domain) => domain.id)).toEqual(['economy', 'society', 'institutions']);
    const society = historicalDomains.find((domain) => domain.id === 'society')!;
    expect(society.themes.map((theme) => theme.id)).toEqual(['population', 'population-composition', 'poverty', 'education', 'inequality', 'labor', 'basic-services']);
    expect(new Set(society.themes.flatMap((theme) => theme.indicatorIds)).size).toBe(15);
    expect(indicators.every((indicator) => indicator.domain && indicator.theme && indicator.variant)).toBe(true);
    expect(indicators.find((indicator) => indicator.id === 'gdp-per-capita-ppp-2021')).toMatchObject({ domain: 'economy', theme: 'Actividad económica', variant: 'PPA constante 2021' });
  });

  it('mantiene la pobreza nacional e internacional como metodologías distintas', () => {
    const national = indicators.find((indicator) => indicator.id === 'poverty-national-headcount')!;
    const international = indicators.find((indicator) => indicator.id === 'poverty-international-3-2021ppp')!;
    expect(national.id).not.toBe(international.id);
    expect(national.methodology).toMatchObject({ lineType: 'national', measure: 'incidence', povertyLine: null });
    expect(international.methodology).toMatchObject({ lineType: 'international', measure: 'incidence', povertyLine: 3, referenceYear: 2021 });
    expect(national.methodology?.comparabilityNotes).toMatch(/No comparar directamente/);
    expect(international.methodology?.comparabilityNotes).toMatch(/No combinar/);
  });

  it('modela huelgas como agregados anuales y limita los eventos generales a registros documentales', () => {
    const argEvents = getHistoricalEvents('ARG');
    const chlEvents = getHistoricalEvents('CHL');
    const events = [...argEvents, ...chlEvents];
    const crises = events.filter((event) => event.kind === 'crisis');
    const strikes = events.filter((event) => event.kind === 'general_strike');
    expect(crises).toHaveLength(4);
    expect(strikes).toHaveLength(getCountrySeries('ARG', 'general-strikes').length + getCountrySeries('CHL', 'general-strikes').length);
    expect(strikes.every((event) => event.temporalType === 'annual_aggregate' && event.startDate === null && event.endDate === null)).toBe(true);
    expect(argEvents.every((event) => event.governmentId === null && event.relatedEventIds.length === 0)).toBe(true);
    expect(argEvents.some((event) => ['election', 'succession', 'reform', 'constitution'].includes(event.kind))).toBe(false);
    expect(documentaryEvents).toHaveLength(34);
    expect(documentaryEvents.every((event) => event.countryCode === 'CHL' && event.provenance.sourceFile)).toBe(true);
    expect(chlEvents.some((event) => event.kind === 'election')).toBe(true);
    expect(chlEvents.some((event) => event.kind === 'succession')).toBe(true);
    expect(chlEvents.some((event) => event.kind === 'reform' || event.kind === 'constitution')).toBe(true);
    const arg1986 = strikes.find((event) => event.countryCode === 'ARG' && event.year === 1986)!;
    expect(arg1986.count).toBe(2);
  });

  it('identifica el empleo modelado por la OIT y conserva composiciones completas', () => {
    const ids = ['employment-agriculture-share', 'employment-industry-share', 'employment-services-share'];
    const series = Object.fromEntries(ids.map((id) => [id, getCountrySeries('CHL', id)]));
    expect(ids.every((id) => series[id].length > 0 && series[id].every((item) => item.valueOrigin === 'source_estimate'))).toBe(true);
    const rows = getCompleteCompositionRows(series, ids);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => Math.abs(row.observations.reduce((sum, item) => sum + Number(item.normalizedValue), 0) - 100) <= 0.2)).toBe(true);
  });
});

describe('composiciones sociales', () => {
  it('solo genera filas apilables cuando todos los componentes están presentes', () => {
    const ids = ['population-age-0-14', 'population-age-15-64', 'population-age-65-plus'];
    const series = Object.fromEntries(ids.map((id) => [id, getCountrySeries('ARG', id)]));
    expect(getCompleteCompositionRows(series, ids)).toHaveLength(66);
    const incomplete = { ...series, 'population-age-65-plus': series['population-age-65-plus'].filter((item) => item.year !== 2020) };
    const rows = getCompleteCompositionRows(incomplete, ids);
    expect(rows).toHaveLength(65);
    expect(rows.some((row) => row.year === 2020)).toBe(false);
  });

  it('deriva población absoluta sin modificar ni confundir las observaciones originales', () => {
    const population = getCountrySeries('ARG', 'total-population').find((item) => item.year === 2024)!;
    const percentage = getCountrySeries('ARG', 'population-age-0-14').find((item) => item.year === 2024)!;
    const originalPopulation = population.normalizedValue;
    const originalPercentage = percentage.normalizedValue;
    const derived = derivePopulationObservation(population, percentage)!;
    expect(Number(derived.normalizedValue)).toBeCloseTo(Number(population.normalizedValue) * Number(percentage.normalizedValue) / 100, 10);
    expect(derived.id).toBe(`derived-population:${percentage.id}`);
    expect(derived.originalValue).toBeNull();
    expect(derived.derivation).toMatchObject({ formula: POPULATION_DERIVATION_FORMULA, population, percentage });
    expect(derived.provenance.transformations.join(' ')).toContain('Derivación en vista');
    expect(population.normalizedValue).toBe(originalPopulation);
    expect(percentage.normalizedValue).toBe(originalPercentage);
  });

  it('no deriva valores cuando falta población o las versiones no son compatibles', () => {
    const ids = ['population-age-0-14', 'population-age-15-64', 'population-age-65-plus'];
    const series = Object.fromEntries(['total-population', ...ids].map((id) => [id, getCountrySeries('ARG', id)]));
    expect(getDerivedCompositionRows(series, ids)).toHaveLength(66);
    expect(getDerivedCompositionRows({ ...series, 'total-population': [] }, ids)).toHaveLength(0);
    const population = series['total-population'][0];
    const percentage = series[ids[0]][0];
    const incompatible = { ...percentage, provenance: { ...percentage.provenance, accessDate: '1999-01-01' } };
    expect(derivePopulationObservation(population, incompatible)).toBeUndefined();
  });
});

describe('dominio temporal compartido', () => {
  it('convierte fechas a posiciones dentro de su año sin anualizar episodios', () => {
    expect(dateToDecimalYear('2001-01-01')).toBe(2001);
    expect(dateToDecimalYear('2001-12-01')).toBeGreaterThan(2001.8);
    expect(dateToDecimalYear('2001-12-01')).toBeLessThan(2002);
  });

  it('acerca y aleja dentro de los límites y respeta un intervalo mínimo', () => {
    const zoomed = zoomInterval(1950, currentYear, 2001, 'in');
    expect(zoomed[1] - zoomed[0] + 1).toBe(Math.ceil((currentYear - 1950 + 1) / 2));
    expect(zoomed[0]).toBeGreaterThanOrEqual(1950);
    expect(zoomed[1]).toBeLessThanOrEqual(currentYear);
    expect(zoomInterval(2000, 2003, 2001, 'in')).toEqual([1999, 2002]);
    expect(zoomInterval(1950, currentYear, 2024, 'out')).toEqual([1950, currentYear]);
  });
});
