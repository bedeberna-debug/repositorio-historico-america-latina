import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleSlash2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { CURRENT_YEAR, START_YEAR } from '../App';
import { countryByCode } from '../data/countries';
import { indicatorById } from '../data/indicators';
import {
  getCountrySeries,
  getCrisisEpisodes,
  getHistoricalEvents,
  getJudicialChanges,
  getLegislativePeriods,
  getObservationCoverage,
  getPresidentialPeriods,
} from '../data/repositories';
import { getSource } from '../data/sources';
import { displayObservation } from '../utils/dataStatus';
import { formatValue } from '../utils/scales';
import type { CountryYearObservation, HistoricalEvent, PresidentialPeriod } from '../types/data';
import type { JudicialChangeNode, LegislativeConfigurationSegment, LegislativePeriod } from '../types/institutions';
import { ProvenanceDetail } from './ProvenanceDetail';
import { SocialBand, SOCIAL_SERIES_IDS, getDerivedCompositionRows } from './SocialBand';
import { EconomyBand } from './EconomyBand';
import { PowersBand } from './PowersBand';
import { EventsBand } from './EventsBand';
import { BandTimeControls } from './BandTimeControls';

const MIN_INTERVAL = 4;
const BASE_SERIES_IDS = ['gdp-per-capita-ppp-2021', 'electoral-democracy', 'general-strikes'] as const;
const CHILE_PHASE05_SERIES_IDS = [
  'gdp-total-constant-2015-usd', 'gdp-growth-annual', 'inflation-cpi-annual', 'unemployment-ilo-modeled',
  'official-exchange-rate', 'lending-interest-rate', 'gdp-agriculture-share', 'gdp-industry-share', 'gdp-services-share',
  'gini-index', 'labor-force-participation-rate', 'employment-agriculture-share', 'employment-industry-share',
  'employment-services-share', 'electricity-access', 'government-expense-share-gdp', 'government-revenue-share-gdp',
  'central-government-debt-share-gdp',
] as const;
const ANNUAL_SERIES_IDS = [...new Set([
  ...BASE_SERIES_IDS,
  ...SOCIAL_SERIES_IDS,
  ...CHILE_PHASE05_SERIES_IDS,
])];
const COMPOSITION_IDS = [
  ['population-age-0-14', 'population-age-15-64', 'population-age-65-plus'],
  ['urban-population-share', 'rural-population-share'],
];

type Selection =
  | { type: 'observation'; id: string }
  | { type: 'period'; id: string }
  | { type: 'legislative'; id: string }
  | { type: 'judicial'; id: string }
  | { type: 'event'; id: string }
  | null;

interface HistoricalExplorerProps {
  countryCode: 'ARG' | 'CHL';
  year: number;
  setYear: (year: number) => void;
  setIndicatorId: (id: string) => void;
  viewStart: number;
  viewEnd: number;
  setViewStart: (year: number) => void;
  setViewEnd: (year: number) => void;
  includeDerivedAndEstimates: boolean;
  setIncludeDerivedAndEstimates: (include: boolean) => void;
}

export function dateToDecimalYear(date: string): number {
  const parsed = new Date(`${date}T00:00:00Z`);
  const year = parsed.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const nextYear = Date.UTC(year + 1, 0, 1);
  return year + (parsed.getTime() - yearStart) / (nextYear - yearStart);
}

export function zoomInterval(start: number, end: number, center: number, direction: 'in' | 'out'): [number, number] {
  const fullSpan = CURRENT_YEAR - START_YEAR + 1;
  const currentSpan = end - start + 1;
  const nextSpan = direction === 'in'
    ? Math.max(MIN_INTERVAL, Math.ceil(currentSpan / 2))
    : Math.min(fullSpan, currentSpan * 2);
  let nextStart = Math.round(center - nextSpan / 2);
  nextStart = Math.max(START_YEAR, Math.min(CURRENT_YEAR - nextSpan + 1, nextStart));
  return [nextStart, nextStart + nextSpan - 1];
}

