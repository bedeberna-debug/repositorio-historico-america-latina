import { describe, expect, it } from 'vitest';
import geography from '../data/geo/latin-america.json';
import { COUNTRY_CODES } from '../types/data';
import type { CountryYearObservation, CrisisEpisode, PresidentialPeriod } from '../types/data';
import { countries } from '../data/countries';
import { indicators } from '../data/indicators';
import { getSource, sources } from '../data/sources';
import {
  baseObservations, socialObservations, chilePhase05Observations,
  coursePresidentialPeriods, chileOfficialPresidentialPeriods,
  crisisEpisodes, documentaryEvents, getObservation, getObservationCoverage,
  judicialChanges, legislativePeriods, observations, presidentialPeriods,
} from '../data/repositories';
import { displayObservation } from '../utils/dataStatus';
import { validateCanonicalData } from '../data/validation';
import { buildContinuousSegments } from '../components/TemporalChart';
import importReport from '../../data/canonical/import-report.json';

const base = getObservation('ARG', 'gdp-per-capita-ppp-2021', 2000)!;
const basePeriod = presidentialPeriods[0];
const baseCrisis = crisisEpisodes[0];

function changedObservation(change: (item: CountryYearObservation) => void): CountryYearObservation[] {
  const item = structuredClone(base);
  change(item);
  return [item];
}

