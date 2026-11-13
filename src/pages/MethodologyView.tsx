import { Braces, CalendarDays, Database, FileClock, Globe2, Layers3, ShieldCheck } from 'lucide-react';
import { indicators, kindLabels } from '../data/indicators';
import { sources } from '../data/sources';
import { countries } from '../data/countries';

const entities = [
  { icon: Database, title: 'Observaciones país-año', text: 'Valores originales y normalizados, año, unidad, estado del dato y procedencia completa.' },
  { icon: CalendarDays, title: 'Períodos presidenciales', text: 'Administraciones como intervalos con fechas, duración e interrupción; sin completar vacíos por inferencia.' },
  { icon: Layers3, title: 'Episodios de crisis', text: 'Inicio, término, fecha pivote, actores, mecanismos, salida, notas y confianza.' },
  { icon: Globe2, title: 'Países normalizados', text: 'ISO Alpha-3 como clave principal; solo Argentina y Chile tienen datos en esta fase.' },
  { icon: Braces, title: 'Diccionario de variables', text: 'Definición, naturaleza, unidad, variable efectiva y compatibilidad cartográfica.' },
  { icon: FileClock, title: 'Fuentes y versiones', text: 'Archivo, hoja, fila, huella SHA-256, transformaciones y alcance de la verificación.' },
];

export function MethodologyView() {
  return (
    <div className="page methodology-page">
      <section className="methodology-hero">
        <span className="eyebrow">Documentación de las fases 02–05</span>
        <h1>Antes del dato,<br /><em>su procedencia.</em></h1>
        <p>Cada observación importada puede reconstruirse hasta su archivo o respuesta JSON, posición original, variable y transformaciones; los archivos tabulares también conservan hoja y fila. La coincidencia con el origen no equivale a validación externa.</p>
        <div className="methodology-seal"><ShieldCheck size={22} /><span>Sin interpolación<br />Sin imputación<br />Sin cifras ficticias</span></div>
      </section>

      <section className="method-section" aria-labelledby="architecture-title">
        <div className="method-section-heading"><span>01 / Arquitectura</span><h2 id="architecture-title">Seis entidades, una trazabilidad común</h2><p>Los datos canónicos se generan fuera del código de interfaz mediante un importador reproducible.</p></div>
        <div className="entity-grid">
          {entities.map(({ icon: Icon, title, text }) => <article className="entity-card" key={title}><Icon size={21} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="method-section" aria-labelledby="statuses-title">
        <div className="method-section-heading"><span>02 / Estados del dato</span><h2 id="statuses-title">Ausencia, cobertura y cero no se confunden</h2></div>
        <div className="status-grid">
          <article><i className="status-swatch no-data" /><h3>Sin dato disponible</h3><p>No hay observación cargada o el año está fuera de la cobertura efectiva. Nunca se convierte automáticamente en cero.</p></article>
          <article><i className="status-swatch not-applicable" /><h3>No aplicable</h3><p>La definición del indicador no corresponde al territorio o período; requiere justificación metodológica.</p></article>
          <article><i className="status-swatch zero-events" /><h3>Cero eventos registrados</h3><p>Solo dentro de la cobertura efectiva de la fuente y cuando la observación original es cero.</p></article>
        </div>
      </section>

      <section className="method-section" aria-labelledby="dictionary-title">
        <div className="method-section-heading"><span>03 / Diccionario de esta fase</span><h2 id="dictionary-title">{indicators.length} indicadores configurados</h2><p>Cada indicador conserva su definición, unidad, cobertura y variante metodológica; los temas aún pendientes no generan valores.</p></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Indicador</th><th>Naturaleza</th><th>Unidad</th><th>Fuente</th></tr></thead>
            <tbody>{indicators.map((indicator) => <tr key={indicator.id}><td><strong>{indicator.name}</strong><small>{indicator.family}</small></td><td><span className={`kind-badge kind-${indicator.kind}`}>{kindLabels[indicator.kind]}</span></td><td>{indicator.unit}</td><td>{indicator.sourceIds.map((id) => sources.find((source) => source.id === id)?.institution).join(' · ')}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="method-section" aria-labelledby="sources-title">
        <div className="method-section-heading"><span>04 / Registro de fuentes</span><h2 id="sources-title">Fuentes importadas, metadatos explícitos</h2><p>Los archivos del curso conservan hoja y fila; las respuestas JSON institucionales conservan URL, fecha de acceso y posición en la respuesta. Versión, fecha y licencia se muestran como no confirmadas cuando la fuente no las documenta.</p></div>
        <div className="source-list">
          {sources.map((source) => <article key={source.id}><div><span className="source-status">Fuente registrada · datos importados</span><h3>{source.title}</h3><p>{source.institution}</p></div><dl><div><dt>Versión</dt><dd>{source.versions[0].version ?? 'No confirmada'}</dd></div><div><dt>Importación</dt><dd>Realizada · verificación por registro</dd></div></dl><div className="source-documentation"><p>{source.bibliographicReference ?? 'Referencia bibliográfica pendiente o no verificada.'}</p><p>{source.metadataNote}</p><small>SHA-256: {source.versions[0].sha256}</small></div>{source.url && <a href={source.url} target="_blank" rel="noreferrer">Sitio institucional ↗</a>}</article>)}
        </div>
      </section>

      <section className="geometry-note"><Globe2 size={24} /><div><h2>Geometría cartográfica</h2><p>Los {countries.length} países utilizan geometrías generalizadas de Natural Earth distribuidas por world-atlas. Natural Earth es de dominio público; world-atlas se distribuye bajo licencia ISC. La geometría sirve para exploración regional y no para delimitaciones de precisión.</p></div></section>
    </div>
  );
}
