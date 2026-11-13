import type { CountryCode, CountryYearObservation, Coverage, CrisisEpisode, HistoricalEvent, PresidentialPeriod } from '../types/data';
import type { JudicialChangeNode, LegislativePeriod } from '../types/institutions';
import observationData from '../../data/canonical/observations.json';
import socialObservationData from '../../data/canonical/social-observations.json';
import chileObservationData from '../../data/canonical/chile-observations.json';
import periodData from '../../data/canonical/presidential-periods.json';
import chileOfficialPeriodData from '../../data/canonical/chile-official-presidential-periods.json';
import crisisData from '../../data/canonical/crisis-episodes.json';
import chileLegislativeData from '../../data/canonical/chile-legislative-periods.json';
import chileJudicialData from '../../data/canonical/chile-judicial-changes.json';
import chileDocumentaryEventData from '../../data/canonical/chile-historical-events.json';
import { validateCanonicalData } from './validation';

export const baseObservations = observationData as CountryYearObservation[];
export const socialObservations = socialObservationData as CountryYearObservation[];
export const chilePhase05Observations = chileObservationData as CountryYearObservation[];
export const observations = [...baseObservations, ...socialObservations, ...chilePhase05Observations];
export const coursePresidentialPeriods = periodData as PresidentialPeriod[];
export const chileOfficialPresidentialPeriods = chileOfficialPeriodData as PresidentialPeriod[];
// La exportación conjunta conserva ambas series para auditoría; la vista chilena usa solo la oficial.
export const presidentialPeriods = [...coursePresidentialPeriods, ...chileOfficialPresidentialPeriods];
export const crisisEpisodes = crisisData as CrisisEpisode[];
export const legislativePeriods = chileLegislativeData as LegislativePeriod[];
export const judicialChanges = chileJudicialData as JudicialChangeNode[];
export const documentaryEvents = chileDocumentaryEventData as HistoricalEvent[];

const validationErrors = validateCanonicalData(observations, presidentialPeriods, crisisEpisodes, documentaryEvents, legislativePeriods, judicialChanges);
if (validationErrors.length) throw new Error(`Datos canónicos inválidos: ${validationErrors.join(' | ')}`);

export function getObservation(countryCode: CountryCode, indicatorId: string, year: number): CountryYearObservation | undefined {
  return observations.find((item) => item.countryCode === countryCode && item.indicatorId === indicatorId && item.year === year);
}

export function getCountrySeries(countryCode: CountryCode, indicatorId: string): CountryYearObservation[] {
  return observations
    .filter((item) => item.countryCode === countryCode && item.indicatorId === indicatorId)
    .sort((a, b) => a.year - b.year);
}

export function getObservationCoverage(countryCode: CountryCode, indicatorId: string): Coverage | null {
  return getCountrySeries(countryCode, indicatorId)[0]?.provenance.coverage ?? null;
}

export function getPresidentialPeriods(countryCode: CountryCode): PresidentialPeriod[] {
  const source = countryCode === 'CHL' ? chileOfficialPresidentialPeriods : coursePresidentialPeriods;
  return source
    .filter((item) => item.countryCode === countryCode)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getLegislativePeriods(countryCode: CountryCode): LegislativePeriod[] {
  return legislativePeriods
    .filter((item) => item.countryCode === countryCode)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getJudicialChanges(countryCode: CountryCode): JudicialChangeNode[] {
  return judicialChanges
    .filter((item) => item.countryCode === countryCode)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getCrisisEpisodes(countryCode: CountryCode): CrisisEpisode[] {
  return crisisEpisodes
    .filter((item) => item.countryCode === countryCode)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getHistoricalEvents(countryCode: CountryCode): HistoricalEvent[] {
  const crises: HistoricalEvent[] = getCrisisEpisodes(countryCode).map((crisis) => ({
    id: crisis.id,
    sourceRecordId: crisis.id,
    countryCode: crisis.countryCode,
    kind: 'crisis',
    eventType: crisis.crisisType,
    temporalType: crisis.endDate && crisis.endDate !== crisis.startDate ? 'interval' : 'exact',
    year: Number(crisis.startDate.slice(0, 4)),
    startDate: crisis.startDate,
    endDate: crisis.endDate,
    description: crisis.description,
    domains: ['institutions'],
    actors: [crisis.actors.horizontal, crisis.actors.vertical, crisis.actors.target].filter((actor): actor is string => Boolean(actor)),
    governmentId: null,
    confidence: crisis.confidence,
    relatedEventIds: [],
    provenance: crisis.provenance,
  }));
  const annualStrikes: HistoricalEvent[] = getCountrySeries(countryCode, 'general-strikes').map((observation) => ({
    id: `annual-strike-${observation.id}`,
    sourceRecordId: observation.id,
    countryCode: observation.countryCode,
    kind: 'general_strike',
    eventType: 'Huelgas generales',
    temporalType: 'annual_aggregate',
    year: observation.year,
    count: Number(observation.normalizedValue),
    startDate: null,
    endDate: null,
    description: 'Conteo anual agregado; la fuente no aporta fechas individuales para cada huelga.',
    domains: ['institutions'],
    actors: [],
    governmentId: null,
    confidence: null,
    relatedEventIds: [],
    provenance: observation.provenance,
  }));
  const curated = documentaryEvents.filter((event) => event.countryCode === countryCode);
  return [...curated, ...crises, ...annualStrikes].sort((a, b) => a.year - b.year || (a.startDate ?? '').localeCompare(b.startDate ?? '') || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}
