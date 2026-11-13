export const COUNTRY_CODES = [
  'ARG', 'BOL', 'BRA', 'CHL', 'COL', 'CRI', 'DOM', 'ECU', 'SLV',
  'GTM', 'HND', 'MEX', 'NIC', 'PAN', 'PRY', 'PER', 'URY', 'VEN',
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];
export type IndicatorKind = 'continuous' | 'annual_count' | 'categorical' | 'presidential_period' | 'crisis_episode';
export type ValueStatus = 'available' | 'no_data' | 'not_applicable' | 'zero_events';
export type VerificationStatus = 'unverified' | 'in_review' | 'verified';
export type HistoricalDomain = 'economy' | 'society' | 'institutions';
export type HistoricalEventKind = 'crisis' | 'general_strike' | 'election' | 'succession' | 'scandal' | 'reform' | 'constitution' | 'institutional_conflict' | 'other';
export type HistoricalTemporalType = 'exact' | 'interval' | 'annual_aggregate';
export type ValueOrigin = 'observed' | 'source_estimate' | 'derived';
export type OriginalFrequency = 'annual';

export interface Country {
  code: CountryCode;
  name: string;
  mapName: string;
  moduleStatus: 'beta' | 'planned';
}

export interface IndicatorMethodology {
  id: string;
  lineType?: 'national' | 'international';
  povertyLine?: number | null;
  monetaryUnit?: string | null;
  referenceYear?: number | null;
  measure?: 'incidence' | 'gap' | 'other';
  comparabilityNotes?: string;
  compositionGroup?: 'age' | 'residence' | 'employment';
  compositionTolerance?: number;
}

export interface Indicator {
  id: string;
  domain: HistoricalDomain;
  theme: string;
  variant: string;
  family: 'Economía' | 'Sociedad y trabajo' | 'Democracia y representación' | 'Conflictividad y crisis' | 'Sociedad, demografía y condiciones de vida';
  name: string;
  shortName: string;
  kind: IndicatorKind;
  unit: string;
  definition: string;
  originalVariable?: string;
  sourceIds: string[];
  mapCompatible: boolean;
  methodology?: IndicatorMethodology;
}

export interface Coverage {
  startYear: number | null;
  endYear: number | null;
  territorialLevel: 'national' | 'subnational' | 'regional';
  territorialCode?: string;
}

export interface Provenance {
  sourceId: string;
  datasetVersionId: string;
  originalVariable: string;
  definition: string;
  unit: string;
  originalUnit?: string;
  coverage: Coverage;
  transformations: string[];
  verificationStatus: VerificationStatus;
  sourceFile: string;
  sourceSheet: string | null;
  sourceRow: number;
  verificationNote?: string;
  doi?: string;
  url?: string;
  accessDate?: string;
  methodologyId?: string;
  methodologyVariant?: string;
  notes?: string;
}

// Vista general de acontecimientos; el registro canónico original se conserva aparte.
export interface HistoricalEvent {
  id: string;
  sourceRecordId: string;
  countryCode: CountryCode;
  kind: HistoricalEventKind;
  eventType: string;
  temporalType: HistoricalTemporalType;
  year: number;
  count?: number;
  startDate: string | null;
  endDate: string | null;
  description: string;
  domains: HistoricalDomain[];
  actors: string[];
  governmentId: string | null;
  confidence: string | null;
  relatedEventIds: string[];
  name?: string;
  verificationStatus?: VerificationStatus;
  uncertaintyNotes?: string;
  inclusionReason?: string;
  provenance: Provenance;
}

export interface PopulationDerivation {
  formula: string;
  population: CountryYearObservation;
  percentage: CountryYearObservation;
  resultUnit: string;
}

export interface CountryYearObservation {
  id: string;
  countryCode: CountryCode;
  indicatorId: string;
  year: number;
  originalValue: string | number | null;
  normalizedValue: string | number | null;
  valueStatus: ValueStatus;
  valueOrigin?: ValueOrigin;
  originalFrequency?: OriginalFrequency;
  provenance: Provenance;
  /** Cálculo efímero de presentación; nunca sustituye ni modifica las observaciones canónicas. */
  derivation?: PopulationDerivation;
}

export interface PresidentialPeriod {
  id: string;
  countryCode: CountryCode;
  presidentName: string;
  startDate: string;
  endDate: string | null;
  durationDays: number;
  party: string | null;
  coalition: string | null;
  interruptionStatus: 'unknown' | 'completed' | 'interrupted';
  periodType?: 'constitutional' | 'de_facto' | 'interim';
  institutionalNote?: string;
  originalValues?: {
    adm: number;
    name: string;
    surname: string;
    failure: number;
    failure2: number;
  };
  provenance: Provenance;
}

export interface CrisisEpisode {
  id: string;
  countryCode: CountryCode;
  crisisType: string;
  startDate: string;
  endDate: string | null;
  peakDate?: string | null;
  durationDays: number;
  durationToPeakDays: number | null;
  description: string;
  actors: { horizontal: string | null; vertical: string | null; target: string | null };
  mechanisms: Record<string, number | null>;
  presidentialInterruption: 'yes' | 'no' | 'unknown';
  presidentialExit: 'yes' | 'no' | 'unknown';
  notes: string | null;
  confidence: string | null;
  justifications: { start: string | null; end: string | null; peak: string | null; peakNote: string | null };
  originalValues: { pres_fail: string; salida: number; edited: number | null; total_events: number | null };
  provenance: Provenance;
}

export interface DatasetVersion {
  id: string;
  datasetName: string;
  version: string | null;
  publicationDate: string | null;
  accessDate: string | null;
  license: string | null;
  status: 'planned' | 'imported';
  sourceFile?: string;
  sourceSheet?: string | null;
  sha256?: string;
}

export interface Source {
  id: string;
  institution: string;
  title: string;
  url?: string;
  doi?: string;
  bibliographicReference?: string | null;
  metadataNote?: string;
  versions: DatasetVersion[];
}
