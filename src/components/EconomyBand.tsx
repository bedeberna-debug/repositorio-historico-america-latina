import { useState } from 'react';
import type { ReactNode } from 'react';
import { indicatorById } from '../data/indicators';
import { getSource } from '../data/sources';
import { formatNumber } from '../utils/scales';
import type { CountryYearObservation } from '../types/data';
import { ContinuousSeries } from './ContinuousSeries';
import {
  CHART_BOTTOM, CHART_TOP, PLOT_LEFT, PLOT_RIGHT,
  SharedHistoryChart, chartClipId, makeHistoryScale,
} from './HistoryChart';

const GDP_ID = 'gdp-per-capita-ppp-2021';
const GDP_TOTAL_ID = 'gdp-total-constant-2015-usd';
const GDP_COMPOSITION_IDS = ['gdp-agriculture-share', 'gdp-industry-share', 'gdp-services-share'];
type EconomyTopic = 'gdp-per-capita' | 'gdp-total' | 'gdp-composition' | 'historical-lines';

interface EconomyBandProps {
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

interface EconomicLinesChartProps {
  primary: CountryYearObservation[];
  secondary?: CountryYearObservation[];
  selectedYear: number;
  selectedObservationId?: string;
  xYear: (year: number) => number;
  onSelect: (item: CountryYearObservation) => void;
  observationLabel: (item: CountryYearObservation) => string;
  clipId?: string;
}

function AxisTicks({ minimum, maximum, side, unit }: { minimum: number; maximum: number; side: 'left' | 'right'; unit: string }) {
  const axisX = side === 'left' ? PLOT_LEFT : PLOT_RIGHT;
  return <>{[minimum, (minimum + maximum) / 2, maximum].map((value, index) => {
    const y = CHART_BOTTOM - (index / 2) * (CHART_BOTTOM - CHART_TOP);
    return <g key={value} className={`economic-axis economic-axis-${side}`} data-axis-side={side} data-axis-unit={unit}>
      {side === 'left' && <line className="history-grid-line" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y} y2={y} />}
      <line className="economic-axis-tick-mark" x1={side === 'left' ? axisX - 5 : axisX} x2={side === 'left' ? axisX : axisX + 5} y1={y} y2={y} />
      <text data-axis-value={value} x={side === 'left' ? PLOT_LEFT - 10 : PLOT_RIGHT + 10} y={y + 3} textAnchor={side === 'left' ? 'end' : 'start'}>{formatNumber(value, 1)}</text>
    </g>;
  })}</>;
}

export function EconomicLinesChart({
  primary, secondary, selectedYear, selectedObservationId, xYear, onSelect, observationLabel, clipId,
}: EconomicLinesChartProps) {
  const leftScale = makeHistoryScale(primary);
  const rightScale = secondary?.length ? makeHistoryScale(secondary) : undefined;
  const primaryId = primary[0]?.indicatorId ?? GDP_ID;
  const secondaryId = secondary?.[0]?.indicatorId;
  const primaryUnit = primary[0]?.provenance.unit ?? 'unidad de prueba';
  const secondaryUnit = secondary?.[0]?.provenance.unit ?? 'unidad de prueba';
  return <>
    <g data-economic-axes>
      <text className="economic-axis-title primary" data-axis-title="left" x={PLOT_LEFT} y="51">
        {indicatorById[primaryId]?.shortName ?? 'Serie de prueba aislada'} · {primaryUnit}
      </text>
      <AxisTicks minimum={leftScale.minimum} maximum={leftScale.maximum} side="left" unit={primaryUnit} />
      {secondary && rightScale && <>
        <text className="economic-axis-title secondary" data-axis-title="right" x={PLOT_RIGHT} y="51" textAnchor="end">
          {indicatorById[secondaryId ?? '']?.shortName ?? 'Serie de prueba aislada'} · {secondaryUnit}
        </text>
        <AxisTicks minimum={rightScale.minimum} maximum={rightScale.maximum} side="right" unit={secondaryUnit} />
      </>}
    </g>
    <g clipPath={clipId ? `url(#${clipId})` : undefined} data-economic-plot>
      {primary.length > 0 && <ContinuousSeries items={primary} xYear={xYear} y={leftScale.y} className="economic-primary" selectedYear={selectedYear} selectedObservationId={selectedObservationId} onSelect={onSelect} observationLabel={observationLabel} />}
      {secondary && rightScale && <ContinuousSeries items={secondary} xYear={xYear} y={rightScale.y} className="economic-secondary" selectedYear={selectedYear} selectedObservationId={selectedObservationId} onSelect={onSelect} observationLabel={observationLabel} />}
    </g>
  </>;
}