describe('arquitectura y datos canónicos', () => {
  it('contiene exactamente los 18 países y códigos ISO únicos', () => {
    expect(countries).toHaveLength(18);
    expect(new Set(countries.map((country) => country.code))).toEqual(new Set(COUNTRY_CODES));
  });

  it('hace coincidir las 18 geometrías con los códigos normalizados', () => {
    const geometryCodes = geography.features.map((feature) => feature.properties.iso3);
    expect(geometryCodes).toHaveLength(18);
    expect(new Set(geometryCodes)).toEqual(new Set(COUNTRY_CODES));
  });

  it('integra treinta y dos indicadores y datos reales de Argentina y Chile', () => {
    expect(indicators).toHaveLength(32);
    expect(observations).toHaveLength(1873);
    expect(observations.filter((item) => item.countryCode === 'ARG')).toHaveLength(533);
    expect(observations.filter((item) => item.countryCode === 'CHL')).toHaveLength(1340);
    expect(chilePhase05Observations).toHaveLength(823);
    const socialIds = new Set(indicators.filter((indicator) => indicator.domain === 'society').map((indicator) => indicator.id));
    expect(socialIds.size).toBe(15);
    expect(observations.filter((item) => socialIds.has(item.indicatorId))).toHaveLength(1075);
    expect(new Set(observations.map((item) => item.countryCode))).toEqual(new Set(['ARG', 'CHL']));
    expect(presidentialPeriods).toHaveLength(35);
    expect(coursePresidentialPeriods).toHaveLength(17);
    expect(chileOfficialPresidentialPeriods).toHaveLength(18);
    expect(chileOfficialPresidentialPeriods.every((item) => item.countryCode === 'CHL')).toBe(true);
    expect(crisisEpisodes).toHaveLength(4);
  });

  it('muestra valores reales de Argentina y Chile en años cubiertos', () => {
    expect(getObservation('ARG', 'gdp-per-capita-ppp-2021', 2000)?.normalizedValue).toBeCloseTo(22281.38142999575);
    expect(getObservation('CHL', 'gdp-per-capita-ppp-2021', 2025)?.normalizedValue).toBeCloseTo(30863.42231551688);
    expect(getObservation('ARG', 'electoral-democracy', 2000)?.normalizedValue).toBe(0.833);
    expect(getObservation('CHL', 'electoral-democracy', 2024)?.normalizedValue).toBe(0.845);
  });

  it('conserva valores sociales comprobables y la transformación de población a millones', () => {
    const argPopulation = getObservation('ARG', 'total-population', 2025)!;
    const chlPopulation = getObservation('CHL', 'total-population', 2025)!;
    expect(argPopulation.originalValue).toBe(45851378);
    expect(argPopulation.normalizedValue).toBeCloseTo(45.851378);
    expect(chlPopulation.originalValue).toBe(19859921);
    expect(chlPopulation.normalizedValue).toBeCloseTo(19.859921);
    expect(getObservation('ARG', 'poverty-national-headcount', 2024)?.normalizedValue).toBe(38.1);
    expect(getObservation('CHL', 'poverty-national-headcount', 2022)?.normalizedValue).toBe(6.5);
    expect(getObservation('ARG', 'poverty-international-3-2021ppp', 2002)?.normalizedValue).toBe(17.1);
    expect(getObservation('CHL', 'poverty-international-3-2021ppp', 1990)?.normalizedValue).toBe(16);
    expect(getObservation('ARG', 'adult-literacy-rate', 2020)?.normalizedValue).toBeCloseTo(99.1399993896484);
    expect(getObservation('CHL', 'adult-literacy-rate', 2017)?.normalizedValue).toBeCloseTo(96.4000015258789);
  });

  it('mantiene los años fuera de cobertura sin dato', () => {
    expect(getObservation('ARG', 'general-strikes', 1983)).toBeUndefined();
    expect(getObservation('CHL', 'general-strikes', 1989)).toBeUndefined();
    expect(getObservation('ARG', 'general-strikes', 2020)).toBeUndefined();
    expect(getObservation('ARG', 'total-population', 1959)).toBeUndefined();
    expect(getObservation('CHL', 'total-population', 1950)).toBeUndefined();
    const coverage = getObservationCoverage('ARG', 'general-strikes');
    expect(displayObservation(undefined, coverage, 1983).detail).toMatch(/Fuera de la cobertura efectiva/);
    expect(displayObservation(undefined, getObservationCoverage('ARG', 'total-population'), 1959).detail).toMatch(/Fuera de la cobertura efectiva/);
  });

  it('no inventa valores V-Dem para 2025', () => {
    expect(getObservation('ARG', 'electoral-democracy', 2025)).toBeUndefined();
    expect(getObservation('CHL', 'electoral-democracy', 2025)).toBeUndefined();
    expect(getObservationCoverage('ARG', 'electoral-democracy')?.endYear).toBe(2024);
  });

  it('distingue cero, ausencia y falta de cobertura en huelgas', () => {
    const zero = getObservation('ARG', 'general-strikes', 1989);
    expect(zero?.originalValue).toBe(0);
    expect(zero?.valueStatus).toBe('zero_events');
    expect(displayObservation(zero).label).toBe('0 eventos registrados');
    expect(displayObservation(undefined, getObservationCoverage('ARG', 'general-strikes'), 2020).detail).toMatch(/Fuera de la cobertura/);
    expect(displayObservation(undefined).detail).toMatch(/No existe una observación/);
  });

  it('conserva períodos presidenciales independientes con fechas y duración', () => {
    expect(presidentialPeriods[0]).toMatchObject({ presidentName: 'Raul Alfonsin', startDate: '1983-12-10', endDate: '1989-07-08', durationDays: 2037, interruptionStatus: 'interrupted' });
    const menem = presidentialPeriods.filter((item) => item.id === 'pres-arg-3702' || item.id === 'pres-arg-3703');
    expect(menem).toHaveLength(2);
    expect(menem[0].startDate).not.toBe(menem[1].startDate);
    expect(presidentialPeriods.every((item) => item.party === null && item.coalition === null)).toBe(true);
  });

  it('conserva crisis con fechas, actores, mecanismos, salida y confianza', () => {
    expect(crisisEpisodes.map((item) => item.id)).toEqual(['crisis-arg-2001-12-01', 'crisis-arg-2002-06-26', 'crisis-chl-2019-10-18', 'crisis-chl-2021-10-13']);
    expect(baseCrisis).toMatchObject({ startDate: '2001-12-01', endDate: '2002-03-05', peakDate: '2002-01-02', durationDays: 94, presidentialExit: 'yes', confidence: 'alta' });
    expect(baseCrisis.actors.vertical).toContain('piqueteros');
    expect(baseCrisis.mechanisms.HPG).toBe(1);
  });

  it('vincula cada observación con fuente, unidad, archivo o respuesta y posición original', () => {
    for (const item of observations) {
      expect(getSource(item.provenance.sourceId)).toBeDefined();
      expect(item.provenance.sourceFile.length).toBeGreaterThan(0);
      expect(item.provenance.sourceRow).toBeGreaterThanOrEqual(1);
      expect(item.provenance.unit).toBe(indicators.find((indicator) => indicator.id === item.indicatorId)?.unit);
      if (item.indicatorId === 'total-population') expect(item.normalizedValue).toBeCloseTo(Number(item.originalValue) / 1_000_000, 10);
      else if (item.indicatorId === 'gdp-total-constant-2015-usd') expect(item.normalizedValue).toBeCloseTo(Number(item.originalValue) / 1_000_000_000, 10);
      else expect(item.originalValue).toBe(item.normalizedValue);
    }
    expect(sources.flatMap((source) => source.versions).every((version) => version.status === 'imported')).toBe(true);
  });

  it('documenta treinta muestras cotejadas y la integridad de los originales del curso', () => {
    expect(importReport.counts.verifiedAgainstOriginalSample).toBe(12);
    expect(importReport.sampleChecks.every((item) => item.result === 'coincide')).toBe(true);
    const courseRecords = [...baseObservations, ...socialObservations, ...coursePresidentialPeriods, ...crisisEpisodes];
    expect(courseRecords.filter((item) => item.provenance.verificationStatus === 'verified')).toHaveLength(30);
    expect(chilePhase05Observations.filter((item) => item.valueOrigin === 'source_estimate')).toHaveLength(176);
    expect(importReport.originalFilesUnmodified).toBe(true);
    expect(importReport.dictionaryDifferences.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validación de importación', () => {
  it('acepta los datos canónicos', () => {
    expect(validateCanonicalData(observations, presidentialPeriods, crisisEpisodes, documentaryEvents, legislativePeriods, judicialChanges)).toEqual([]);
  });

  it('detecta duplicados país-año-indicador', () => {
    expect(validateCanonicalData([base, base], [], []).join(' ')).toMatch(/Duplicado país-año-indicador/);
  });

  it('detecta códigos de país desconocidos', () => {
    expect(validateCanonicalData(changedObservation((item) => { item.countryCode = 'XXX' as never; }), [], []).join(' ')).toMatch(/Código de país desconocido/);
  });

  it('detecta años fuera de rango', () => {
    expect(validateCanonicalData(changedObservation((item) => { item.year = 1500; }), [], []).join(' ')).toMatch(/Año fuera de rango/);
  });

  it('detecta números almacenados como texto', () => {
    expect(validateCanonicalData(changedObservation((item) => { item.normalizedValue = '22281'; }), [], []).join(' ')).toMatch(/Valor numérico almacenado incorrectamente/);
  });

  it('detecta variables y fuentes inexistentes', () => {
    expect(validateCanonicalData(changedObservation((item) => { item.indicatorId = 'inexistente'; }), [], []).join(' ')).toMatch(/Variable inexistente/);
    expect(validateCanonicalData(changedObservation((item) => { item.provenance.sourceId = 'inexistente'; }), [], []).join(' ')).toMatch(/Fuente inexistente/);
  });

  it('detecta observaciones sin procedencia', () => {
    expect(validateCanonicalData(changedObservation((item) => { item.provenance.sourceFile = ''; }), [], []).join(' ')).toMatch(/Observación sin procedencia/);
  });

  it('detecta ceros clasificados incorrectamente y unidades incompatibles', () => {
    expect(validateCanonicalData(changedObservation((item) => { item.valueStatus = 'zero_events'; }), [], []).join(' ')).toMatch(/Cero clasificado incorrectamente/);
    expect(validateCanonicalData(changedObservation((item) => { item.provenance.unit = '% anual'; }), [], []).join(' ')).toMatch(/Unidad incompatible/);
  });

  it('detecta porcentajes fuera de rango y cambios metodológicos no registrados', () => {
    const percentage = structuredClone(getObservation('ARG', 'poverty-national-headcount', 2024)!);
    percentage.normalizedValue = 101;
    expect(validateCanonicalData([percentage], [], []).join(' ')).toMatch(/Porcentaje fuera de rango/);
    const methodology = structuredClone(getObservation('ARG', 'poverty-national-headcount', 2024)!);
    methodology.provenance.methodologyVariant = 'Variante no registrada';
    expect(validateCanonicalData([methodology], [], []).join(' ')).toMatch(/Cambio de metodología no registrado/);
  });

  it('detecta composiciones incompletas e incompatibles sin corregir sus valores', () => {
    const ids = ['population-age-0-14', 'population-age-15-64', 'population-age-65-plus'];
    const rows = ids.map((id) => getObservation('ARG', id, 2020)!);
    expect(validateCanonicalData([rows[0]], [], []).join(' ')).toMatch(/Composición age incompleta/);
    const incompatible = structuredClone(rows);
    incompatible[0].normalizedValue = 80;
    expect(validateCanonicalData(incompatible, [], []).join(' ')).toMatch(/Composición age incompatible/);
    expect(incompatible[0].originalValue).toBe(rows[0].originalValue);
  });

  it('detecta fechas de término anteriores al inicio', () => {
    const period = structuredClone(basePeriod) as PresidentialPeriod;
    period.endDate = '1980-01-01';
    expect(validateCanonicalData([], [period], []).join(' ')).toMatch(/Fecha de término anterior/);
    const crisis = structuredClone(baseCrisis) as CrisisEpisode;
    crisis.endDate = '2000-01-01';
    expect(validateCanonicalData([], [], [crisis]).join(' ')).toMatch(/Fecha de término anterior/);
  });
});

describe('representación temporal', () => {
  it('no conecta artificialmente los vacíos entre años', () => {
    const first = structuredClone(base);
    const second = structuredClone(base);
    const fourth = structuredClone(base);
    second.year = 2001;
    fourth.year = 2003;
    const segments = buildContinuousSegments([first, second, fourth]);
    expect(segments.map((segment) => segment.map((item) => item.year))).toEqual([[2000, 2001], [2003]]);
  });

  it('mantiene separados los segmentos de pobreza cuando faltan encuestas', () => {
    const series = (countryCode: 'ARG' | 'CHL') => observations
      .filter((item) => item.countryCode === countryCode && item.indicatorId === 'poverty-international-3-2021ppp')
      .sort((a, b) => a.year - b.year);
    const argSegments = buildContinuousSegments(series('ARG'));
    const chlSegments = buildContinuousSegments(series('CHL'));
    expect(argSegments.flat().some((item) => item.year === 2015)).toBe(false);
    expect(argSegments.some((segment) => segment.some((item) => item.year === 2014) && segment.some((item) => item.year === 2016))).toBe(false);
    expect(chlSegments.some((segment) => segment.some((item) => item.year === 1987) && segment.some((item) => item.year === 1990))).toBe(false);
    expect(chlSegments.length).toBeGreaterThan(1);
  });
});
