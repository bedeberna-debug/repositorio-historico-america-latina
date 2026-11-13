import type { ReactNode } from 'react';
import { countryByCode } from '../data/countries';
import { indicatorById } from '../data/indicators';
import { getSource } from '../data/sources';
import type { CountryYearObservation, PresidentialPeriod } from '../types/data';
import type { JudicialChangeNode, LegislativeConfigurationSegment, LegislativePeriod, LegislativeRelation } from '../types/institutions';
import { ContinuousSeries } from './ContinuousSeries';
import {
  CHART_BOTTOM, CHART_TOP, PLOT_LEFT, PLOT_RIGHT,
  SharedHistoryChart, chartClipId,
} from './HistoryChart';

interface PowersBandProps {
  countryCode: 'ARG' | 'CHL';
  periods: PresidentialPeriod[];
  legislativePeriods: LegislativePeriod[];
  judicialChanges: JudicialChangeNode[];
  democracy: CountryYearObservation[];
  viewStart: number;
  viewEnd: number;
  selectedYear: number;
  selectedPeriodId?: string;
  selectedLegislativeSegmentId?: string;
  selectedJudicialChangeId?: string;
  selectedObservationId?: string;
  x: (decimalYear: number) => number;
  xYear: (year: number) => number;
  dateToDecimalYear: (date: string) => number;
  currentYear: number;
  onSelectYear: (year: number) => void;
  onSelectPeriod: (period: PresidentialPeriod) => void;
  onSelectLegislative: (period: LegislativePeriod, segment: LegislativeConfigurationSegment) => void;
  onSelectJudicial: (change: JudicialChangeNode) => void;
  onSelectObservation: (item: CountryYearObservation) => void;
  observationLabel: (item: CountryYearObservation) => string;
  timeControls: ReactNode;
}

const legislativeStatuses = [
  ['officialist', 'Mayoría oficialista'],
  ['opposition', 'Mayoría de oposición'],
  ['divided', 'Dividida o sin mayoría clara'],
  ['absent', 'Sin Congreso o disuelto'],
  ['unknown', 'Composición desconocida'],
] as const;

