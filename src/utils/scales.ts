import type { CountryYearObservation, Indicator } from '../types/data';

export function numericExtent(observations: CountryYearObservation[], indicatorId: string): [number, number] | null {
  const values = observations
    .filter((item) => item.indicatorId === indicatorId && typeof item.normalizedValue === 'number')
    .map((item) => item.normalizedValue as number);
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}

function mix(start: number[], end: number[], amount: number): string {
  const channels = start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
  return `rgb(${channels.join(',')})`;
}

export function observationColor(observation: CountryYearObservation | undefined, indicator: Indicator, extent: [number, number] | null): string {
  if (!observation || observation.valueStatus === 'no_data') return '#d8dcd4';
  if (observation.valueStatus === 'not_applicable') return 'url(#not-applicable-pattern)';
  const value = Number(observation.normalizedValue);
  if (indicator.kind === 'annual_count') {
    if (value === 0) return '#fbfaf6';
    const max = extent?.[1] ?? 1;
    return mix([181, 199, 181], [40, 88, 70], Math.min(1, Math.max(0.15, value / Math.max(1, max))));
  }
  if (!extent || extent[0] === extent[1]) return '#6e9883';
  return mix([224, 228, 220], [40, 92, 74], (value - extent[0]) / (extent[1] - extent[0]));
}

export function formatValue(observation: CountryYearObservation): string {
  const value = observation.normalizedValue ?? observation.originalValue;
  if (typeof value !== 'number') return String(value ?? 'Sin dato disponible');
  const maximumFractionDigits = observation.indicatorId === 'electoral-democracy' ? 3 : observation.indicatorId === 'general-strikes' ? 0 : 1;
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits }).format(value);
}

export function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits }).format(value);
}