export function EconomyBand({
  countryCode, series, viewStart, viewEnd, selectedYear, selectedObservationId,
  x, xYear, onSelectYear, onSelect, observationLabel, timeControls,
}: EconomyBandProps) {
  const [topic, setTopic] = useState<EconomyTopic>('gdp-per-capita');
  const [primaryId, setPrimaryId] = useState(GDP_ID);
  const [secondaryId, setSecondaryId] = useState('');
  const loadedEconomicIds = Object.keys(series).filter((id) => indicatorById[id]?.domain === 'economy' && (series[id] ?? []).some((item) => typeof item.normalizedValue === 'number'));
  const activePrimaryId = loadedEconomicIds.includes(primaryId) ? primaryId : GDP_ID;
  const activeSecondaryId = loadedEconomicIds.includes(secondaryId) && secondaryId !== activePrimaryId ? secondaryId : '';
  const activeId = topic === 'gdp-total' ? GDP_TOTAL_ID : topic === 'gdp-composition' ? GDP_COMPOSITION_IDS[0] : topic === 'historical-lines' ? activePrimaryId : GDP_ID;
  const activeIds = topic === 'gdp-composition' ? GDP_COMPOSITION_IDS : [activeId];
  const inView = (id: string) => (series[id] ?? []).filter((item) => item.year >= viewStart && item.year <= viewEnd);
  const primary = inView(activeId);
  const secondary = activeSecondaryId ? inView(activeSecondaryId) : undefined;
  const compositionItems = GDP_COMPOSITION_IDS.flatMap(inView);
  const compositionScale = makeHistoryScale(compositionItems);
  const years = activeIds.flatMap((id) => (series[id] ?? []).map((item) => item.year));
  const coverage = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : 'sin cobertura';
  const activeIndicator = indicatorById[activeId];
  const source = getSource(activeIndicator.sourceIds[0]);
  const topicNames: Record<EconomyTopic, string> = {
    'gdp-per-capita': 'PIB per cápita',
    'gdp-total': 'PIB total real',
    'gdp-composition': 'Composición del PIB por actividad',
    'historical-lines': 'Líneas históricas',
  };
  const hasVisibleData = topic === 'gdp-composition' ? compositionItems.length > 0 : primary.length > 0;

  return (
    <section id="band-economy" className="history-band" data-band="economy" data-view-start={viewStart} data-view-end={viewEnd} data-selected-year={selectedYear}>
      <header className="history-band-header">
        <div><span className="section-kicker">Banda 02</span><h3>Economía</h3></div>
        <div className="band-heading-actions">
          <label>Tema económico
            <select aria-label="Tema económico" value={topic} onChange={(event) => setTopic(event.target.value as EconomyTopic)}>
              <option value="gdp-per-capita">PIB per cápita</option>
              <option value="gdp-total">PIB total real</option>
              <option value="gdp-composition">Composición del PIB por actividad</option>
              <option value="historical-lines">Líneas históricas</option>
            </select>
          </label>
          {timeControls}
        </div>
      </header>
      <div className="history-band-meta">
        <span><strong>{topicNames[topic]}</strong></span>
        <span>Unidad: {topic === 'gdp-composition' ? '% del PIB' : activeIndicator.unit}</span>
        <span>Cobertura: {coverage}</span>
        <span>Fuente: {source?.title ?? 'Sin observaciones cargadas para este país'}</span>
        <details><summary>Ficha metodológica</summary>{activeIds.map((id) => <p key={id}><strong>{indicatorById[id].name}:</strong> {indicatorById[id].definition}</p>)}{topic === 'gdp-composition' && <p>Las tres líneas comparten unidad y escala. No constituyen una descomposición exhaustiva del PIB ni se ajustan para sumar 100.</p>}</details>
      </div>
      {topic === 'historical-lines' && <div className="economic-line-controls">
        <label>Serie principal
          <select aria-label="Serie económica principal" value={activePrimaryId} onChange={(event) => { setPrimaryId(event.target.value); if (secondaryId === event.target.value) setSecondaryId(''); }}>
            {loadedEconomicIds.map((id) => <option key={id} value={id}>{indicatorById[id].shortName}</option>)}
          </select>
        </label>
        <label>Segunda serie
          <select aria-label="Segunda serie económica" value={activeSecondaryId} onChange={(event) => setSecondaryId(event.target.value)}>
            <option value="">Sin segunda serie</option>
            {loadedEconomicIds.filter((id) => id !== activePrimaryId).map((id) => <option key={id} value={id}>{indicatorById[id].shortName}</option>)}
          </select>
        </label>
        {loadedEconomicIds.length < 2 && <p>La superposición requiere una segunda serie económica cargada para este país.</p>}
      </div>}
      <SharedHistoryChart countryCode={countryCode} band="economy" ariaLabel={`${topicNames[topic]} de ${countryCode === 'ARG' ? 'Argentina' : 'Chile'}`} viewStart={viewStart} viewEnd={viewEnd} selectedYear={selectedYear} x={x} xYear={xYear} onSelectYear={onSelectYear}>
        {!hasVisibleData ? <text className="history-empty-label" x={(PLOT_LEFT + PLOT_RIGHT) / 2} y="125" textAnchor="middle">
          <tspan x={(PLOT_LEFT + PLOT_RIGHT) / 2}>Sin observaciones cargadas para este país o intervalo.</tspan>
          <tspan x={(PLOT_LEFT + PLOT_RIGHT) / 2} dy="22">La ausencia no se reemplaza por cifras estimadas ni interpoladas.</tspan>
        </text> : topic === 'historical-lines' ? <g data-economic-lines data-series-count={secondary?.length ? 2 : 1}>
          <EconomicLinesChart primary={primary} secondary={secondary} selectedYear={selectedYear} selectedObservationId={selectedObservationId} xYear={xYear} onSelect={onSelect} observationLabel={observationLabel} clipId={chartClipId(countryCode, 'economy')} />
        </g> : topic === 'gdp-composition' ? <g data-gdp-composition data-series-count={GDP_COMPOSITION_IDS.length}>
          <g data-economic-axes>
            <text className="economic-axis-title primary" data-axis-title="left" x={PLOT_LEFT} y="51">Componentes por actividad · % del PIB</text>
            <AxisTicks minimum={compositionScale.minimum} maximum={compositionScale.maximum} side="left" unit="% del PIB" />
          </g>
          <g clipPath={`url(#${chartClipId(countryCode, 'economy')})`} data-economic-plot>
            {GDP_COMPOSITION_IDS.map((id, index) => <ContinuousSeries key={id} items={inView(id)} xYear={xYear} y={compositionScale.y} className={`economic-composition economic-composition-${index}`} selectedYear={selectedYear} selectedObservationId={selectedObservationId} onSelect={onSelect} observationLabel={observationLabel} />)}
          </g>
        </g> : <g data-economic-single>
          <EconomicLinesChart primary={primary} selectedYear={selectedYear} selectedObservationId={selectedObservationId} xYear={xYear} onSelect={onSelect} observationLabel={observationLabel} clipId={chartClipId(countryCode, 'economy')} />
        </g>}
      </SharedHistoryChart>
      {topic === 'historical-lines' && <p className="dual-axis-warning" role="note">Los ejes tienen escalas independientes; la proximidad visual de las líneas no implica magnitudes equivalentes ni causalidad.</p>}
      {topic === 'gdp-composition' && <p className="band-footnote">Agricultura, industria y servicios se muestran como líneas independientes; otros componentes y discrepancias estadísticas no se imputan.</p>}
    </section>
  );
}