export function PowersBand({
  countryCode, periods, legislativePeriods, judicialChanges, democracy, viewStart, viewEnd, selectedYear,
  selectedPeriodId, selectedLegislativeSegmentId, selectedJudicialChangeId, selectedObservationId,
  x, xYear, dateToDecimalYear, currentYear, onSelectYear, onSelectPeriod, onSelectLegislative,
  onSelectJudicial, onSelectObservation, observationLabel, timeControls,
}: PowersBandProps) {
  const countryName = countryByCode[countryCode].name;
  const relationLabels: Record<LegislativeRelation, string> = {
    government_majority: 'Mayoría oficialista', opposition_majority: 'Mayoría de oposición',
    divided_or_no_clear_majority: 'Dividida o sin mayoría clara', congress_absent_or_dissolved: 'Congreso ausente o disuelto', unknown: 'Composición desconocida',
  };
  const relationClass: Record<LegislativeRelation, string> = {
    government_majority: 'officialist', opposition_majority: 'opposition', divided_or_no_clear_majority: 'divided',
    congress_absent_or_dissolved: 'absent', unknown: 'unknown',
  };
  const legislativeTrack = (chamber: 'upper' | 'lower', y: number) => {
    const records = legislativePeriods.filter((period) => period.chamber === chamber);
    const chamberName = chamber === 'upper' ? 'Cámara alta' : 'Cámara baja';
    return <g data-legislative-track={chamber} data-status={records.length ? 'loaded' : 'no_data'}>
      <text className="power-track-label" x="20" y={y + 3}>{chamberName}</text>
      <line className="power-track-baseline" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y} y2={y} />
      {!records.length && <text className="power-track-empty" x={PLOT_LEFT + 10} y={y + 3}>Sin registros cargados para este país</text>}
      <g clipPath={`url(#${chartClipId(countryCode, 'powers')})`}>
        {records.flatMap((period) => period.segments.map((segment) => {
          const start = Math.max(viewStart, dateToDecimalYear(segment.startDate));
          const end = Math.min(viewEnd + 1, dateToDecimalYear(segment.endDate ?? `${currentYear}-12-31`));
          if (end < viewStart || start > viewEnd + 1) return null;
          const label = `${chamberName}, ${segment.startDate} a ${segment.endDate ?? 'sin término'}: ${relationLabels[segment.relation]}. ${segment.relation === 'unknown' ? 'No se infiere correlación de fuerzas.' : ''}`;
          return <rect
            key={segment.id}
            className={`legislative-segment ${relationClass[segment.relation]} ${selectedLegislativeSegmentId === segment.id ? 'selected' : ''}`}
            data-legislative-period={period.id}
            data-legislative-segment={segment.id}
            data-relation={segment.relation}
            x={x(start)} y={y - 8} width={Math.max(3, x(end) - x(start))} height="16" rx="2"
            role="button" tabIndex={0} aria-label={label}
            onClick={() => onSelectLegislative(period, segment)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectLegislative(period, segment); } }}
          ><title>{label}</title></rect>;
        }))}
      </g>
    </g>;
  };

  return <section id="band-powers" className="history-band powers-band" data-band="powers" data-view-start={viewStart} data-view-end={viewEnd} data-selected-year={selectedYear}>
    <header className="history-band-header">
      <div><span className="section-kicker">Banda 01</span><h3>Poderes del Estado</h3></div>
      <div className="band-heading-actions"><p>Tres secciones, una línea de tiempo y un cursor compartido</p>{timeControls}</div>
    </header>

    <div className="powers-section-headers" aria-label="Secciones y leyendas de los Poderes del Estado">
      <div className="power-section-heading"><h4 id={`executive-${countryCode}`}>Poder Ejecutivo</h4></div>
      <div className="power-section-heading">
        <h4 id={`legislative-${countryCode}`}>Poder Legislativo</h4>
        <div className="legislative-legend" aria-label="Leyenda no ideológica de relación con el Ejecutivo">
          {legislativeStatuses.map(([status, label]) => <span key={status} className={`legislative-key ${status}`}><span className={`legislative-swatch ${status}`} aria-hidden="true" /><span>{label}</span></span>)}
        </div>
        <p className="power-legend-note">Los colores expresan relación con el Ejecutivo, nunca orientación ideológica. Cada cámara y segmento conserva fechas propias; “desconocida” no significa ausencia de Congreso.</p>
      </div>
      <div className="power-section-heading">
        <h4 id={`judicial-${countryCode}`}>Poder Judicial</h4>
        <div className="judicial-legend-slot"><p className="power-legend-note">Escalones para atributos persistentes · nodos para cambios puntuales. La cobertura judicial actual es mínima.</p></div>
      </div>
    </div>

    <SharedHistoryChart countryCode={countryCode} band="powers" height={292} ariaLabel={`Poderes del Estado de ${countryName}: Ejecutivo, Legislativo y Judicial en un eje temporal compartido`} viewStart={viewStart} viewEnd={viewEnd} selectedYear={selectedYear} x={x} xYear={xYear} onSelectYear={onSelectYear}>
      <g className="power-section executive-section" aria-labelledby={`executive-${countryCode}`} data-power-section="executive">
        <text className="power-track-label" x="20" y="104">Administraciones Ejecutiva</text>
        <g clipPath={`url(#${chartClipId(countryCode, 'powers')})`}>
          {periods.map((period, index) => {
            const start = Math.max(viewStart, dateToDecimalYear(period.startDate));
            const end = Math.min(viewEnd + 1, dateToDecimalYear(period.endDate ?? `${currentYear}-12-31`));
            if (end < viewStart || start > viewEnd + 1) return null;
            const width = Math.max(3, x(end) - x(start));
            const label = `${period.presidentName}, gobierno de ${period.startDate} a ${period.endDate ?? 'sin fecha de término'}`;
            return <g key={period.id}>
              <rect className={`government-block ${period.periodType === 'de_facto' ? 'de-facto' : ''} ${selectedPeriodId === period.id ? 'selected' : ''}`} data-period-id={period.id} x={x(start)} y="80" width={width} height="41" rx="2" role="button" tabIndex={0} aria-label={label} onClick={() => onSelectPeriod(period)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectPeriod(period); } }}><title>{label}</title></rect>
              {width > 72 && <text className="government-label" x={x(start) + 7} y="99" pointerEvents="none">{period.presidentName}</text>}
              {width > 150 && <text className="government-date" x={x(start) + 7} y="113" pointerEvents="none">{period.startDate.slice(0, 4)}—{period.endDate?.slice(0, 4) ?? 'actualidad'}</text>}
              <rect className="government-neutral-wash" x={x(start)} y="118" width={width} height="3" fill={index % 2 ? '#a8b3ab' : '#7f9789'} pointerEvents="none" />
            </g>;
          })}
        </g>
      </g>

      <line className="power-section-divider" x1="20" x2={PLOT_RIGHT} y1="136" y2="136" />
      <g className="power-section legislative-section" aria-labelledby={`legislative-${countryCode}`} data-power-section="legislative">
        {legislativeTrack('upper', 185)}
        {legislativeTrack('lower', 207)}
      </g>

      <line className="power-section-divider" x1="20" x2={PLOT_RIGHT} y1="234" y2="234" />
      <g className="power-section judicial-section" aria-labelledby={`judicial-${countryCode}`} data-power-section="judicial">
        <g data-judicial-track="supreme-court" data-status={judicialChanges.length ? 'loaded' : 'no_data'}>
          <text className="power-track-label" x="20" y="283">Corte Suprema</text>
          <line className="power-track-baseline judicial" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1="280" y2="280" />
          {!judicialChanges.length && <text className="power-track-empty" x={PLOT_LEFT + 10} y="283">Sin cambios judiciales cargados para este país</text>}
          {judicialChanges.map((change) => {
            const date = dateToDecimalYear(change.date);
            if (date < viewStart || date > viewEnd + 1) return null;
            const label = `${change.institutionName}, ${change.date}: ${change.description}`;
            return <g key={change.id} className={`judicial-change ${selectedJudicialChangeId === change.id ? 'selected' : ''}`} data-judicial-change={change.id} role="button" tabIndex={0} aria-label={label} onClick={() => onSelectJudicial(change)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectJudicial(change); } }}>
              <circle cx={x(date)} cy="280" r="7" /><title>{label}</title>
            </g>;
          })}
        </g>
      </g>
    </SharedHistoryChart>

    <details className="complementary-institution">
      <summary>Indicador institucional complementario · Democracia electoral <span>+</span></summary>
      <div className="history-band-meta"><span>Unidad: índice de 0 a 1</span><span>Fuente: {getSource(indicatorById['electoral-democracy'].sourceIds[0])?.title}</span><span>{indicatorById['electoral-democracy'].definition}</span></div>
      <SharedHistoryChart countryCode={countryCode} band="powers-democracy" height={205} ariaLabel={`Democracia electoral de ${countryName}`} viewStart={viewStart} viewEnd={viewEnd} selectedYear={selectedYear} x={x} xYear={xYear} onSelectYear={onSelectYear}>
        <text className="history-axis-title" x={PLOT_LEFT} y="51">Democracia electoral · índice 0–1</text>
        {[0, 0.5, 1].map((value) => {
          const y = CHART_BOTTOM - value * (CHART_BOTTOM - CHART_TOP);
          return <g key={value}><line className="history-grid-line" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y} y2={y} /><text className="history-y-label" x={PLOT_LEFT - 10} y={y + 3} textAnchor="end">{value.toFixed(1)}</text></g>;
        })}
        {democracy.length ? <g clipPath={`url(#${chartClipId(countryCode, 'powers-democracy')})`}><ContinuousSeries items={democracy} xYear={xYear} y={(value) => CHART_BOTTOM - value * (CHART_BOTTOM - CHART_TOP)} className="democracy" selectedYear={selectedYear} selectedObservationId={selectedObservationId} onSelect={onSelectObservation} observationLabel={observationLabel} /></g> : <text className="history-empty-label" x={(PLOT_LEFT + PLOT_RIGHT) / 2} y="125" textAnchor="middle">Sin observaciones en este intervalo · cobertura 2000–2024.</text>}
      </SharedHistoryChart>
    </details>
  </section>;
}
