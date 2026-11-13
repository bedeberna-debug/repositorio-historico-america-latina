import type { KeyboardEvent, MouseEvent } from 'react';
import type { CountryYearObservation } from '../types/data';
import { buildContinuousSegments } from './TemporalChart';

interface ContinuousSeriesProps {
  items: CountryYearObservation[];
  xYear: (year: number) => number;
  y: (value: number) => number;
  className: string;
  selectedYear: number;
  selectedObservationId?: string;
  onSelect: (item: CountryYearObservation) => void;
  observationLabel: (item: CountryYearObservation) => string;
  areaBaseline?: number;
  hidePoints?: boolean;
  areaInteractive?: boolean;
  areaLabel?: string;
  onAreaSelect?: (event: MouseEvent<SVGPathElement>, segment: CountryYearObservation[]) => void;
}

export function ContinuousSeries({
  items, xYear, y, className, selectedYear, selectedObservationId,
  onSelect, observationLabel, areaBaseline, hidePoints = false,
  areaInteractive = false, areaLabel, onAreaSelect,
}: ContinuousSeriesProps) {
  const segments = buildContinuousSegments(items);
  const originOf = (item: CountryYearObservation) => item.valueOrigin ?? (item.derivation ? 'derived' : 'observed');
  const segmentOrigin = (segment: CountryYearObservation[]) => {
    const origins = new Set(segment.map(originOf));
    return origins.size === 1 ? [...origins][0] : 'mixed';
  };
  const selectAreaWithKeyboard = (event: KeyboardEvent<SVGPathElement>, segment: CountryYearObservation[]) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const item = segment.find((observation) => observation.year === selectedYear) ?? segment[0];
    if (item) onSelect(item);
  };
  return (
    <>
      {typeof areaBaseline === 'number' && segments.map((segment) => {
        const d = [
          `M ${xYear(segment[0].year)} ${areaBaseline}`,
          ...segment.map((item) => `L ${xYear(item.year)} ${y(Number(item.normalizedValue))}`),
          `L ${xYear(segment.at(-1)!.year)} ${areaBaseline}`,
          'Z',
        ].join(' ');
        const selected = segment.some((item) => item.id === selectedObservationId);
        const origin = segmentOrigin(segment);
        return <path
          key={`area-${segment[0].id}`}
          className={`history-series-area ${className} ${origin === 'source_estimate' ? 'source-estimate' : ''} ${areaInteractive ? 'interactive' : ''} ${selected ? 'selected' : ''}`}
          data-series-area={segment[0].indicatorId}
          data-value-origin={origin}
          data-segment-years={segment.map((item) => item.year).join(',')}
          d={d}
          role={areaInteractive ? 'button' : undefined}
          tabIndex={areaInteractive ? 0 : undefined}
          aria-label={areaInteractive ? areaLabel ?? `Área de ${segment[0].indicatorId}; activa para abrir el año seleccionado` : undefined}
          onClick={areaInteractive ? (event) => onAreaSelect?.(event, segment) : undefined}
          onKeyDown={areaInteractive ? (event) => selectAreaWithKeyboard(event, segment) : undefined}
        >
          {areaInteractive && <title>{areaLabel}</title>}
        </path>;
      })}
      {segments.map((segment) => {
        const origin = segmentOrigin(segment);
        return <path
          key={segment[0].id}
          className={`history-series-line ${className} ${origin === 'source_estimate' ? 'source-estimate' : ''}`}
          data-value-origin={origin}
          data-segment-years={segment.map((item) => item.year).join(',')}
          d={segment.map((item, index) => `${index ? 'L' : 'M'} ${xYear(item.year)} ${y(Number(item.normalizedValue))}`).join(' ')}
        />;
      })}
      {!hidePoints && items.map((item) => {
        const origin = originOf(item);
        return <circle
          key={item.id}
          className={`history-series-point ${className} ${origin === 'source_estimate' ? 'source-estimate' : ''}`}
          data-series-point
          data-indicator-id={item.indicatorId}
          data-value-origin={origin}
          data-year={item.year}
          cx={xYear(item.year)}
          cy={y(Number(item.normalizedValue))}
          r={selectedObservationId === item.id || (selectedYear === item.year && !selectedObservationId) ? 5 : 3.5}
          role="button"
          tabIndex={0}
          aria-label={observationLabel(item)}
          onClick={() => onSelect(item)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(item);
            }
          }}
        ><title>{observationLabel(item)}</title></circle>;
      })}
    </>
  );
}
