import { observations } from '../data/repositories';
import { formatNumber, numericExtent } from '../utils/scales';
import type { Indicator } from '../types/data';

export function MapLegend({ indicator, year }: { indicator: Indicator; year: number }) {
  const extent = numericExtent(observations, indicator.id);
  const decimals = indicator.id === 'electoral-democracy' ? 3 : 1;
  return (
    <div className={`map-legend legend-${indicator.kind}`} aria-label={`Leyenda para ${indicator.name}`}>
      <div className="legend-main">
        <span className="legend-title">Leyenda · {year}</span>
        {indicator.kind === 'continuous' && (
          <div className="continuous-legend"><span className="gradient-bar" /><div><span>{extent ? `${formatNumber(extent[0], decimals)} — ${formatNumber(extent[1], decimals)}` : 'Sin rango disponible'}</span><span>Mínimo — máximo importado · {indicator.unit}</span></div></div>
        )}
        {indicator.kind === 'annual_count' && (
          <div className="count-legend"><span className="legend-symbol zero" /> 0 eventos registrados <span className="legend-symbol count" /> 1–{extent?.[1] ?? 0} eventos</div>
        )}
        {indicator.kind === 'categorical' && <span>Cada categoría tendrá una asignación cromática documentada.</span>}
        {indicator.kind === 'presidential_period' && <span>Intervalos presidenciales, no valores país-año; se consultan en la vista de país.</span>}
        {indicator.kind === 'crisis_episode' && <span>Los episodios se consultan por fechas en la vista de país.</span>}
      </div>
      <div className="legend-statuses">
        <span><i className="status-swatch no-data" /> Sin dato / fuera de cobertura</span>
        <span><i className="status-swatch not-loaded" /> Otros países: no cargados en esta fase</span>
      </div>
    </div>
  );
}
