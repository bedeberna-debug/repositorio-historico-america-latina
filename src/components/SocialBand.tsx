import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import type { CountryYearObservation } from '../types/data';
import { indicatorById } from '../data/indicators';
import { getSource } from '../data/sources';
import { derivePopulationObservation } from '../utils/derivedPopulation';
import { formatNumber } from '../utils/scales';
import { ContinuousSeries } from './ContinuousSeries';
import {
  CHART_BOTTOM, CHART_TOP, HISTORY_WIDTH, PLOT_LEFT, PLOT_RIGHT, PLOT_WIDTH,
  SharedHistoryChart, chartClipId, makeHistoryScale,
} from './HistoryChart';

export const SOCIAL_SERIES_IDS = [
  'total-population',
  'population-age-0-14', 'population-age-15-64', 'population-age-65-plus',
  'urban-population-share', 'rural-population-share',
  'poverty-national-headcount', 'poverty-international-3-2021ppp',
  'adult-literacy-rate',
  'gini-index', 'labor-force-participation-rate',
  'employment-agriculture-share', 'employment-industry-share', 'employment-services-share',
  'electricity-access',
] as const;

const AGE_IDS = ['population-age-0-14', 'population-age-15-64', 'population-age-65-plus'];
const RESIDENCE_IDS = ['urban-population-share', 'rural-population-share'];
const EMPLOYMENT_IDS = ['employment-agriculture-share', 'employment-industry-share', 'employment-services-share'];
type SocialTopic = 'population' | 'age' | 'residence' | 'poverty' | 'education' | 'inequality' | 'labor-participation' | 'employment' | 'electricity';
type CompositionUnit = 'population' | 'percentage';

interface SocialBandProps {
  countryCode: 'ARG' | 'CHL';
  series: Record<string, CountryYearObservation[]>;
  viewStart: number;
  viewEnd: number;
  selectedYear: number;
  selectedObservationId?: string;
  x: (decimalYear: number) => number;
  xYear: (year: number) => number;
  onSelectYear: (year: number) => void;
  onSelect: (item: CountryYearObservation) => void;
  observationLabel: (item: CountryYearObservation) => string;
  timeControls: ReactNode;
}

export interface CompositionRow {
  year: number;
  observations: CountryYearObservation[];
}

export function getCompleteCompositionRows(
  series: Record<string, CountryYearObservation[]>,
  indicatorIds: string[],
  viewStart = -Infinity,
  viewEnd = Infinity,
): CompositionRow[] {
  const years = [...new Set(indicatorIds.flatMap((id) => (series[id] ?? []).map((item) => item.year)))]
    .filter((year) => year >= viewStart && year <= viewEnd)
    .sort((a, b) => a - b);
  return years.flatMap((year) => {
    const observations = indicatorIds.map((id) => (series[id] ?? []).find((item) => item.year === year));
    return observations.every((item): item is CountryYearObservation => Boolean(item) && typeof item!.normalizedValue === 'number')
      ? [{ year, observations: observations as CountryYearObservation[] }]
      : [];
  });
}

export function getDerivedCompositionRows(
  series: Record<string, CountryYearObservation[]>,
  indicatorIds: string[],
  viewStart = -Infinity,
  viewEnd = Infinity,
): CompositionRow[] {
  return getCompleteCompositionRows(series, indicatorIds, viewStart, viewEnd).flatMap((row) => {
    const population = (series['total-population'] ?? []).find((item) => item.year === row.year);
    const observations = row.observations.map((percentage) => derivePopulationObservation(population, percentage));
    return observations.every((item): item is CountryYearObservation => Boolean(item))
      ? [{ year: row.year, observations: observations as CountryYearObservation[] }]
      : [];
  });
}

function AxisGrid({ minimum, maximum, formatter = (value: number) => formatNumber(value, 1) }: { minimum: number; maximum: number; formatter?: (value: number) => string }) {
  return <>{[minimum, (minimum + maximum) / 2, maximum].map((value, index) => {
    const y = CHART_BOTTOM - (index / 2) * (CHART_BOTTOM - CHART_TOP);
    return <g key={value}><line className="history-grid-line" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y} y2={y} /><text className="history-y-label" x={PLOT_LEFT - 10} y={y + 3} textAnchor="end">{formatter(value)}</text></g>;
  })}</>;
}

