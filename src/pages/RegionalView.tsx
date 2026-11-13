import { useState } from 'react';
import { ArrowDown, BookOpen, Database, Layers3 } from 'lucide-react';
import { IndicatorPanel } from '../components/IndicatorPanel';
import { MapLegend } from '../components/MapLegend';
import { RegionalMap } from '../components/RegionalMap';
import { Timeline } from '../components/Timeline';
import { indicatorById, indicators } from '../data/indicators';
import { crisisEpisodes, getObservationCoverage, observations, presidentialPeriods } from '../data/repositories';
import { getSource } from '../data/sources';
import type { CountryCode } from '../types/data';

interface RegionalViewProps {
  indicatorId: string;
  setIndicatorId: (id: string) => void;
  year: number;
  setYear: (year: number) => void;
  navigate: (path: string) => void;
}

export function RegionalView({ indicatorId, setIndicatorId, year, setYear, navigate }: RegionalViewProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const indicator = indicatorById[indicatorId];
  const sourceNames = indicator.sourceIds.map((id) => getSource(id)?.title).filter(Boolean).join(' · ');
  const argCoverage = getObservationCoverage('ARG', indicatorId);
  const chlCoverage = getObservationCoverage('CHL', indicatorId);
  const coverageText = argCoverage?.startYear && argCoverage.endYear && chlCoverage?.startYear && chlCoverage.endYear
    ? `ARG ${argCoverage.startYear}–${argCoverage.endYear} · CHL ${chlCoverage.startYear}–${chlCoverage.endYear}`
    : 'Intervalos y episodios con fechas en las vistas de país';
  const verifiedCount = [...observations, ...presidentialPeriods, ...crisisEpisodes].filter((item) => item.provenance.verificationStatus === 'verified').length;

  const selectCountry = (code: CountryCode) => {
    if (code === 'ARG' || code === 'CHL') navigate(`/pais/${code}`);
    else setSelectedCountry(code);
  };

  return (
    <div className="page regional-page">
      <section className="hero">
        <div>
          <div className="eyebrow"><span>Observatorio regional</span><i />1950—Presente</div>
          <h1>Historia, datos<br />y <em>contexto.</em></h1>
        </div>
        <div className="hero-copy">
          <p>Una infraestructura abierta para explorar la evolución política, económica y social de América Latina.</p>
          <button className="text-link" onClick={() => navigate('/metodologia')}>Cómo leer esta beta <ArrowDown size={15} /></button>
        </div>
        <div className="hero-stats" aria-label="Alcance de la beta">
          <div><strong>18</strong><span>países</span></div>
          <div><strong>{indicators.length}</strong><span>indicadores</span></div>
          <div><strong>02</strong><span>módulos país</span></div>
        </div>
      </section>

      <div className="explorer-grid">
        <aside className="control-column">
          <IndicatorPanel indicatorId={indicatorId} setIndicatorId={setIndicatorId} />
          <section className="repository-status">
            <div className="step-label"><span>03</span><h2>Estado del repositorio</h2></div>
            <div className="repository-number"><strong>{observations.length}</strong><span>observaciones<br />cargadas</span></div>
            <p>Argentina y Chile, con valores originales y normalizados, procedencia y cobertura propia. {verifiedCount} registros fueron cotejados con su archivo, respuesta JSON o respaldo documental; la cobertura sigue siendo parcial.</p>
            <div className="status-line"><i /> Fase 06 · tabla de datos y descargas verificables</div>
          </section>
        </aside>

        <section className="map-card" aria-labelledby="map-heading">
          <header className="map-card-header">
            <div><span className="section-kicker">Panorama regional</span><h2 id="map-heading">{indicator.shortName}</h2></div>
            <div className="map-year"><span>Año</span><strong>{year}</strong></div>
          </header>
          {!indicator.mapCompatible && <div className="map-info-banner"><Layers3 size={16} /> {indicator.domain === 'society' ? 'Esta serie social se consulta en el explorador histórico de cada país; no se fuerza a una lectura cartográfica regional.' : 'Este indicador conserva episodios con fechas y se detalla en las vistas de país; no se fuerza a una agregación anual.'}</div>}
          <RegionalMap indicator={indicator} year={year} selectedCountry={selectedCountry} onSelect={selectCountry} onClosePreview={() => setSelectedCountry(null)} />
          <MapLegend indicator={indicator} year={year} />
          <Timeline year={year} setYear={setYear} />
          <div className="map-provenance">
            <div><Database size={16} /><span><small>Fuente del archivo</small>{sourceNames}</span></div>
            <div><BookOpen size={16} /><span><small>Cobertura efectiva</small>{coverageText}</span></div>
          </div>
        </section>
      </div>

      <section className="reading-guide" aria-labelledby="reading-title">
        <div><span className="section-kicker">Una distinción esencial</span><h2 id="reading-title">Ausente no significa cero.</h2></div>
        <p>La plataforma diferencia la falta de observación, la no aplicabilidad y el registro documentado de cero eventos. Cada serie mantiene su propia cobertura temporal.</p>
        <button className="secondary-button" onClick={() => navigate('/metodologia')}>Revisar criterios <span>↗</span></button>
      </section>
    </div>
  );
}
