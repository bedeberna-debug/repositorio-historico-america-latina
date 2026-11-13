import { describe, expect, it } from 'vitest';
import writeExcelFile from 'write-excel-file/node';
import readExcelFile from 'read-excel-file/node';
import { buildTableSeries } from '../utils/dataTable';
import { buildExportPackage, CSV_FIELDS } from '../utils/downloads';
import { CURRENT_YEAR, START_YEAR } from '../App';

const baseInput = {
  startYear: 2000,
  endYear: 2002,
  filters: { búsqueda: 'Todas' },
  generatedAt: '2026-11-04T12:00:00.000Z',
};

describe('descargas de la fase 06', () => {
  it('exporta la selección en CSV largo con campos estables y valores de procedencia', () => {
    const row = buildTableSeries('ARG', false).find((item) => item.indicator.id === 'gdp-per-capita-ppp-2021')!;
    const pack = buildExportPackage({ ...baseInput, rows: [row], countryCode: 'ARG', scope: 'selection', scopeLabel: 'Selección actual' });
    expect(pack.longRecords).toHaveLength(3);
    expect(pack.longRecords.every((record) => record.country_code === 'ARG')).toBe(true);
    expect(pack.longRecords.map((record) => record.year)).toEqual([2000, 2001, 2002]);
    expect(pack.longRecords[0]).toMatchObject({ indicator_id: 'gdp-per-capita-ppp-2021', verification_status: 'verified', source_file: 'variables_economicas.csv' });
    const lines = pack.csv.split('\r\n');
    expect(lines[0]).toBe(CSV_FIELDS.join(','));
    expect(lines).toHaveLength(4);
    expect(pack.csv).toContain('variables_economicas.csv');
    expect(pack.csv).toContain('Cotejado con el original');
    expect(pack.csv).not.toContain('verificación externa positiva');
  });

  it('exporta una categoría completa sin depender de la activación individual', () => {
    const rows = buildTableSeries('CHL').filter((row) => row.indicator.theme === 'Actividad económica');
    const pack = buildExportPackage({ ...baseInput, rows, countryCode: 'CHL', scope: 'category', scopeLabel: 'Categoría: Actividad económica' });
    expect(pack.manifest.seriesCount).toBe(rows.length);
    expect(pack.longRecords.length).toBeGreaterThan(0);
    expect(pack.longRecords.every((record) => record.theme === 'Actividad económica' && record.country_code === 'CHL')).toBe(true);
    expect(pack.sheets.find((sheet) => sheet.sheet === 'Presidencias')).toBeUndefined();
  });

  it('incluye estructuras propias solo en el módulo completo y solo cuando existen', () => {
    const chile = buildExportPackage({ rows: buildTableSeries('CHL'), countryCode: 'CHL', scope: 'module', scopeLabel: 'Módulo completo', startYear: START_YEAR, endYear: CURRENT_YEAR, filters: {}, generatedAt: baseInput.generatedAt });
    expect(chile.sheets.map((sheet) => sheet.sheet)).toEqual(expect.arrayContaining(['Matriz histórica', 'Datos largos', 'Diccionario', 'Fuentes y versiones', 'Notas metodológicas', 'Manifiesto', 'Presidencias', 'Legislatura', 'Judicial', 'Acontecimientos']));
    expect(chile.longRecords.every((record) => record.country_code === 'CHL')).toBe(true);
    const argentina = buildExportPackage({ rows: buildTableSeries('ARG'), countryCode: 'ARG', scope: 'module', scopeLabel: 'Módulo completo', startYear: START_YEAR, endYear: CURRENT_YEAR, filters: {}, generatedAt: baseInput.generatedAt });
    expect(argentina.sheets.some((sheet) => sheet.sheet === 'Legislatura' || sheet.sheet === 'Judicial')).toBe(false);
    expect(argentina.sheets.some((sheet) => sheet.sheet === 'Presidencias')).toBe(true);
    expect(argentina.longRecords.every((record) => record.country_code === 'ARG')).toBe(true);
  });

  it('registra manifiesto, intervalo, conteos, versiones, licencias y advertencias', () => {
    const rows = buildTableSeries('ARG').slice(0, 3);
    const pack = buildExportPackage({ ...baseInput, rows, countryCode: 'ARG', scope: 'selection', scopeLabel: 'Selección actual' });
    expect(pack.manifest).toMatchObject({ countryCode: 'ARG', startYear: 2000, endYear: 2002, seriesCount: 3, generatedAt: baseInput.generatedAt });
    expect(pack.manifest.observationCount).toBe(pack.longRecords.length);
    expect(pack.manifest.sourceVersions.length).toBeGreaterThan(0);
    expect(pack.manifest.licenses.length).toBeGreaterThan(0);
    expect(pack.manifest.warnings).toContain('no verificación externa');
  });

  it('genera un XLSX real y legible con todas las hojas y metadatos', async () => {
    const pack = buildExportPackage({ rows: buildTableSeries('CHL'), countryCode: 'CHL', scope: 'module', scopeLabel: 'Módulo completo', startYear: 2000, endYear: 2002, filters: {}, generatedAt: baseInput.generatedAt });
    const buffer = await writeExcelFile(pack.sheets).toBuffer();
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const sheets = await readExcelFile(buffer);
    expect(sheets.map((sheet) => sheet.sheet)).toEqual(pack.sheets.map((sheet) => sheet.sheet));
    const longSheet = sheets.find((sheet) => sheet.sheet === 'Datos largos')!;
    expect(longSheet.data[0]).toEqual([...CSV_FIELDS]);
    expect(longSheet.data.length).toBe(pack.longRecords.length + 1);
    const manifest = sheets.find((sheet) => sheet.sheet === 'Manifiesto')!;
    expect(manifest.data).toContainEqual(['Fecha de generación', baseInput.generatedAt]);
    expect(manifest.data).toContainEqual(['Número de observaciones', pack.longRecords.length]);
  }, 20000);
});