export function SocialBand({
  countryCode, series, viewStart, viewEnd, selectedYear, selectedObservationId,
  x, xYear, onSelectYear, onSelect, observationLabel, timeControls, includeDerivedAndEstimates,
}: SocialBandProps & { includeDerivedAndEstimates: boolean }) {
  const [topic, setTopic] = useState<SocialTopic>('population');
  const [povertyMethod, setPovertyMethod] = useState('poverty-national-headcount');
  const [compositionUnit, setCompositionUnit] = useState<CompositionUnit>('population');
  const inView = (id: string) => (series[id] ?? []).filter((item) => item.year >= viewStart && item.year <= viewEnd);
  const coverage = (id: string) => {
    const years = (series[id] ?? []).map((item) => item.year);
    return years.length ? `${Math.min(...years)}–${Math.max(...years)}` : 'sin cobertura';
  };
  const singleSeries: Partial<Record<SocialTopic, string>> = {
    population: 'total-population', education: 'adult-literacy-rate', inequality: 'gini-index',
    'labor-participation': 'labor-force-participation-rate', electricity: 'electricity-access',
  };
  const activeIds = topic === 'age' ? AGE_IDS : topic === 'residence' ? RESIDENCE_IDS : topic === 'employment' ? EMPLOYMENT_IDS : topic === 'poverty' ? [povertyMethod] : [singleSeries[topic]!];
  const topicNames: Record<SocialTopic, string> = {
    population: 'Población total', age: 'Composición etaria', residence: 'Población urbana y rural', poverty: 'Pobreza', education: 'Educación · alfabetización',
    inequality: 'Desigualdad · índice de Gini', 'labor-participation': 'Participación laboral', employment: 'Empleo por actividad', electricity: 'Acceso a electricidad',
  };
  const activeIndicator = indicatorById[activeIds[0]];
  const source = getSource(activeIndicator.sourceIds[0]);
  const isComposition = topic === 'age' || topic === 'residence' || topic === 'employment';
  const isEmployment = topic === 'employment';
  const isDerivedMode = isComposition && !isEmployment && compositionUnit === 'population' && includeDerivedAndEstimates;
  const activeUnit = isDerivedMode ? 'millones de personas · valores derivados' : activeIndicator.unit;

  const yearFromPointer = (event: MouseEvent<SVGPathElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    if (!bounds?.width) return selectedYear;
    const svgX = ((event.clientX - bounds.left) / bounds.width) * HISTORY_WIDTH;
    const pointerYear = Math.floor(viewStart + ((svgX - PLOT_LEFT) / PLOT_WIDTH) * (viewEnd - viewStart + 1));
    return Math.max(viewStart, Math.min(viewEnd, pointerYear));
  };

  const selectFromArea = (event: MouseEvent<SVGPathElement>, rows: CompositionRow[], componentIndex = 0) => {
    const year = yearFromPointer(event);
    const row = rows.find((item) => item.year === year);
    const item = row?.observations[componentIndex];
    if (item) onSelect(item);
  };

  const composition = (ids: string[], group: 'age' | 'residence' | 'employment') => {
    const useDerived = isDerivedMode;
    const rows = useDerived
      ? getDerivedCompositionRows(series, ids, viewStart, viewEnd)
      : getCompleteCompositionRows(series, ids, viewStart, viewEnd);
    if (!rows.length) return <text className="history-empty-label" x={(PLOT_LEFT + PLOT_RIGHT) / 2} y="125" textAnchor="middle">Sin observaciones completas y compatibles en este intervalo.</text>;
    const segments: CompositionRow[][] = [];
    for (const row of rows) {
      const previous = segments.at(-1)?.at(-1);
      if (!previous || row.year !== previous.year + 1) segments.push([row]);
      else segments.at(-1)!.push(row);
    }
    const maximum = !useDerived ? 100 : Math.max(...rows.map((row) => (
      row.observations.reduce((sum, item) => sum + Number(item.normalizedValue), 0)
    ))) * 1.04;
    const y = (value: number) => CHART_BOTTOM - (value / Math.max(1, maximum)) * (CHART_BOTTOM - CHART_TOP);
    return <g clipPath={`url(#${chartClipId(countryCode, 'society')})`} data-composition-group={group} data-composition-mode={useDerived ? 'population' : 'percentage'}>
      {ids.map((id, componentIndex) => <g key={id}>
        {segments.map((segment) => {
          const upper = segment.map((row) => row.observations.slice(0, componentIndex + 1).reduce((sum, item) => sum + Number(item.normalizedValue), 0));
          const lower = segment.map((row) => row.observations.slice(0, componentIndex).reduce((sum, item) => sum + Number(item.normalizedValue), 0));
          const d = [
            ...segment.map((row, index) => `${index ? 'L' : 'M'} ${xYear(row.year)} ${y(upper[index])}`),
            ...segment.map((_, index) => {
              const reverseIndex = segment.length - 1 - index;
              return `L ${xYear(segment[reverseIndex].year)} ${y(lower[reverseIndex])}`;
            }), 'Z',
          ].join(' ');
          const selected = segment.some((row) => row.observations[componentIndex].id === selectedObservationId);
          const valueDescription = useDerived ? 'población derivada' : group === 'employment' ? 'estimación modelada OIT, porcentaje del empleo' : 'porcentaje original';
          const label = `${indicatorById[id].name}, ${valueDescription}, ${segment[0].year}–${segment.at(-1)!.year}. Haz clic en un año o pulsa Enter para abrir la ficha.`;
          return <path
            key={`${id}-${segment[0].year}`}
            className={`composition-area ${group}-${componentIndex} ${selected ? 'selected' : ''}`}
            data-composition-area={id}
            data-value-kind={useDerived ? 'derived' : group === 'employment' ? 'source_estimate' : 'original'}
            data-segment-years={segment.map((row) => row.year).join(',')}
            d={d}
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={(event) => selectFromArea(event, segment, componentIndex)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              const row = segment.find((item) => item.year === selectedYear) ?? segment[0];
              onSelect(row.observations[componentIndex]);
            }}
          ><title>{label}</title></path>;
        })}
      </g>)}
    </g>;
  };

  const activeItems = isComposition ? [] : inView(activeIds[0]);
  const scale = makeHistoryScale(activeItems, CHART_TOP, CHART_BOTTOM, topic !== 'education');
  const lineClass = topic === 'population' ? 'population' : topic === 'education' ? 'literacy' : topic === 'poverty' ? (povertyMethod === 'poverty-national-headcount' ? 'poverty-national' : 'poverty-international') : topic;
  const compositionMaximum = isDerivedMode
    ? Math.max(1, ...getDerivedCompositionRows(series, activeIds, viewStart, viewEnd).map((row) => row.observations.reduce((sum, item) => sum + Number(item.normalizedValue), 0) * 1.04))
    : 100;

  return (
    <section id="band-society" className="history-band" data-band="society" data-view-start={viewStart} data-view-end={viewEnd} data-selected-year={selectedYear}>
      <header className="history-band-header">
        <div><span className="section-kicker">Banda 03</span><h3>Sociedad</h3></div>
        <div className="band-heading-actions">
          <div className="band-selectors">
            <label>Tema social
              <select aria-label="Tema social" value={topic} onChange={(event) => setTopic(event.target.value as SocialTopic)}>
                <option value="population">Población total</option>
                <option value="age">Composición etaria</option>
                <option value="residence">Población urbana y rural</option>
                <option value="poverty">Pobreza</option>
                <option value="education">Educación · alfabetización</option>
                <option value="inequality">Desigualdad · índice de Gini</option>
                <option value="labor-participation">Participación laboral</option>
                <option value="employment">Empleo por actividad</option>
                <option value="electricity">Acceso a electricidad</option>
              </select>
            </label>
            {topic === 'poverty' && <label>Metodología
              <select aria-label="Metodología de pobreza" value={povertyMethod} onChange={(event) => setPovertyMethod(event.target.value)}>
                <option value="poverty-national-headcount">Línea nacional</option>
                <option value="poverty-international-3-2021ppp">USD 3,00 · PPA 2021</option>
              </select>
            </label>}
          </div>
          {timeControls}
        </div>
      </header>
      <div className="history-band-meta">
        <span><strong>{topicNames[topic]}</strong></span>
        <span>Unidad: {activeUnit}</span>
        <span>Cobertura: {coverage(activeIds[0])}</span>
        <span>Fuente: {source?.title}</span>
        <details><summary>Ficha metodológica</summary>{activeIds.map((id) => <div key={id}><p><strong>{indicatorById[id].name}:</strong> {indicatorById[id].definition}</p>{indicatorById[id].methodology?.comparabilityNotes && <p>{indicatorById[id].methodology!.comparabilityNotes}</p>}</div>)}{isDerivedMode && <p>Los valores absolutos son cálculos derivados de la población total y los porcentajes originales compatibles; no son nuevas observaciones.</p>}</details>
      </div>
      <div className="social-context-slot" data-social-context={topic}>
        {isComposition ? <div className="composition-toolbar">
          <div className="composition-legend" aria-label={topic === 'age' ? 'Componentes etarios' : topic === 'residence' ? 'Componentes de residencia' : 'Componentes del empleo'}>
            {topic === 'age' ? <><span className="age-0">0–14 años</span><span className="age-1">15–64 años</span><span className="age-2">65 años o más</span></> : topic === 'residence' ? <><span className="residence-0">Urbana</span><span className="residence-1">Rural</span></> : <><span className="employment-0">Agricultura</span><span className="employment-1">Industria</span><span className="employment-2">Servicios</span></>}
          </div>
          {!isEmployment && includeDerivedAndEstimates && <div className="unit-switch" role="group" aria-label="Unidad de la composición social">
            <button type="button" className={compositionUnit === 'population' ? 'active' : ''} aria-pressed={compositionUnit === 'population'} onClick={() => setCompositionUnit('population')}>Población</button>
            <button type="button" className={compositionUnit === 'percentage' ? 'active' : ''} aria-pressed={compositionUnit === 'percentage'} onClick={() => setCompositionUnit('percentage')}>Porcentaje</button>
          </div>}
        </div> : topic === 'poverty' ? <p className="band-method-note">La metodología nacional y la internacional se consultan por separado; no se empalman ni combinan en una misma serie.</p> : <div className="social-series-context">
          <strong>{topicNames[topic]}</strong>
          <span>{topic === 'population' ? 'Área histórica' : activeItems.some((item) => item.valueOrigin === 'source_estimate') ? 'Estimaciones modeladas de fuente · vacíos conservados' : 'Observaciones aisladas y vacíos conservados'} · Unidad: {activeIndicator.unit} · Cobertura: {coverage(activeIds[0])}</span>
        </div>}
      </div>
      <SharedHistoryChart countryCode={countryCode} band="society" ariaLabel={`${topicNames[topic]} de ${countryCode === 'ARG' ? 'Argentina' : 'Chile'}${isComposition ? `, en ${isDerivedMode ? 'población absoluta derivada' : 'porcentajes originales o estimaciones de fuente identificadas'}` : ''}`} viewStart={viewStart} viewEnd={viewEnd} selectedYear={selectedYear} x={x} xYear={xYear} onSelectYear={onSelectYear}>
        {isComposition ? <>
          <text className="history-axis-title" x={PLOT_LEFT} y="51">{isDerivedMode ? 'Población derivada · millones de personas' : isEmployment ? 'Estimaciones OIT · % del empleo total' : 'Porcentaje original · % de la población total'}</text>
          <AxisGrid minimum={0} maximum={compositionMaximum} formatter={(value) => isDerivedMode ? formatNumber(value, 1) : `${formatNumber(value, 0)}%`} />
          {composition(activeIds, topic)}
        </> : <>
          <text className="history-axis-title" x={PLOT_LEFT} y="51">{activeIndicator.shortName} · {activeIndicator.unit}</text>
          <AxisGrid minimum={scale.minimum} maximum={scale.maximum} />
          {activeItems.length ? <g clipPath={`url(#${chartClipId(countryCode, 'society')})`} data-social-line={activeIds[0]}>
            <ContinuousSeries
              items={activeItems}
              xYear={xYear}
              y={scale.y}
              className={lineClass}
              selectedYear={selectedYear}
              selectedObservationId={selectedObservationId}
              onSelect={onSelect}
              observationLabel={observationLabel}
              areaBaseline={topic === 'population' ? CHART_BOTTOM : undefined}
              hidePoints={topic === 'population'}
              areaInteractive={topic === 'population'}
              areaLabel={`Población total, área histórica. Haz clic en un año o pulsa Enter para abrir la ficha de ${selectedYear}.`}
              onAreaSelect={(event, segment) => {
                const year = yearFromPointer(event);
                const item = segment.find((observation) => observation.year === year);
                if (item) onSelect(item);
              }}
            />
          </g> : <text className="history-empty-label" x={(PLOT_LEFT + PLOT_RIGHT) / 2} y="125" textAnchor="middle">Sin observaciones visibles en este intervalo · cobertura {coverage(activeIds[0])}.</text>}
        </>}
      </SharedHistoryChart>
      <p className="band-footnote">{isDerivedMode ? 'Valores derivados = población total × porcentaje / 100. Solo años compatibles; no se fuerza la suma al total.' : isEmployment ? 'Composición OIT validada con los tres componentes y tolerancia de ±0,2 puntos; las estimaciones de fuente se identifican y pueden ocultarse con el control general.' : 'Vacíos sin interpolación. Las composiciones porcentuales conservan las series originales; las áreas permiten abrir cada ficha.'}</p>
    </section>
  );
}
