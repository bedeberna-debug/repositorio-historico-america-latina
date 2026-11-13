import type { ReactNode } from 'react';
import { countryByCode } from '../data/countries';
import type { HistoricalEvent } from '../types/data';
import { PLOT_LEFT, PLOT_RIGHT, SharedHistoryChart } from './HistoryChart';

interface EventsBandProps {
  countryCode: 'ARG' | 'CHL';
  events: HistoricalEvent[];
  viewStart: number;
  viewEnd: number;
  selectedYear: number;
  selectedEventId?: string;
  x: (decimalYear: number) => number;
  xYear: (year: number) => number;
  dateToDecimalYear: (date: string) => number;
  onSelectYear: (year: number) => void;
  onSelectEvent: (event: HistoricalEvent) => void;
  timeControls: ReactNode;
}

const categories = [
  { id: 'elections', label: 'Elecciones', kinds: ['election'] },
  { id: 'successions', label: 'Sucesiones y cambios de mando', kinds: ['succession'] },
  { id: 'institutional-crises', label: 'Crisis institucionales', kinds: ['crisis', 'institutional_conflict'] },
  { id: 'protests', label: 'Protestas y huelgas', kinds: ['general_strike'] },
  { id: 'scandals', label: 'Escándalos', kinds: ['scandal'] },
  { id: 'reforms', label: 'Reformas y cambios normativos', kinds: ['reform', 'constitution'] },
  { id: 'other', label: 'Otros acontecimientos', kinds: ['other'] },
] as const;

export function eventCategoryId(event: HistoricalEvent): string {
  return categories.find((category) => (category.kinds as readonly string[]).includes(event.kind))?.id ?? 'other';
}

export function visibleHistoricalEvents(events: HistoricalEvent[]): HistoricalEvent[] {
  return events.filter((event) => event.temporalType !== 'annual_aggregate' || Number(event.count) > 0);
}

function eventLabel(event: HistoricalEvent) {
  if (event.temporalType === 'annual_aggregate') return `${event.year} · ${event.count ?? 0} huelgas generales registradas. Agregado anual sin fechas individuales.`;
  const name = event.name ?? event.eventType;
  return `${event.kind === 'crisis' ? `Crisis ${event.eventType}` : name}, ${event.startDate} a ${event.endDate ?? 'sin término'}. ${event.description}`;
}

export function EventsBand({
  countryCode, events, viewStart, viewEnd, selectedYear, selectedEventId,
  x, xYear, dateToDecimalYear, onSelectYear, onSelectEvent, timeControls,
}: EventsBandProps) {
  const visibleEvents = visibleHistoricalEvents(events);
  let cursorY = 52;
  const rows = categories.map((category) => {
    const items = visibleEvents.filter((event) => eventCategoryId(event) === category.id);
    const laneById = new Map<string, number>();
    const laneCounts = new Map<string, number>();
    for (const event of items) {
      const dateKey = event.startDate ?? String(event.year);
      const lane = laneCounts.get(dateKey) ?? 0;
      laneById.set(event.id, lane);
      laneCounts.set(dateKey, lane + 1);
    }
    const maxLane = Math.max(0, ...laneById.values());
    const height = items.length ? 38 + maxLane * 18 : 23;
    const row = { ...category, items, laneById, y: cursorY + (items.length ? 15 : 8), height };
    cursorY += height;
    return row;
  });
  const height = cursorY + 8;
  const interactiveProps = (event: HistoricalEvent) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': eventLabel(event),
    onClick: () => onSelectEvent(event),
    onKeyDown: (keyboardEvent: React.KeyboardEvent<SVGGElement>) => {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        onSelectEvent(event);
      }
    },
  });

  return <section id="band-events" className="history-band events-band" data-band="events" data-view-start={viewStart} data-view-end={viewEnd} data-selected-year={selectedYear}>
    <header className="history-band-header">
      <div><span className="section-kicker">Carril transversal</span><h3>Acontecimientos</h3></div>
      <div className="band-heading-actions"><p>Categorías separadas · agregados anuales sin fechas inventadas</p>{timeControls}</div>
    </header>
    <SharedHistoryChart countryCode={countryCode} band="events" height={height} ariaLabel={`Acontecimientos de ${countryByCode[countryCode].name}, separados por categoría`} viewStart={viewStart} viewEnd={viewEnd} selectedYear={selectedYear} x={x} xYear={xYear} onSelectYear={onSelectYear}>
      {rows.map((row) => <g key={row.id} className={`event-category-row ${row.items.length ? 'has-events' : 'empty'}`} data-event-category={row.id} data-event-count={row.items.length}>
        <text className="event-category-label" x="20" y={row.y + 3}>{row.label}</text>
        <line className="event-category-baseline" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={row.y} y2={row.y} />
        {!row.items.length && <text className="event-empty-label" x={PLOT_LEFT + 10} y={row.y + 3}>Sin registros cargados</text>}
        {row.items.map((event) => {
          const eventY = row.y + (row.laneById.get(event.id) ?? 0) * 18;
          if (event.temporalType === 'annual_aggregate') {
            if (event.year < viewStart || event.year > viewEnd || Number(event.count) <= 0) return null;
            return <g key={event.id} className={`history-event annual-strike ${selectedEventId === event.id ? 'selected' : ''}`} data-event-id={event.id} data-event-kind={event.kind} data-temporal-type="annual_aggregate" data-year={event.year} data-count={event.count} {...interactiveProps(event)}>
              <circle cx={xYear(event.year)} cy={eventY} r="7" /><text className="event-count-label" x={xYear(event.year) + 11} y={eventY + 3}>{event.count}</text><title>{eventLabel(event)}</title>
            </g>;
          }
          const start = dateToDecimalYear(event.startDate!);
          const end = dateToDecimalYear(event.endDate ?? event.startDate!);
          if (end < viewStart || start > viewEnd + 1) return null;
          const eventClass = event.kind === 'crisis' ? `crisis-event crisis-${event.eventType.toLowerCase()}` : `documentary-event event-${event.kind}`;
          return <g key={event.id} className={`history-event ${eventClass} ${selectedEventId === event.id ? 'selected' : ''}`} data-event-id={event.id} data-event-kind={event.kind} data-temporal-type={event.temporalType} data-category={event.eventType} {...interactiveProps(event)}>
            <line x1={x(Math.max(viewStart, start))} x2={x(Math.min(viewEnd + 1, end))} y1={eventY} y2={eventY} /><circle cx={x(start)} cy={eventY} r="7" /><title>{eventLabel(event)}</title>
          </g>;
        })}
      </g>)}
    </SharedHistoryChart>
    <p className="band-footnote">Los años con cero huelgas y los años fuera de cobertura no generan nodos. Los registros coincidentes se distribuyen verticalmente sin alterar sus fechas. La ausencia de nodos no equivale a ausencia histórica fuera de la cobertura documentada.</p>
  </section>;
}
