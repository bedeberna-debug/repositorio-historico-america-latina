import { getSource } from '../data/sources';
import type { Provenance } from '../types/data';

const verificationLabels = {
  verified: 'Cotejado contra la fila original',
  unverified: 'Importado; no cotejado individualmente',
  in_review: 'En revisión',
};

export function ProvenanceDetail({ provenance }: { provenance: Provenance }) {
  const source = getSource(provenance.sourceId);
  const version = source?.versions.find((item) => item.id === provenance.datasetVersionId);
  return (
    <details className="provenance-detail">
      <summary>Ver procedencia del registro <span>+</span></summary>
      <dl>
        <div><dt>Fuente</dt><dd>{source?.title ?? provenance.sourceId}</dd></div>
        <div><dt>Archivo y fila</dt><dd>{provenance.sourceFile}{provenance.sourceSheet ? ` · hoja ${provenance.sourceSheet}` : ''} · fila {provenance.sourceRow}</dd></div>
        <div><dt>Variable original</dt><dd>{provenance.originalVariable}</dd></div>
        <div><dt>Unidad</dt><dd>{provenance.unit}{provenance.originalUnit && provenance.originalUnit !== provenance.unit ? ` · original: ${provenance.originalUnit}` : ''}</dd></div>
        <div><dt>Versión del dataset</dt><dd>{version?.version ?? 'No confirmada'}</dd></div>
        {provenance.accessDate && <div><dt>Fecha de acceso</dt><dd>{provenance.accessDate}</dd></div>}
        {version?.license && <div><dt>Licencia</dt><dd>{version.license}</dd></div>}
        {provenance.methodologyVariant && <div><dt>Variante</dt><dd>{provenance.methodologyVariant}</dd></div>}
        <div><dt>Verificación</dt><dd>{verificationLabels[provenance.verificationStatus]}</dd></div>
      </dl>
      <p><strong>Transformación:</strong> {provenance.transformations.join(' ')}</p>
      {provenance.notes && <p>{provenance.notes}</p>}
      {provenance.verificationNote && <p>{provenance.verificationNote}</p>}
      {source?.bibliographicReference && <p><strong>Referencia:</strong> {source.bibliographicReference}</p>}
      <a href="#/metodologia">Abrir registro de fuentes y metodología</a>
    </details>
  );
}
