import { useEffect, useMemo, useState } from 'react';
import { Download, RotateCcw, Search, X } from 'lucide-react';
import { CURRENT_YEAR, START_YEAR } from '../App';
import { countryByCode } from '../data/countries';
import { getSource } from '../data/sources';
import { formatNumber, formatValue } from '../utils/scales';
import {
  buildTableSeries,
  calculateAnnualVariation,
  DEFAULT_TABLE_FILTERS,
  filterTableSeries,
  getTableCell,
  VALUE_ORIGIN_LABELS,
  VERIFICATION_LABELS,
  type TableFilters,
  type TableSeries,
  type VariationMode,
} from '../utils/dataTable';
import {
  buildExportPackage,
  downloadCsv,
  downloadXlsx,
  type DownloadScope,
  type ExportPackage,
} from '../utils/downloads';
import { ProvenanceDetail } from './ProvenanceDetail';

const DOMAIN_LABELS = {
  economy: 'Economía',
  society: 'Sociedad',
  institutions: 'Instituciones',
} as const;

const VARIATION_LABELS: Record<VariationMode, string> = {
  absolute: 'Variación absoluta',
  percent: 'Variación porcentual',
  percentage_points: 'Diferencia en puntos porcentuales',
};

function rawValue(value: string | number | null): string {
  return value === null || value === undefined ? 'No disponible' : String(value);
}

function CellDetail({ row, year, onClose }: { row: TableSeries; year: number; onClose: () => void }) {
  const cell = getTableCell(row, year);
  const observation = cell.observation;
  const provenance = observation?.provenance ?? row.observations[0]?.provenance;
  const source = provenance ? getSource(provenance.sourceId) : undefined;
  const version = source?.versions.find((item) => item.id === provenance?.datasetVersionId);
  return (
    <section className="data-cell-detail" aria-label={`Ficha de ${row.indicator.name}, ${year}`} aria-live="polite">
      <div className="data-cell-detail-heading">
        <div><span className="section-kicker">Procedencia de la celda</span><h3>{countryByCode[row.countryCode].name} · {year}</h3><p>{row.indicator.name}</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar ficha de celda"><X size={18} /></button>
      </div>
      <dl className="record-metadata">
        <div><dt>Serie inequívoca</dt><dd>{row.indicator.id} · {row.variant} · {row.methodology} · {row.unit} · {row.sourceId}</dd></div>
        <div><dt>Estado de la celda</dt><dd>{cell.label}. {cell.detail}</dd></div>
        <div><dt>Valor original</dt><dd>{rawValue(observation?.originalValue ?? null)}</dd></div>
        <div><dt>Valor normalizado</dt><dd>{observation && typeof observation.normalizedValue === 'number' ? formatValue(observation) : rawValue(observation?.normalizedValue ?? null)}</dd></div>
        <div><dt>Unidad original</dt><dd>{provenance?.originalUnit ?? provenance?.unit ?? 'No disponible'}</dd></div>
        <div><dt>Unidad normalizada</dt><dd>{provenance?.unit ?? row.unit}</dd></div>
        <div><dt>Origen del valor</dt><dd>{observation ? VALUE_ORIGIN_LABELS[observation.derivation ? 'derived' : observation.valueOrigin ?? 'observed'] : 'Sin observación; ausencia no convertida en cero'}</dd></div>
        <div><dt>Fuente y versión</dt><dd>{source?.title ?? row.sourceId} · {version?.version ?? 'Versión no confirmada'} · {row.datasetVersionId}</dd></div>
        <div><dt>Archivo o respuesta original</dt><dd>{provenance?.sourceFile ?? 'No disponible'}{provenance?.sourceSheet ? ` · hoja ${provenance.sourceSheet}` : ''}</dd></div>
        <div><dt>Fila o posición de origen</dt><dd>{provenance ? `Fila ${provenance.sourceRow} · variable ${provenance.originalVariable}` : 'No disponible'}</dd></div>
        <div><dt>Estado y alcance de verificación</dt><dd>{provenance ? VERIFICATION_LABELS[provenance.verificationStatus] : 'Sin observación para verificar'}. El cotejo con el original no constituye verificación externa.</dd></div>
        <div><dt>Transformaciones</dt><dd>{provenance?.transformations.join(' | ') || 'Sin transformaciones registradas'}</dd></div>
      </dl>
      {observation?.derivation && <div className="derived-record-note" data-table-derived-record>
        <strong>Valor derivado; no es una observación canónica</strong>
        <p><strong>Fórmula:</strong> {observation.derivation.formula}.</p>
        <dl className="record-metadata">
          <div><dt>Población de entrada</dt><dd>{formatValue(observation.derivation.population)} {observation.derivation.population.provenance.unit} · {observation.derivation.population.id}</dd></div>
          <div><dt>Porcentaje de entrada</dt><dd>{formatValue(observation.derivation.percentage)} {observation.derivation.percentage.provenance.unit} · {observation.derivation.percentage.id}</dd></div>
        </dl>
        <ProvenanceDetail provenance={observation.derivation.population.provenance} />
        <ProvenanceDetail provenance={observation.derivation.percentage.provenance} />
      </div>}
      {provenance && !observation?.derivation && <ProvenanceDetail provenance={provenance} />}
    </section>
  );
}

