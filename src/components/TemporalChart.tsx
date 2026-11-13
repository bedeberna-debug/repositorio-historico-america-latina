import { useMemo, useState } from 'react';
import { countryByCode } from '../data/countries';
import { getCountrySeries, getObservationCoverage } from '../data/repositories';
import { getSource } from '../data/sources';
import { displayObservation } from '../utils/dataStatus';
import { formatNumber, formatValue } from '../utils/scales';
import type { CountryCode, CountryYearObservation, Indicator } from '../types/data';
import { ProvenanceDetail } from './ProvenanceDetail';

const WIDTH = 900;
const HEIGHT = 360;
const MARGIN = { top: 28, right: 24, bottom: 45, left: 62 };

export function buildContinuousSegments(series: CountryYearObservation[]): CountryYearObservation[][] {
  const segments: CountryYearObservation[][] = [];
  for (const observation of series) {
    if (typeof observation.normalizedValue !== 'number' || observation.valueStatus === 'no_data') continue;
    const previous = segments.at(-1)?.at(-1);
    if (!previous || observation.year !== previous.year + 1) segments.push([observation]);
    else segments.at(-1)!.push(observation);
  }
  return segments;
}

interface TemporalChartProps {
  countryCode: CountryCode;
  indicator: Indicator;
  year: number;
  setYear: (year: number) => void;
}

export function TemporalChart({ countryCode, indicator, year, setYear }: TemporalChartProps) {
  const series = getCountrySeries(countryCode, indicator.id);
  const coverage = getObservationCoverage(countryCode, indicator.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = series.find((item) => item.id === selectedId) ?? series.find((item) => item.year === year) ?? series.at(-1);
  const segments = useMemo(() => buildContinuousSegments(series), [series]);

  if (indicator.kind === 'presidential_period' || indicator.kind === 'crisis_episode') {
    return <div className="chart-episode-note">Este indicador no se agrega como valor anual. Consulta los intervalos y episodios con fechas exactas en las tarjetas siguientes.</div>;
  }
  if (!series.length || !coverage?.startYear || !coverage.endYear) {
    return <div className="chart-episode-note">Sin observaciones cargadas para este país e indicador.</div>;
  }

  const startYear = coverage.startYear;
  const endYear = coverage.endYear;
  const values = series.map((item) => Number(item.normalizedValue));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const yMin = indicator.kind === 'annual_count' ? 0 : Math.max(0, minValue - (maxValue - minValue || 1) * 0.12);
  const yMax = indicator.kind === 'annual_count' ? Math.max(1, maxValue) : maxValue + (maxValue - minValue || 1) * 0.12;
  const x = (value: number) => MARGIN.left + ((value - startYear) / Math.max(1, endYear - startYear)) * (WIDTH - MARGIN.left - MARGIN.right);
  const y = (value: number) => HEIGHT - MARGIN.bottom - ((value - yMin) / Math.max(0.000001, yMax - yMin)) * (HEIGHT - MARGIN.top - MARGIN.bottom);
  const yearTicks = [...new Set([startYear, Math.round((startYear + endYear) / 2), endYear])];
  const yTicks = Array.from({ length: 4 }, (_, index) => yMin + ((yMax - yMin) * index) / 3);
  const bandWidth = Math.max(3, (WIDTH - MARGIN.left - MARGIN.right) / Math.max(1, endYear - startYear + 1) * 0.68);

  const selectObservation = (item: CountryYearObservation) => {
    setSelectedId(item.id);
    setYear(item.year);
  };

  return (
    <div className="temporal-chart-wrap">
      <svg className="temporal-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={`Serie temporal de ${indicator.name} para ${countryByCode[countryCode].name}`}>
        {yTicks.map((tick) => <g key={tick} className="chart-axis"><line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} /><text x={MARGIN.left - 10} y={y(tick) + 3} textAnchor="end">{formatNumber(tick, indicator.id === 'electoral-democracy' ? 2 : 0)}</text></g>)}
        {yearTicks.map((tick) => <text className="chart-year-tick" key={tick} x={x(tick)} y={HEIGHT - 16} textAnchor="middle">{tick}</text>)}
        {indicator.kind === 'continuous' && segments.map((segment) => (
          <path
            key={segment[0].id}
            className="series-line"
            data-segment-years={segment.map((item) => item.year).join(',')}
            d={segment.map((item, index) => `${index ? 'L' : 'M'} ${x(item.year)} ${y(Number(item.normalizedValue))}`).join(' ')}
          />
        ))}
        {series.map((item) => {
          const value = Number(item.normalizedValue);
          const display = displayObservation(item);
          const label = `${countryByCode[countryCode].name}, ${item.year}: ${display.label} ${item.provenance.unit}. Fuente: ${getSource(item.provenance.sourceId)?.title}`;
          if (indicator.kind === 'annual_count') {
            const barY = y(value);
            return <rect
              key={item.id} className={`series-bar ${value === 0 ? 'zero' : ''}`} data-series-point data-year={item.year}
              x={x(item.year) - bandWidth / 2} y={barY} width={bandWidth} height={Math.max(value === 0 ? 2 : 3, HEIGHT - MARGIN.bottom - barY)}
              role="button" tabIndex={0} aria-label={label}
              onMouseEnter={() => setSelectedId(item.id)} onFocus={() => setSelectedId(item.id)} onClick={() => selectObservation(item)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectObservation(item); } }}
            ><title>{label}</title></rect>;
          }
          return <circle
            key={item.id} className="series-point" data-series-point data-year={item.year} cx={x(item.year)} cy={y(value)} r={selected?.id === item.id ? 6 : 4}
            role="button" tabIndex={0} aria-label={label}
            onMouseEnter={() => setSelectedId(item.id)} onFocus={() => setSelectedId(item.id)} onClick={() => selectObservation(item)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectObservation(item); } }}
          ><title>{label}</title></circle>;
        })}
      </svg>
      {selected && <div className="chart-record-detail" aria-live="polite">
        <div><span className="section-kicker">Registro seleccionado</span><strong>{selected.year} · {formatValue(selected)}</strong><p>{selected.provenance.unit} · {getSource(selected.provenance.sourceId)?.title}</p></div>
        <ProvenanceDetail provenance={selected.provenance} />
      </div>}
    </div>
  );
}
