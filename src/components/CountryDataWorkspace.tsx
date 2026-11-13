import { useState } from 'react';
import { ChartNoAxesCombined, Download, TableProperties } from 'lucide-react';
import { CURRENT_YEAR, START_YEAR } from '../App';
import { DataTableView } from './DataTableView';
import { HistoricalExplorer } from './HistoricalExplorer';

const MIN_INTERVAL = 4;
type CountryViewMode = 'explorer' | 'table';

interface CountryDataWorkspaceProps {
  countryCode: 'ARG' | 'CHL';
  year: number;
  setYear: (year: number) => void;
  setIndicatorId: (id: string) => void;
}

export function CountryDataWorkspace({ countryCode, year, setYear, setIndicatorId }: CountryDataWorkspaceProps) {
  const [mode, setMode] = useState<CountryViewMode>('explorer');
  const [hasOpenedTable, setHasOpenedTable] = useState(false);
  const [viewStart, setViewStart] = useState(START_YEAR);
  const [viewEnd, setViewEnd] = useState(CURRENT_YEAR);
  const [includeDerivedAndEstimates, setIncludeDerivedAndEstimates] = useState(true);

  const applyDomain = (start: number, end: number) => {
    const safeStart = Math.max(START_YEAR, Math.min(start, CURRENT_YEAR - MIN_INTERVAL + 1));
    const safeEnd = Math.min(CURRENT_YEAR, Math.max(end, safeStart + MIN_INTERVAL - 1));
    setViewStart(safeStart);
    setViewEnd(safeEnd);
    if (year < safeStart || year > safeEnd) setYear(Math.max(safeStart, Math.min(safeEnd, year)));
  };

  const selectMode = (nextMode: CountryViewMode) => {
    if (nextMode === 'table') setHasOpenedTable(true);
    setMode(nextMode);
  };

  const openDownloads = () => {
    selectMode('table');
    window.setTimeout(() => document.getElementById('data-downloads')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <section className="country-data-workspace" aria-label="Visualizaciones de datos del país">
      <div className="country-view-switcher">
        <div role="tablist" aria-label="Selector de visualización" onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const nextMode = mode === 'explorer' ? 'table' : 'explorer';
          selectMode(nextMode);
          document.getElementById(`tab-${nextMode}`)?.focus();
        }}>
          <button id="tab-explorer" role="tab" aria-selected={mode === 'explorer'} aria-controls="panel-explorer" tabIndex={mode === 'explorer' ? 0 : -1} className={mode === 'explorer' ? 'active' : ''} onClick={() => selectMode('explorer')}><ChartNoAxesCombined size={18} /> Explorador histórico</button>
          <button id="tab-table" role="tab" aria-selected={mode === 'table'} aria-controls="panel-table" tabIndex={mode === 'table' ? 0 : -1} className={mode === 'table' ? 'active' : ''} onClick={() => selectMode('table')}><TableProperties size={18} /> Tabla de datos</button>
        </div>
        <button className="download-entry" onClick={openDownloads}><Download size={17} /> Descargar datos</button>
      </div>
      <div id="panel-explorer" role="tabpanel" aria-labelledby="tab-explorer" hidden={mode !== 'explorer'}>
        <HistoricalExplorer countryCode={countryCode} year={year} setYear={setYear} setIndicatorId={setIndicatorId} viewStart={viewStart} viewEnd={viewEnd} setViewStart={setViewStart} setViewEnd={setViewEnd} includeDerivedAndEstimates={includeDerivedAndEstimates} setIncludeDerivedAndEstimates={setIncludeDerivedAndEstimates} />
      </div>
      <div id="panel-table" role="tabpanel" aria-labelledby="tab-table" hidden={mode !== 'table'}>
        {hasOpenedTable && <DataTableView countryCode={countryCode} viewStart={viewStart} viewEnd={viewEnd} onIntervalChange={applyDomain} includeDerivedAndEstimates={includeDerivedAndEstimates} setIncludeDerivedAndEstimates={setIncludeDerivedAndEstimates} setYear={setYear} setIndicatorId={setIndicatorId} />}
      </div>
    </section>
  );
}
