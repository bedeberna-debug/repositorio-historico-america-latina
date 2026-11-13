import type { CountryYearObservation, Coverage } from '../types/data';

export interface ObservationDisplay {
  label: string;
  detail: string;
  status: 'available' | 'no_data' | 'not_applicable' | 'zero_events';
}

export function displayObservation(observation?: CountryYearObservation, coverage?: Coverage | null, year?: number): ObservationDisplay {
  if (!observation || observation.valueStatus === 'no_data') {
    const outsideCoverage = coverage && year !== undefined && (coverage.startYear === null || coverage.endYear === null || year < coverage.startYear || year > coverage.endYear);
    if (outsideCoverage) return { label: 'Sin dato disponible', detail: `Fuera de la cobertura efectiva de la fuente (${coverage.startYear ?? 'inicio pendiente'}–${coverage.endYear ?? 'término pendiente'}).`, status: 'no_data' };
    return { label: 'Sin dato disponible', detail: 'No existe una observación cargada para este año; no se imputa ni se sustituye por cero.', status: 'no_data' };
  }
  if (observation.valueStatus === 'not_applicable') {
    return { label: 'No aplicable', detail: 'El indicador no aplica a este territorio o período según su ficha metodológica.', status: 'not_applicable' };
  }
  if (observation.valueStatus === 'zero_events') {
    return { label: '0 eventos registrados', detail: 'La fuente cubre este año y registra explícitamente cero eventos.', status: 'zero_events' };
  }
  const value = observation.normalizedValue ?? observation.originalValue;
  return { label: String(value), detail: 'Valor vinculado a su fuente, versión y estado de verificación.', status: 'available' };
}
