import type { MouseEvent, ReactNode } from 'react';
import type { CountryYearObservation } from '../types/data';

export const HISTORY_WIDTH = 1200;
export const PLOT_LEFT = 180;
export const PLOT_RIGHT = 1160;
export const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
export const CHART_TOP = 65;
export const CHART_BOTTOM = 185;

export interface HistoryScale {
  minimum: number;
  maximum: number;
  y: (value: number) => number;
}

export function makeHistoryScale(
  items: CountryYearObservation[],
  top = CHART_TOP,
  bottom = CHART_BOTTOM,
  zeroBase = false,
): HistoryScale {
  const values = items
    .filter((item) => typeof item.normalizedValue === 'number' && item.valueStatus !== 'no_data')
    .map((item) => Number(item.normalizedValue));
  const dataMinimum = values.length ? Math.min(...values) : 0;
  const dataMaximum = values.length ? Math.max(...values) : 1;
  const padding = (dataMaximum - dataMinimum || Math.abs(dataMaximum) || 1) * 0.12;
  const minimum = zeroBase ? 0 : Math.max(0, dataMinimum - padding);
  const maximum = zeroBase ? Math.max(1, dataMaximum + padding) : dataMaximum + padding;
  return {
    minimum,
    maximum,
    y: (value: number) => bottom - ((value - minimum) / Math.max(0.000001, maximum - minimum)) * (bottom - top),
  };
}

interface SharedHistoryChartProps {
  countryCode: 'ARG' | 'CHL';
  band: string;
  height?: number;
  ariaLabel: string;
  viewStart: number;
  viewEnd: number;
  selectedYear: number;
  x: (decimalYear: number) => number;
  xYear: (year: number) => number;
  onSelectYear: (year: number) => void;
  children: ReactNode;
}

export function SharedHistoryChart({
  countryCode, band, height = 225, ariaLabel, viewStart, viewEnd, selectedYear,
  x, xYear, onSelectYear, children,
}: SharedHistoryChartProps) {
  const clipId = `history-${countryCode}-${band}`;
  const tickCount = Math.min(7, viewEnd - viewStart + 1);
  const ticks: number[] = [...new Set<number>(Array.from({ length: tickCount }, (_, index) => (
    Math.round(viewStart + ((viewEnd - viewStart) * index) / Math.max(1, tickCount - 1))
  )))];
  const cursorX = x(selectedYear + 0.5);

  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest('[role="button"]')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * HISTORY_WIDTH;
    const selected = Math.floor(viewStart + ((svgX - PLOT_LEFT) / PLOT_WIDTH) * (viewEnd - viewStart + 1));
    if (selected >= viewStart && selected <= viewEnd) onSelectYear(selected);
  };

  return (
    <div className="history-chart-scroll">
      <svg
        className="history-chart"
        viewBox={`0 0 ${HISTORY_WIDTH} ${height}`}
        role="group"
        aria-label={ariaLabel}
        onClick={handleClick}
      >
        <defs>
          <clipPath id={clipId}><rect x={PLOT_LEFT} y="28" width={PLOT_WIDTH} height={height - 28} /></clipPath>
        </defs>
        {ticks.map((tick) => (
          <g key={tick} className="history-axis-tick">
            <line x1={xYear(tick)} x2={xYear(tick)} y1="29" y2={height - 10} />
            <text x={xYear(tick)} y="20" textAnchor="middle">{tick}</text>
          </g>
        ))}
        <line className="shared-year-cursor" data-shared-cursor x1={cursorX} x2={cursorX} y1="29" y2={height - 8} />
        <text className="shared-year-label" x={Math.min(PLOT_RIGHT - 20, Math.max(PLOT_LEFT + 20, cursorX))} y="40" textAnchor="middle">{selectedYear}</text>
        {children}
      </svg>
    </div>
  );
}

export function chartClipId(countryCode: 'ARG' | 'CHL', band: string) {
  return `history-${countryCode}-${band}`;
}
