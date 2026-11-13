import { ChevronDown, Database, Info } from 'lucide-react';
import { indicators, indicatorById, kindLabels } from '../data/indicators';
import { getSource } from '../data/sources';

interface IndicatorPanelProps {
  indicatorId: string;
  setIndicatorId: (id: string) => void;
  compact?: boolean;
}

export function IndicatorPanel({ indicatorId, setIndicatorId, compact = false }: IndicatorPanelProps) {
  const indicator = indicatorById[indicatorId];
  const families = [...new Set(indicators.map((item) => item.family))];

  return (
    <section className={compact ? 'indicator-panel compact' : 'indicator-panel'} aria-labelledby={compact ? undefined : 'indicator-heading'}>
      {!compact && <div className="step-label"><span>01</span><h2 id="indicator-heading">Elige un indicador</h2></div>}
      <label className="select-label" htmlFor={compact ? 'country-indicator' : 'regional-indicator'}>Variable de exploración</label>
      <div className="select-wrap">
        <select id={compact ? 'country-indicator' : 'regional-indicator'} value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)}>
          {families.map((family) => (
            <optgroup label={family} key={family}>
              {indicators.filter((item) => item.family === family).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={17} aria-hidden="true" />
      </div>
      <div className="indicator-meta">
        <span className={`kind-badge kind-${indicator.kind}`}>{kindLabels[indicator.kind]}</span>
        <p>{indicator.definition}</p>
        <dl>
          <div><dt>Unidad</dt><dd>{indicator.unit}</dd></div>
          <div><dt>Fuente del archivo</dt><dd>{indicator.sourceIds.map((id) => getSource(id)?.institution).join(' · ')}</dd></div>
        </dl>
      </div>
      {!compact && <div className="panel-note"><Info size={15} aria-hidden="true" /><span>Datos importados para Argentina y Chile. La verificación de cada registro y los metadatos pendientes se muestran en su procedencia.</span></div>}
      {compact && <div className="compact-repository"><Database size={14} aria-hidden="true" /> Datos canónicos · Argentina y Chile</div>}
    </section>
  );
}
