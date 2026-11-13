import type { CrisisEpisode, PresidentialPeriod } from '../types/data';
import { ProvenanceDetail } from './ProvenanceDetail';

const mechanismLabels: Record<string, string> = {
  RU: 'Revuelta urbana', HPG: 'Huelga política general', CP: 'Campaña de protesta',
  ILR: 'Iniciativa legislativa de remoción', CC: 'Cierre o disolución del Congreso',
  FJ: 'Intervención judicial', MI: 'Intervención militar', IC: 'Intervención central/subnacional',
  D: 'Demanda explícita de remoción',
};

function intervalStyle(startDate: string, endDate: string | null, domainStart: number, domainEnd: number) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = endDate ? Date.parse(`${endDate}T00:00:00Z`) : domainEnd;
  return {
    left: `${((start - domainStart) / (domainEnd - domainStart)) * 100}%`,
    width: `${Math.max(0.7, ((end - start) / (domainEnd - domainStart)) * 100)}%`,
  };
}

export function PresidentialIntervals({ periods }: { periods: PresidentialPeriod[] }) {
  const domainStart = Math.min(...periods.map((item) => Date.parse(`${item.startDate}T00:00:00Z`)));
  const domainEnd = Math.max(...periods.map((item) => Date.parse(`${item.endDate ?? item.startDate}T00:00:00Z`)));
  return <div className="interval-list">
    <div className="interval-axis"><span>{periods[0]?.startDate}</span><span>Cobertura del archivo, sin extrapolación</span><span>{periods.at(-1)?.endDate}</span></div>
    {periods.map((period) => <article className="interval-record" key={period.id}>
      <div className="interval-track" aria-hidden="true"><span style={intervalStyle(period.startDate, period.endDate, domainStart, domainEnd)} /></div>
      <details>
        <summary><span><strong>{period.presidentName}</strong><small>{period.startDate} → {period.endDate ?? 'sin fecha de término'} · {period.durationDays} días</small></span><span>+</span></summary>
        <p><strong>Interrupción:</strong> {period.interruptionStatus === 'interrupted' ? 'Sí (failure=1)' : 'No determinada (failure=0)'}.</p>
        <p><strong>Partido y coalición:</strong> sin dato en el archivo utilizado. <strong>Identificador adm:</strong> {period.originalValues?.adm ?? 'no aplica a la serie documental'}.</p>
        <ProvenanceDetail provenance={period.provenance} />
      </details>
    </article>)}
  </div>;
}

export function CrisisIntervals({ crises }: { crises: CrisisEpisode[] }) {
  const domainStart = Math.min(...crises.map((item) => Date.parse(`${item.startDate}T00:00:00Z`)));
  const domainEnd = Math.max(...crises.map((item) => Date.parse(`${item.endDate ?? item.startDate}T00:00:00Z`)));
  return <div className="interval-list crisis-list">
    {crises.map((crisis) => <article className="interval-record crisis-record" key={crisis.id}>
      <div className="interval-track" aria-hidden="true"><span style={intervalStyle(crisis.startDate, crisis.endDate, domainStart, domainEnd)} /></div>
      <details>
        <summary><span><strong>{crisis.crisisType} · {crisis.startDate}</strong><small>{crisis.startDate} → {crisis.endDate ?? 'sin término'} · {crisis.durationDays} días</small></span><span>+</span></summary>
        <p>{crisis.description}</p>
        <dl className="crisis-metadata">
          <div><dt>Fecha pivote</dt><dd>{crisis.peakDate ?? 'Sin dato'} · confianza {crisis.confidence ?? 'sin dato'}</dd></div>
          <div><dt>Actores horizontales</dt><dd>{crisis.actors.horizontal ?? 'Sin dato'}</dd></div>
          <div><dt>Actores verticales</dt><dd>{crisis.actors.vertical ?? 'Sin dato'}</dd></div>
          <div><dt>Salida presidencial</dt><dd>{crisis.presidentialExit === 'yes' ? 'Sí (salida=1)' : crisis.presidentialExit === 'no' ? 'No (salida=0)' : 'Desconocida'}</dd></div>
        </dl>
        <p><strong>Mecanismos registrados:</strong> {Object.entries(crisis.mechanisms).filter(([, value]) => value === 1).map(([key]) => mechanismLabels[key] ?? key).join('; ') || 'Ninguno codificado como 1'}.</p>
        <p><strong>Inicio:</strong> {crisis.justifications.start ?? 'Sin justificación disponible'}<br /><strong>Término:</strong> {crisis.justifications.end ?? 'Sin justificación disponible'}</p>
        <ProvenanceDetail provenance={crisis.provenance} />
      </details>
    </article>)}
    <p className="context-note">La ausencia de un episodio en otra fecha no significa que no haya ocurrido una crisis.</p>
  </div>;
}