interface DataTableViewProps {
  countryCode: 'ARG' | 'CHL';
  viewStart: number;
  viewEnd: number;
  onIntervalChange: (start: number, end: number) => void;
  includeDerivedAndEstimates: boolean;
  setIncludeDerivedAndEstimates: (include: boolean) => void;
  setYear: (year: number) => void;
  setIndicatorId: (id: string) => void;
}

export function DataTableView({
  countryCode, viewStart, viewEnd, onIntervalChange,
  includeDerivedAndEstimates, setIncludeDerivedAndEstimates, setYear, setIndicatorId,
}: DataTableViewProps) {
  const allRows = useMemo(() => buildTableSeries(countryCode, true), [countryCode]);
  const availableRows = useMemo(() => includeDerivedAndEstimates
    ? allRows
    : allRows.filter((row) => row.origins.every((origin) => origin === 'observed')), [allRows, includeDerivedAndEstimates]);
  const [filters, setFilters] = useState<TableFilters>({ ...DEFAULT_TABLE_FILTERS });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(allRows.map((row) => row.seriesId)));
  const [showMethodColumns, setShowMethodColumns] = useState(false);
  const [showVariation, setShowVariation] = useState(false);
  const [variationMode, setVariationMode] = useState<VariationMode>('absolute');
  const [selectedCell, setSelectedCell] = useState<{ seriesId: string; year: number } | null>(null);
  const [downloadScope, setDownloadScope] = useState<DownloadScope>('selection');
  const [category, setCategory] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [busyDownload, setBusyDownload] = useState<'csv' | 'xlsx' | null>(null);

  const themes = useMemo(() => [...new Set(allRows.map((row) => row.indicator.theme))].sort(), [allRows]);
  const filteredRows = useMemo(() => filterTableSeries(availableRows, filters, viewStart, viewEnd), [availableRows, filters, viewStart, viewEnd]);
  const years = useMemo(() => Array.from({ length: viewEnd - viewStart + 1 }, (_, index) => viewStart + index), [viewStart, viewEnd]);
  const selectedVisibleRows = filteredRows.filter((row) => selectedIds.has(row.seriesId));
  const activeCategory = category || themes[0] || '';
  const detail = selectedCell ? {
    row: allRows.find((row) => row.seriesId === selectedCell.seriesId),
    year: selectedCell.year,
  } : null;

  useEffect(() => {
    setFilters({ ...DEFAULT_TABLE_FILTERS });
    setSelectedIds(new Set(allRows.map((row) => row.seriesId)));
    setSelectedCell(null);
    setCategory('');
  }, [countryCode]); // El estado de una vista no se mezcla con otro módulo país.

  useEffect(() => {
    if (selectedCell && !availableRows.some((row) => row.seriesId === selectedCell.seriesId)) setSelectedCell(null);
  }, [availableRows, selectedCell]);

  const updateFilter = <K extends keyof TableFilters>(key: K, value: TableFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const selectCell = (row: TableSeries, year: number) => {
    setSelectedCell({ seriesId: row.seriesId, year });
    setYear(year);
    setIndicatorId(row.indicator.id);
  };

  const handleCellKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, rowIndex: number, year: number) => {
    let nextRow = rowIndex;
    let nextYear = year;
    if (event.key === 'ArrowUp') nextRow -= 1;
    else if (event.key === 'ArrowDown') nextRow += 1;
    else if (event.key === 'ArrowLeft') nextYear -= 1;
    else if (event.key === 'ArrowRight') nextYear += 1;
    else if (event.key === 'Home') nextYear = viewStart;
    else if (event.key === 'End') nextYear = viewEnd;
    else return;
    event.preventDefault();
    const matrix = event.currentTarget.closest('.data-matrix');
    matrix?.querySelector<HTMLButtonElement>(`[data-cell-key="${Math.max(0, Math.min(filteredRows.length - 1, nextRow))}-${Math.max(viewStart, Math.min(viewEnd, nextYear))}"]`)?.focus();
  };

  const rowsForDownload = (): TableSeries[] => {
    if (downloadScope === 'module') return allRows;
    if (downloadScope === 'category') return availableRows.filter((row) => row.indicator.theme === activeCategory);
    return selectedVisibleRows;
  };

  const createDownloadPackage = (): ExportPackage => {
    const fullModule = downloadScope === 'module';
    return buildExportPackage({
      rows: rowsForDownload(),
      countryCode,
      scope: downloadScope,
      scopeLabel: downloadScope === 'selection' ? 'Selección actual de series visibles y activadas' : downloadScope === 'category' ? `Categoría: ${activeCategory}` : 'Módulo completo del país',
      startYear: fullModule ? START_YEAR : viewStart,
      endYear: fullModule ? CURRENT_YEAR : viewEnd,
      filters: fullModule ? { alcance: 'Sin filtros; módulo completo' } : {
        búsqueda: filters.search || 'Todas',
        ámbito: filters.domain,
        tema: downloadScope === 'category' ? activeCategory : filters.theme,
        origen: filters.origin,
        verificación: filters.verification,
        estimaciones_y_derivados_compartidos: includeDerivedAndEstimates ? 'incluidos' : 'excluidos',
      },
    });
  };

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    setBusyDownload(format);
    setDownloadStatus('Preparando la descarga…');
    try {
      const pack = createDownloadPackage();
      if (!pack.manifest.observationCount) {
        setDownloadStatus('No hay observaciones en el alcance y el intervalo elegidos. Ajusta la selección antes de descargar.');
        return;
      }
      if (format === 'csv') downloadCsv(pack);
      else await downloadXlsx(pack);
      setDownloadStatus(`${format.toUpperCase()} generado: ${pack.manifest.seriesCount} series y ${pack.manifest.observationCount} observaciones.`);
    } catch (error) {
      setDownloadStatus(`No se pudo generar la descarga: ${error instanceof Error ? error.message : 'error desconocido'}.`);
    } finally {
      setBusyDownload(null);
    }
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_TABLE_FILTERS });
    setShowVariation(false);
    setVariationMode('absolute');
  };

  return (
    <section className="data-table-view" aria-labelledby="data-table-title" data-view-start={viewStart} data-view-end={viewEnd}>
      <header className="explorer-header data-table-header">
        <div><span className="section-kicker">Consulta estructurada · Fase 06</span><h2 id="data-table-title">Tabla de datos</h2><p>Años en columnas y series inequívocas en filas. Cada valor conserva su metodología, unidad, fuente y procedencia.</p></div>
        <div className="explorer-domain" aria-label="Intervalo de la tabla"><span>Intervalo visible</span><strong>{viewStart}—{viewEnd}</strong></div>
      </header>

      <div className="data-filter-panel" aria-label="Filtros de la tabla de datos">
        <label className="data-search"><span>Buscar indicadores</span><div><Search size={16} aria-hidden="true" /><input type="search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Nombre, identificador o fuente" /></div></label>
        <label>Ámbito<select aria-label="Filtrar por ámbito" value={filters.domain} onChange={(event) => updateFilter('domain', event.target.value as TableFilters['domain'])}><option value="all">Todos los ámbitos</option>{Object.entries(DOMAIN_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Tema<select aria-label="Filtrar por tema" value={filters.theme} onChange={(event) => updateFilter('theme', event.target.value)}><option value="all">Todos los temas</option>{themes.map((theme) => <option key={theme}>{theme}</option>)}</select></label>
        <label>Origen del valor<select aria-label="Filtrar por origen" value={filters.origin} onChange={(event) => updateFilter('origin', event.target.value as TableFilters['origin'])}><option value="all">Todos los orígenes</option>{Object.entries(VALUE_ORIGIN_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Verificación<select aria-label="Filtrar por verificación" value={filters.verification} onChange={(event) => updateFilter('verification', event.target.value as TableFilters['verification'])}><option value="all">Todos los estados</option>{Object.entries(VERIFICATION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <div className="data-interval-fields"><label>Inicio<input aria-label="Inicio del intervalo de tabla" type="number" min={START_YEAR} max={viewEnd - 3} value={viewStart} onChange={(event) => onIntervalChange(Number(event.target.value), viewEnd)} /></label><label>Fin<input aria-label="Fin del intervalo de tabla" type="number" min={viewStart + 3} max={CURRENT_YEAR} value={viewEnd} onChange={(event) => onIntervalChange(viewStart, Number(event.target.value))} /></label></div>
        <label className="data-checkbox"><input type="checkbox" checked={filters.onlyWithData} onChange={(event) => updateFilter('onlyWithData', event.target.checked)} /> Solo series con datos en el intervalo</label>
        <label className="data-checkbox"><input type="checkbox" aria-label="Incluir derivados y estimaciones en la tabla" checked={includeDerivedAndEstimates} onChange={(event) => setIncludeDerivedAndEstimates(event.target.checked)} /> Incluir derivados y estimaciones en la tabla</label>
        <button className="icon-text-button data-reset" onClick={resetFilters}><RotateCcw size={15} /> Restablecer filtros</button>
      </div>

      <div className="data-selection-toolbar">
        <p><strong>{filteredRows.length}</strong> series visibles · <strong>{selectedVisibleRows.length}</strong> activadas para descargar</p>
        <div><button onClick={() => setSelectedIds((current) => new Set([...current, ...filteredRows.map((row) => row.seriesId)]))} disabled={!filteredRows.length}>Seleccionar visibles</button><button onClick={() => setSelectedIds((current) => new Set([...current].filter((id) => !filteredRows.some((row) => row.seriesId === id))))} disabled={!filteredRows.length}>Quitar visibles</button><button onClick={() => setSelectedIds(new Set())} disabled={!selectedIds.size}>Deseleccionar todas</button></div>
      </div>

      <div className="data-table-display">
        <label className="data-checkbox"><input type="checkbox" checked={showMethodColumns} onChange={(event) => setShowMethodColumns(event.target.checked)} /> Mostrar columnas metodológicas</label>
        <p>{showMethodColumns ? 'Las columnas adicionales no son fijas. La ficha de cada celda conserva la procedencia completa.' : 'Vista esencial: solo Indicador permanece fijo; los años comienzan inmediatamente después.'}</p>
      </div>

      <div className="variation-controls">
        <label className="data-checkbox"><input type="checkbox" checked={showVariation} onChange={(event) => setShowVariation(event.target.checked)} /> Mostrar variación anual</label>
        {showVariation && <label>Tipo de variación<select aria-label="Tipo de variación" value={variationMode} onChange={(event) => setVariationMode(event.target.value as VariationMode)}>{Object.entries(VARIATION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}
        <p>{showVariation ? `${VARIATION_LABELS[variationMode]}: ${variationMode === 'percent' ? '(año − año anterior) / año anterior × 100; exige denominador positivo y una unidad no porcentual.' : variationMode === 'percentage_points' ? 'año − año anterior; solo para tasas, porcentajes y composiciones, en puntos porcentuales.' : 'año − año anterior; conserva la unidad de la serie.'} Son cálculos derivados de presentación, solo entre años consecutivos.` : 'Las variaciones están desactivadas y no amplían la tabla.'}</p>
      </div>

      <p className="data-table-instruction" id="data-table-instruction">Activa series con las casillas de la columna Indicador. Selecciona una celda para abrir su ficha; con el foco en una celda, usa las flechas para recorrer años y series.</p>
      <div className="data-matrix-scroll" tabIndex={0} role="region" aria-label="Matriz histórica con desplazamiento horizontal" aria-describedby="data-table-instruction">
        <table className={`data-matrix${showMethodColumns ? ' with-method-columns' : ' essential'}${showVariation ? ' with-variation' : ''}`}>
          <caption className="sr-only">Matriz de {countryByCode[countryCode].name}, {viewStart}–{viewEnd}</caption>
          <thead>
            <tr className="data-matrix-main-head">
              <th scope="col" rowSpan={showVariation ? 2 : 1} className="sticky-column indicator-column" data-column-kind="indicator">Indicador</th>
              {showMethodColumns && <>
                <th scope="col" rowSpan={showVariation ? 2 : 1} className="metadata-column metadata-domain">Ámbito</th>
                <th scope="col" rowSpan={showVariation ? 2 : 1} className="metadata-column metadata-theme">Tema</th>
                <th scope="col" rowSpan={showVariation ? 2 : 1} className="metadata-column metadata-method">Variante o metodología</th>
                <th scope="col" rowSpan={showVariation ? 2 : 1} className="metadata-column metadata-unit">Unidad</th>
                <th scope="col" rowSpan={showVariation ? 2 : 1} className="metadata-column metadata-origin">Origen del valor</th>
                <th scope="col" rowSpan={showVariation ? 2 : 1} className="metadata-column metadata-coverage">Cobertura efectiva</th>
              </>}
              {years.map((year) => <th key={year} scope="col" colSpan={showVariation ? 2 : 1} className="year-heading">{year}</th>)}
            </tr>
            {showVariation && <tr>{years.map((year) => [
              <th key={`${year}-value`} scope="col" className="variation-subhead">Valor</th>,
              <th key={`${year}-variation`} scope="col" className="variation-subhead">Δ derivada</th>,
            ])}</tr>}
          </thead>
          <tbody>
            {filteredRows.map((row, rowIndex) => <tr key={row.seriesId} data-series-id={row.seriesId}>
              <th scope="row" className="sticky-column indicator-column data-indicator-cell" data-column-kind="indicator"><label><input type="checkbox" checked={selectedIds.has(row.seriesId)} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(row.seriesId); else next.delete(row.seriesId); return next; })} aria-label={`Activar ${row.indicator.name}, ${row.variant}`} /><span>{row.indicator.name}<small>{row.variant} · {row.unit}</small><small className="data-indicator-id">{row.indicator.id}</small></span></label></th>
              {showMethodColumns && <>
                <td className="metadata-column metadata-domain">{DOMAIN_LABELS[row.indicator.domain]}</td>
                <td className="metadata-column metadata-theme">{row.indicator.theme}</td>
                <td className="metadata-column metadata-method"><strong>{row.variant}</strong><small>{row.methodology}</small></td>
                <td className="metadata-column metadata-unit">{row.unit}</td>
                <td className="metadata-column metadata-origin">{row.origins.map((origin) => VALUE_ORIGIN_LABELS[origin]).join(' · ')}</td>
                <td className="metadata-column metadata-coverage">{row.coverage.startYear ?? '…'}–{row.coverage.endYear ?? '…'}<small>{row.coverage.territorialLevel}</small></td>
              </>}
              {years.map((year) => {
                const cell = getTableCell(row, year);
                const observation = cell.observation;
                const display = cell.status === 'available' && observation && observation.valueStatus !== 'zero_events' ? formatValue(observation) : cell.label;
                const origin = observation ? VALUE_ORIGIN_LABELS[observation.derivation ? 'derived' : observation.valueOrigin ?? 'observed'] : 'Sin observación';
                const variation = showVariation ? calculateAnnualVariation(row, year, variationMode) : null;
                return <td key={year} className={`data-year-cell status-${cell.status}`} colSpan={showVariation ? 2 : 1}>
                  <div className="data-year-value-pair">
                    <button data-cell-key={`${rowIndex}-${year}`} data-cell-series={row.seriesId} data-year={year} data-cell-status={cell.status} onClick={() => selectCell(row, year)} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, year)} aria-label={`${countryByCode[countryCode].name}, ${year}, ${row.indicator.name}, ${row.variant}: ${display} ${row.unit}. ${origin}. ${cell.detail}`}>{display}</button>
                    {showVariation && <span className="annual-variation" data-variation-year={year} title={variation ? `${variation.formula}. Unidad: ${variation.unit}. Cálculo derivado de presentación.` : 'No calculable: falta el año consecutivo anterior, el dato o la interpretación matemática.'} aria-label={variation ? `Variación derivada ${year}: ${formatNumber(variation.value, 3)} ${variation.unit}` : `Variación ${year}: no calculable`}>{variation ? `${variation.value > 0 ? '+' : ''}${formatNumber(variation.value, 3)}` : '—'}</span>}
                  </div>
                </td>;
              })}
            </tr>)}
            {!filteredRows.length && <tr><td colSpan={1 + (showMethodColumns ? 6 : 0) + years.length * (showVariation ? 2 : 1)} className="data-empty-cell">No hay series que coincidan con los filtros. Restablece los filtros o amplía el intervalo.</td></tr>}
          </tbody>
        </table>
      </div>

      {detail?.row && <CellDetail row={detail.row} year={detail.year} onClose={() => setSelectedCell(null)} />}

      <section className="data-downloads" id="data-downloads" aria-labelledby="data-downloads-title">
        <div className="data-downloads-intro"><Download size={23} /><div><span className="section-kicker">Datos verificables</span><h3 id="data-downloads-title">Descargar datos</h3><p>CSV largo para análisis o XLSX real con matriz, datos, diccionario, fuentes, notas y manifiesto.</p></div></div>
        <fieldset className="download-scope"><legend>Alcance</legend><label><input type="radio" name={`scope-${countryCode}`} value="selection" checked={downloadScope === 'selection'} onChange={() => setDownloadScope('selection')} /> Selección actual</label><label><input type="radio" name={`scope-${countryCode}`} value="category" checked={downloadScope === 'category'} onChange={() => setDownloadScope('category')} /> Categoría</label><label><input type="radio" name={`scope-${countryCode}`} value="module" checked={downloadScope === 'module'} onChange={() => setDownloadScope('module')} /> Módulo completo del país</label></fieldset>
        {downloadScope === 'category' && <label className="download-category">Categoría a descargar<select aria-label="Categoría a descargar" value={activeCategory} onChange={(event) => setCategory(event.target.value)}>{themes.map((theme) => <option key={theme}>{theme}</option>)}</select></label>}
        <p className="download-scope-note">{downloadScope === 'selection' ? 'Incluye las series activadas que coinciden con los filtros y el intervalo actuales.' : downloadScope === 'category' ? `Incluye todas las series de “${activeCategory}” en ${viewStart}–${viewEnd}, sin exigir que estén activadas.` : `Incluye todos los datos del país en ${START_YEAR}–${CURRENT_YEAR}, sin filtros; el XLSX añade registros institucionales y documentales cuando existen.`}</p>
        <div className="download-actions"><button className="primary-button" onClick={() => void handleDownload('csv')} disabled={busyDownload !== null || (downloadScope === 'selection' && !selectedVisibleRows.length)}><Download size={16} /> {busyDownload === 'csv' ? 'Generando…' : 'Descargar CSV'}</button><button className="secondary-button" onClick={() => void handleDownload('xlsx')} disabled={busyDownload !== null || (downloadScope === 'selection' && !selectedVisibleRows.length)}><Download size={16} /> {busyDownload === 'xlsx' ? 'Generando…' : 'Descargar XLSX'}</button></div>
        <p className="download-status" role="status">{downloadStatus || 'El manifiesto registra alcance, filtros, intervalo, conteos, versiones, licencias y advertencias.'}</p>
      </section>
      <footer className="explorer-footer">Las ausencias no son ceros. Las variaciones y composiciones absolutas son cálculos de presentación; no se añaden a las observaciones canónicas.</footer>
    </section>
  );
}