function verificationLabel(status: 'verified' | 'unverified' | 'in_review') {
  if (status === 'verified') return 'Cotejado contra la fila original';
  if (status === 'in_review') return 'En revisión';
  return 'Importado; no cotejado individualmente';
}

export function HistoricalExplorer({
  countryCode, year, setYear, setIndicatorId,
  viewStart, viewEnd, setViewStart, setViewEnd,
  includeDerivedAndEstimates, setIncludeDerivedAndEstimates,
}: HistoricalExplorerProps) {
  const [selection, setSelection] = useState<Selection>(null);

  const periods = useMemo(() => getPresidentialPeriods(countryCode), [countryCode]);
  const legislativePeriods = useMemo(() => getLegislativePeriods(countryCode), [countryCode]);
  const judicialChanges = useMemo(() => getJudicialChanges(countryCode), [countryCode]);
  const events = useMemo(() => getHistoricalEvents(countryCode), [countryCode]);
  const crises = useMemo(() => getCrisisEpisodes(countryCode), [countryCode]);
  const allSeries = useMemo(() => Object.fromEntries(
    ANNUAL_SERIES_IDS.map((id) => [id, getCountrySeries(countryCode, id)]),
  ) as Record<string, CountryYearObservation[]>, [countryCode]);
  const series = useMemo(() => Object.fromEntries(
    Object.entries(allSeries).map(([id, items]) => [id, includeDerivedAndEstimates ? items : items.filter((item) => item.valueOrigin !== 'source_estimate')]),
  ) as Record<string, CountryYearObservation[]>, [allSeries, includeDerivedAndEstimates]);
  const derivedObservations = useMemo(() => includeDerivedAndEstimates ? COMPOSITION_IDS.flatMap((ids) => (
    getDerivedCompositionRows(series, ids).flatMap((row) => row.observations)
  )) : [], [series, includeDerivedAndEstimates]);

  useEffect(() => { setSelection(null); }, [countryCode]);
  useEffect(() => {
    if (includeDerivedAndEstimates || selection?.type !== 'observation') return;
    const remainsVisible = [...Object.values(series).flat(), ...derivedObservations].some((item) => item.id === selection.id);
    if (!remainsVisible) setSelection(null);
  }, [includeDerivedAndEstimates, selection, series, derivedObservations]);

  const inView = (item: CountryYearObservation) => item.year >= viewStart && item.year <= viewEnd;
  const democracy = series['electoral-democracy'].filter(inView);
  const x = (decimalYear: number) => 180 + ((decimalYear - viewStart) / (viewEnd - viewStart + 1)) * 980;
  const xYear = (value: number) => x(value + 0.5);
  const countryName = countryByCode[countryCode].name;

  const selectedObservation = selection?.type === 'observation'
    ? [...Object.values(series).flat(), ...derivedObservations].find((item) => item.id === selection.id)
    : undefined;
  const selectedPeriod = selection?.type === 'period' ? periods.find((item) => item.id === selection.id) : undefined;
  const selectedLegislative = selection?.type === 'legislative'
    ? legislativePeriods.flatMap((period) => period.segments.map((segment) => ({ period, segment }))).find((item) => item.segment.id === selection.id)
    : undefined;
  const selectedJudicial = selection?.type === 'judicial' ? judicialChanges.find((item) => item.id === selection.id) : undefined;
  const selectedEvent = selection?.type === 'event' ? events.find((item) => item.id === selection.id) : undefined;
  const selectedCrisis = selectedEvent?.kind === 'crisis' ? crises.find((item) => item.id === selectedEvent.sourceRecordId) : undefined;

  const applyDomain = (start: number, end: number) => {
    const safeStart = Math.max(START_YEAR, Math.min(start, CURRENT_YEAR - MIN_INTERVAL + 1));
    const safeEnd = Math.min(CURRENT_YEAR, Math.max(end, safeStart + MIN_INTERVAL - 1));
    setViewStart(safeStart);
    setViewEnd(safeEnd);
    if (year < safeStart || year > safeEnd) setYear(Math.max(safeStart, Math.min(safeEnd, year)));
  };

  const selectYear = (selected: number) => {
    setSelection(null);
    setYear(selected);
  };

  const selectObservation = (item: CountryYearObservation) => {
    setSelection({ type: 'observation', id: item.id });
    setYear(item.year);
    setIndicatorId(item.indicatorId);
  };

  const selectPeriod = (period: PresidentialPeriod) => {
    setSelection({ type: 'period', id: period.id });
    setYear(Number(period.startDate.slice(0, 4)));
  };

  const selectLegislative = (_period: LegislativePeriod, segment: LegislativeConfigurationSegment) => {
    setSelection({ type: 'legislative', id: segment.id });
    setYear(Number(segment.startDate.slice(0, 4)));
    setIndicatorId('presidential-periods');
  };

  const selectJudicial = (change: JudicialChangeNode) => {
    setSelection({ type: 'judicial', id: change.id });
    setYear(Number(change.date.slice(0, 4)));
    setIndicatorId('presidential-periods');
  };

  const selectEvent = (event: HistoricalEvent) => {
    setSelection({ type: 'event', id: event.id });
    setYear(event.year);
    setIndicatorId(event.kind === 'general_strike' ? 'general-strikes' : event.kind === 'crisis' ? 'presidential-crises' : 'presidential-periods');
  };

  const pan = (direction: -1 | 1) => {
    const span = viewEnd - viewStart + 1;
    const offset = Math.max(1, Math.round(span * 0.25)) * direction;
    const start = Math.max(START_YEAR, Math.min(CURRENT_YEAR - span + 1, viewStart + offset));
    applyDomain(start, start + span - 1);
  };

  const zoom = (direction: 'in' | 'out') => {
    const [start, end] = zoomInterval(viewStart, viewEnd, year, direction);
    applyDomain(start, end);
  };

  const timeControls = (bandName: string) => <BandTimeControls
    bandName={bandName}
    onZoom={zoom}
    onPan={pan}
    canZoomIn={viewEnd - viewStart + 1 > MIN_INTERVAL}
    canZoomOut={viewStart !== START_YEAR || viewEnd !== CURRENT_YEAR}
    canPanBack={viewStart !== START_YEAR}
    canPanForward={viewEnd !== CURRENT_YEAR}
  />;

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectYear(Math.max(START_YEAR, Math.min(CURRENT_YEAR, year + (event.key === 'ArrowLeft' ? -1 : 1))));
    }
  };

  const renderObservationLabel = (item: CountryYearObservation) => {
    const display = displayObservation(item);
    const value = display.status === 'available' ? formatValue(item) : display.label;
    const source = getSource(item.provenance.sourceId)?.title ?? 'Registro de prueba aislado';
    const origin = item.derivation ? ' Valor derivado, no observación original.' : item.valueOrigin === 'source_estimate' ? ' Estimación modelada identificada por la fuente.' : '';
    return `${countryName}, ${item.year}: ${value} ${item.provenance.unit}.${origin} Fuente: ${source}`;
  };

  return (
    <section
      className="historical-explorer"
      aria-labelledby="historical-explorer-title"
      data-view-start={viewStart}
      data-view-end={viewEnd}
      data-selected-year={year}
    >
      <header className="explorer-header">
        <div>
          <span className="section-kicker">Lectura histórica integrada</span>
          <h2 id="historical-explorer-title">Un eje temporal, cuatro bandas</h2>
          <p>Cambia el tema dentro de cada banda sin perder el año ni el intervalo. Las coincidencias temporales no implican causalidad.</p>
        </div>
        <div className="explorer-domain" aria-label="Intervalo visible"><span>Intervalo visible</span><strong>{viewStart}—{viewEnd}</strong></div>
      </header>

      <div className="explorer-toolbar" aria-label="Controles del explorador histórico">
        <div className="explorer-zoom-controls">
          <button className="icon-text-button" onClick={() => zoom('in')} disabled={viewEnd - viewStart + 1 <= MIN_INTERVAL} aria-label="Acercar intervalo"><ZoomIn size={16} /> Acercar</button>
          <button className="icon-text-button" onClick={() => zoom('out')} disabled={viewStart === START_YEAR && viewEnd === CURRENT_YEAR} aria-label="Alejar intervalo"><ZoomOut size={16} /> Alejar</button>
          <button className="icon-text-button" onClick={() => pan(-1)} disabled={viewStart === START_YEAR} aria-label="Desplazar hacia atrás"><ChevronLeft size={16} /> Anterior</button>
          <button className="icon-text-button" onClick={() => pan(1)} disabled={viewEnd === CURRENT_YEAR} aria-label="Desplazar hacia adelante">Siguiente <ChevronRight size={16} /></button>
          <button className="icon-text-button" onClick={() => applyDomain(START_YEAR, CURRENT_YEAR)} aria-label="Restablecer vista completa"><RotateCcw size={15} /> Restablecer</button>
        </div>
        <div className="interval-inputs">
          <label>Inicio<input aria-label="Inicio del intervalo" type="number" min={START_YEAR} max={viewEnd - MIN_INTERVAL + 1} value={viewStart} onChange={(event) => applyDomain(Number(event.target.value), viewEnd)} /></label>
          <label>Fin<input aria-label="Fin del intervalo" type="number" min={viewStart + MIN_INTERVAL - 1} max={CURRENT_YEAR} value={viewEnd} onChange={(event) => applyDomain(viewStart, Number(event.target.value))} /></label>
        </div>
        <label className="explorer-year-control">Año seleccionado
          <input id="country-year" aria-label="Año seleccionado" type="range" min={START_YEAR} max={CURRENT_YEAR} value={year} onChange={(event) => selectYear(Number(event.target.value))} style={{ '--range-progress': `${((year - START_YEAR) / (CURRENT_YEAR - START_YEAR)) * 100}%` } as React.CSSProperties} />
          <output htmlFor="country-year">{year}</output>
        </label>
      </div>
      <div className="explorer-data-filter">
        <label><input type="checkbox" checked={includeDerivedAndEstimates} onChange={(event) => setIncludeDerivedAndEstimates(event.target.checked)} /> Incluir derivados y estimaciones de fuente</label>
        <span>Las observaciones directas permanecen visibles al desactivarlo; ningún filtro modifica los registros canónicos.</span>
      </div>

      <p className="canvas-instruction" id="canvas-instruction">Selecciona un área, línea, bloque o acontecimiento para abrir su ficha. Con el foco en el explorador, usa las flechas izquierda y derecha para cambiar el año.</p>
      <div className="history-bands" role="region" aria-label={`Lienzo histórico de ${countryName}`} aria-describedby="canvas-instruction" tabIndex={0} onKeyDown={handleCanvasKeyDown}>
        <PowersBand countryCode={countryCode} periods={periods} legislativePeriods={legislativePeriods} judicialChanges={judicialChanges} democracy={democracy} viewStart={viewStart} viewEnd={viewEnd} selectedYear={year} selectedPeriodId={selectedPeriod?.id} selectedLegislativeSegmentId={selectedLegislative?.segment.id} selectedJudicialChangeId={selectedJudicial?.id} selectedObservationId={selectedObservation?.id} x={x} xYear={xYear} dateToDecimalYear={dateToDecimalYear} currentYear={CURRENT_YEAR} onSelectYear={selectYear} onSelectPeriod={selectPeriod} onSelectLegislative={selectLegislative} onSelectJudicial={selectJudicial} onSelectObservation={selectObservation} observationLabel={renderObservationLabel} timeControls={timeControls('Poderes del Estado')} />
        <EconomyBand countryCode={countryCode} series={series} viewStart={viewStart} viewEnd={viewEnd} selectedYear={year} selectedObservationId={selectedObservation?.id} x={x} xYear={xYear} onSelectYear={selectYear} onSelect={selectObservation} observationLabel={renderObservationLabel} timeControls={timeControls('Economía')} />
        <SocialBand countryCode={countryCode} series={series} viewStart={viewStart} viewEnd={viewEnd} selectedYear={year} selectedObservationId={selectedObservation?.id} x={x} xYear={xYear} onSelectYear={selectYear} onSelect={selectObservation} observationLabel={renderObservationLabel} timeControls={timeControls('Sociedad')} includeDerivedAndEstimates={includeDerivedAndEstimates} />
        <EventsBand countryCode={countryCode} events={events} viewStart={viewStart} viewEnd={viewEnd} selectedYear={year} selectedEventId={selectedEvent?.id} x={x} xYear={xYear} dateToDecimalYear={dateToDecimalYear} onSelectYear={selectYear} onSelectEvent={selectEvent} timeControls={timeControls('Acontecimientos')} />
      </div>

      <div className="explorer-reading-area">
        <section className="explorer-record-detail" aria-live="polite" aria-label="Ficha del registro seleccionado">
          {!selectedObservation && !selectedPeriod && !selectedLegislative && !selectedJudicial && !selectedEvent && <div className="selection-empty"><CircleSlash2 size={20} /><div><strong>Selecciona un registro para abrir su ficha</strong><p>El detalle incluye fecha o agregación anual, valor cuando corresponde, unidad, fuente, transformación y estado de verificación.</p></div></div>}
          {selectedObservation && <div>
            <span className="section-kicker">{selectedObservation.derivation ? 'Valor derivado · cálculo de presentación' : selectedObservation.valueOrigin === 'source_estimate' ? 'Estimación de fuente · no observación directa' : `Observación · ${indicatorById[selectedObservation.indicatorId].theme}`}</span>
            {indicatorById[selectedObservation.indicatorId].methodology?.lineType && <div className="poverty-method-note">
              <strong>{indicatorById[selectedObservation.indicatorId].methodology!.lineType === 'national' ? 'Línea nacional de pobreza' : 'Línea internacional: USD 3,00 por persona y día · PPA 2021'}</strong>
              <p>Medida: incidencia (% de la población). Fuente: {getSource(selectedObservation.provenance.sourceId)?.title}.</p>
              <p>{indicatorById[selectedObservation.indicatorId].methodology!.lineType === 'national' ? 'WDI no documenta un valor monetario único para esta línea nacional; no se infiere.' : 'Valor de línea: 3,00 · unidad monetaria: USD por persona y día, PPA · año de referencia: 2021.'}</p>
              <p>{indicatorById[selectedObservation.indicatorId].methodology!.comparabilityNotes}</p>
            </div>}
            <h3>{selectedObservation.year} · {selectedObservation.valueStatus === 'zero_events' ? '0 eventos registrados' : formatValue(selectedObservation)}</h3>
            <p><strong>{indicatorById[selectedObservation.indicatorId].name}</strong> · {selectedObservation.provenance.unit}</p>
            <p>{getSource(selectedObservation.provenance.sourceId)?.title} · {selectedObservation.derivation ? 'Cálculo derivado; no equivale a una observación original ni a verificación independiente' : verificationLabel(selectedObservation.provenance.verificationStatus)}.</p>
            {selectedObservation.derivation && <div className="derived-record-note" data-derived-record>
              <strong>Valor derivado, no observación original</strong>
              <p><strong>Fórmula:</strong> {selectedObservation.derivation.formula}.</p>
              <dl className="record-metadata">
                <div><dt>Población total original</dt><dd>{formatValue(selectedObservation.derivation.population)} {selectedObservation.derivation.population.provenance.unit} · {selectedObservation.derivation.population.provenance.datasetVersionId}</dd></div>
                <div><dt>Porcentaje original</dt><dd>{formatValue(selectedObservation.derivation.percentage)} {selectedObservation.derivation.percentage.provenance.unit} · {selectedObservation.derivation.percentage.provenance.datasetVersionId}</dd></div>
                <div><dt>Compatibilidad</dt><dd>Mismo país, año, nivel territorial, fuente y fecha de acceso {selectedObservation.derivation.population.provenance.accessDate}.</dd></div>
              </dl>
              <p>Las fuentes y versiones de ambos registros se conservan a continuación. No se ajustan los componentes para forzar su suma al total.</p>
              <ProvenanceDetail provenance={selectedObservation.derivation.population.provenance} />
              <ProvenanceDetail provenance={selectedObservation.derivation.percentage.provenance} />
            </div>}
            <dl className="record-metadata"><div><dt>Variante metodológica</dt><dd>{indicatorById[selectedObservation.indicatorId].variant}</dd></div><div><dt>Origen y frecuencia</dt><dd>{selectedObservation.derivation ? 'Derivado en la vista' : selectedObservation.valueOrigin === 'source_estimate' ? 'Estimación modelada de fuente' : 'Observación de fuente'} · {selectedObservation.originalFrequency === 'annual' ? 'frecuencia anual original' : 'frecuencia según archivo original'}</dd></div><div><dt>Cobertura efectiva</dt><dd>{selectedObservation.provenance.coverage.startYear}–{selectedObservation.provenance.coverage.endYear} · nivel nacional</dd></div></dl>
            {!selectedObservation.derivation && <ProvenanceDetail provenance={selectedObservation.provenance} />}
          </div>}
          {selectedPeriod && <div>
            <span className="section-kicker">Período presidencial</span><h3>{selectedPeriod.presidentName}</h3>
            <p><strong>{selectedPeriod.startDate} → {selectedPeriod.endDate ?? 'sin fecha de término'} · {selectedPeriod.durationDays} días</strong></p>
            <dl className="record-metadata"><div><dt>Interrupción</dt><dd>{selectedPeriod.interruptionStatus === 'interrupted' ? 'Sí; interrupción documentada' : selectedPeriod.interruptionStatus === 'completed' ? 'No; período completo según la fuente' : 'No determinada'}</dd></div><div><dt>Tipo institucional</dt><dd>{selectedPeriod.periodType ?? 'Registro de administración del curso'}</dd></div><div><dt>Partido</dt><dd>{selectedPeriod.party ?? 'Sin dato cargado; sin clasificación política inferida'}</dd></div><div><dt>Coalición</dt><dd>{selectedPeriod.coalition ?? 'Sin dato cargado; sin clasificación política inferida'}</dd></div></dl>
            {selectedPeriod.institutionalNote && <p>{selectedPeriod.institutionalNote}</p>}
            <ProvenanceDetail provenance={selectedPeriod.provenance} />
          </div>}
          {selectedLegislative && <div>
            <span className="section-kicker">Poder Legislativo · segmento con fechas propias</span><h3>{selectedLegislative.period.chamber === 'upper' ? 'Cámara alta · Senado' : 'Cámara baja · Diputados'}</h3>
            <p><strong>{selectedLegislative.segment.startDate} → {selectedLegislative.segment.endDate ?? 'sin fecha de término'}</strong></p>
            <dl className="record-metadata"><div><dt>Relación con el Ejecutivo</dt><dd>{selectedLegislative.segment.relation === 'unknown' ? 'Composición desconocida; no se infiere mayoría' : selectedLegislative.segment.relation === 'congress_absent_or_dissolved' ? 'Congreso ausente o disuelto' : selectedLegislative.segment.relation}</dd></div><div><dt>Mandato y renovación</dt><dd>{selectedLegislative.period.termYears ? `${selectedLegislative.period.termYears} años` : 'No aplicable'} · {selectedLegislative.period.renewal === 'partial' ? 'renovación parcial' : selectedLegislative.period.renewal === 'full' ? 'renovación completa' : 'no aplicable'}</dd></div><div><dt>Criterio y medición</dt><dd>{selectedLegislative.segment.majorityCriterion ?? 'Sin criterio de mayoría cargado'} · {selectedLegislative.segment.measuredAt ?? 'sin fecha de medición'}</dd></div></dl>
            <ProvenanceDetail provenance={selectedLegislative.segment.provenance} />
          </div>}
          {selectedJudicial && <div>
            <span className="section-kicker">Poder Judicial · cambio puntual</span><h3>{selectedJudicial.institutionName}</h3>
            <p><strong>{selectedJudicial.date}</strong> · {selectedJudicial.changeType}</p><p>{selectedJudicial.description}</p>
            <p>Este nodo no implica una renovación completa de la corte ni persistencia posterior no documentada.</p>
            <ProvenanceDetail provenance={selectedJudicial.provenance} />
          </div>}
          {selectedEvent?.temporalType === 'annual_aggregate' && <div>
            <span className="section-kicker">Acontecimiento · agregado anual</span><h3>{selectedEvent.year} · {selectedEvent.count ?? 0} huelgas generales registradas</h3>
            <p>Conteo anual conservado sin fechas individuales. El nodo se ubica en el centro gráfico del año solo como convención visual; no representa una fecha exacta ni distribuye el total por meses.</p>
            <dl className="record-metadata"><div><dt>Modelo temporal</dt><dd>Agregado anual sin fechas individuales</dd></div><div><dt>Unidad</dt><dd>{selectedEvent.provenance.unit}</dd></div></dl>
            <ProvenanceDetail provenance={selectedEvent.provenance} />
          </div>}
          {selectedEvent && selectedCrisis && <div>
            <span className="section-kicker">Acontecimiento · crisis {selectedEvent.eventType}</span><h3>{selectedEvent.startDate} → {selectedEvent.endDate ?? 'sin término'}</h3>
            <p>{selectedEvent.description}</p>
            <dl className="record-metadata"><div><dt>Duración y fecha pivote</dt><dd>{selectedCrisis.durationDays} días · {selectedCrisis.peakDate ?? 'sin dato'} · confianza {selectedEvent.confidence ?? 'sin dato'}</dd></div><div><dt>Actores</dt><dd>{selectedEvent.actors.join(' · ')}</dd></div><div><dt>Gobierno asociado</dt><dd>Sin vínculo documental cargado; no se infiere por proximidad temporal</dd></div><div><dt>Relaciones</dt><dd>Sin relaciones con otros acontecimientos cargadas</dd></div></dl>
            <ProvenanceDetail provenance={selectedEvent.provenance} />
          </div>}
          {selectedEvent && selectedEvent.temporalType !== 'annual_aggregate' && !selectedCrisis && <div>
            <span className="section-kicker">Acontecimiento documental · {selectedEvent.eventType}</span><h3>{selectedEvent.name ?? selectedEvent.eventType}</h3>
            <p><strong>{selectedEvent.startDate} → {selectedEvent.endDate ?? 'sin término'}</strong></p><p>{selectedEvent.description}</p>
            <dl className="record-metadata"><div><dt>Precisión temporal</dt><dd>{selectedEvent.temporalType === 'exact' ? 'Fecha exacta documentada' : 'Intervalo documentado'}</dd></div><div><dt>Verificación</dt><dd>{verificationLabel(selectedEvent.provenance.verificationStatus)}</dd></div><div><dt>Gobierno asociado</dt><dd>{selectedEvent.governmentId ?? 'Sin vínculo documental cargado; no se infiere por proximidad temporal'}</dd></div><div><dt>Motivo de inclusión</dt><dd>{selectedEvent.inclusionReason ?? 'Registro documental incluido en la vista general'}</dd></div><div><dt>Incertidumbre</dt><dd>{selectedEvent.uncertaintyNotes ?? 'Sin nota adicional; la cobertura no es exhaustiva'}</dd></div></dl>
            <ProvenanceDetail provenance={selectedEvent.provenance} />
          </div>}
        </section>

        <aside className="selected-year-summary" aria-label={`Valores disponibles para ${year}`}>
          <span className="section-kicker">Lectura no exclusivamente visual</span><h3>{year}</h3><p>Valores del año seleccionado; cada indicador conserva su propia cobertura.</p>
          <dl>{ANNUAL_SERIES_IDS.map((id) => {
            const observation = series[id]?.find((item) => item.year === year);
            const display = displayObservation(observation, getObservationCoverage(countryCode, id), year);
            return <div key={id}><dt>{indicatorById[id].shortName}</dt><dd>{observation && observation.valueStatus !== 'zero_events' ? formatValue(observation) : display.label}</dd></div>;
          })}</dl>
        </aside>
      </div>

      <div className="history-accessible-records">
        <details><summary>Consultar valores, unidades y fuentes del año {year} en formato tabular <span>+</span></summary><div className="table-wrap"><table><caption className="sr-only">Observaciones de {countryName} para {year}</caption><thead><tr><th>Indicador y variante</th><th>Valor y estado</th><th>Unidad</th><th>Fuente</th><th>Verificación</th></tr></thead><tbody>{ANNUAL_SERIES_IDS.map((id) => {
          const observation = series[id]?.find((item) => item.year === year);
          const display = displayObservation(observation, getObservationCoverage(countryCode, id), year);
          const provenance = observation?.provenance;
          const source = getSource(provenance?.sourceId ?? indicatorById[id].sourceIds[0]);
          return <tr key={id}><td><strong>{indicatorById[id].name}</strong><small>{indicatorById[id].theme} · {indicatorById[id].variant}</small></td><td><strong>{observation && observation.valueStatus !== 'zero_events' ? formatValue(observation) : display.label}</strong><small>{display.detail}</small></td><td>{provenance?.unit ?? indicatorById[id].unit}</td><td>{source?.title ?? 'Pendiente'}</td><td>{provenance ? verificationLabel(provenance.verificationStatus) : 'Sin observación para verificar'}</td></tr>;
        })}</tbody></table></div></details>
        <details><summary>Listado accesible de gobiernos, poderes y acontecimientos <span>+</span></summary><div className="record-list-grid">
          <div><h3>Períodos presidenciales</h3>{periods.map((period) => <button key={period.id} onClick={() => selectPeriod(period)}><strong>{period.presidentName}</strong><span>{period.startDate} → {period.endDate ?? 'sin término'} · {period.durationDays} días</span></button>)}</div>
          <div><h3>Segmentos legislativos</h3>{legislativePeriods.flatMap((period) => period.segments.map((segment) => <button key={segment.id} onClick={() => selectLegislative(period, segment)}><strong>{period.chamber === 'upper' ? 'Cámara alta' : 'Cámara baja'} · {segment.relation === 'unknown' ? 'composición desconocida' : 'Congreso ausente o disuelto'}</strong><span>{segment.startDate} → {segment.endDate ?? 'sin término'}</span></button>))}{!legislativePeriods.length && <p>Sin registros legislativos cargados para este país.</p>}</div>
          <div><h3>Cambios judiciales</h3>{judicialChanges.map((change) => <button key={change.id} onClick={() => selectJudicial(change)}><strong>{change.institutionName}</strong><span>{change.date} · {change.description}</span></button>)}{!judicialChanges.length && <p>Sin cambios judiciales cargados para este país.</p>}</div>
          <div><h3>Acontecimientos</h3>{events.filter((event) => event.temporalType !== 'annual_aggregate' || Number(event.count) > 0).map((event) => <button key={event.id} onClick={() => selectEvent(event)}><strong>{event.temporalType === 'annual_aggregate' ? `${event.year} · ${event.count ?? 0} huelgas generales` : `${event.name ?? event.eventType} · ${event.startDate}`}</strong><span>{event.temporalType === 'annual_aggregate' ? 'Agregado anual sin fechas individuales' : `${event.startDate} → ${event.endDate ?? 'sin término'}${event.kind === 'crisis' ? ` · ${crises.find((crisis) => crisis.id === event.sourceRecordId)?.durationDays} días` : ' · registro documental'}`}</span></button>)}<p>La ausencia de un episodio no significa que no haya ocurrido. Los agregados anuales no contienen fechas individuales y los años con cero no generan nodos.</p></div>
        </div></details>
      </div>
      <footer className="explorer-footer">Visualización → observación o acontecimiento → transformación → dataset y versión → variable original → fuente. Los valores absolutos de composición son cálculos derivados identificados. Sin interpolación ni relaciones causales automáticas.</footer>
    </section>
  );
}
