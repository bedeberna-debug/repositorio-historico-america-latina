import type { CountryCode, Provenance } from './data';

export type LegislativeRelation =
  | 'government_majority'
  | 'opposition_majority'
  | 'divided_or_no_clear_majority'
  | 'congress_absent_or_dissolved'
  | 'unknown';

/** Segmentos propios: una configuración puede cambiar dentro del período legislativo. */
export interface LegislativeConfigurationSegment {
  id: string;
  startDate: string;
  endDate: string | null;
  relation: LegislativeRelation;
  majorityCriterion?: string | null;
  measuredAt?: string | null;
  provenance: Provenance;
}

export interface LegislativePeriod {
  id: string;
  countryCode: CountryCode;
  chamber: 'upper' | 'lower' | 'unicameral';
  startDate: string;
  endDate: string | null;
  termYears?: number | null;
  renewal?: 'full' | 'partial' | 'not_applicable';
  segments: LegislativeConfigurationSegment[];
  provenance: Provenance;
}

/** Escalón para atributos persistentes; no representa renovación completa de la corte. */
export interface JudicialInstitutionalStep {
  id: string;
  countryCode: CountryCode;
  institutionId: string;
  institutionName: string;
  attribute: 'members' | 'appointment_rules' | 'competences' | 'other';
  startDate: string;
  endDate: string | null;
  value: string | number;
  provenance: Provenance;
}

/** Nodo para nombramientos, reformas u otros cambios institucionales puntuales. */
export interface JudicialChangeNode {
  id: string;
  countryCode: CountryCode;
  institutionId: string;
  institutionName: string;
  changeType: 'appointment' | 'reform' | 'competence_change' | 'other';
  date: string;
  description: string;
  provenance: Provenance;
}
