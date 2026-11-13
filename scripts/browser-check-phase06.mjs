import { spawn } from 'node:child_process';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import readExcelFile from 'read-excel-file/node';

const root = new URL('../', import.meta.url);
const artifactPath = (name) => fileURLToPath(new URL(`../artifacts/${name}`, import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4174/');
      if (response.ok) return;
    } catch { /* El servidor está iniciando. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('El servidor temporal de fase 06 no inició.');
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  if (dimensions.page > dimensions.viewport) throw new Error(`Desbordamiento horizontal en ${label}: ${dimensions.page} > ${dimensions.viewport}.`);
}

async function downloadAndRead(page, buttonName, artifactName) {
  const event = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  const download = await event;
  const path = artifactPath(artifactName);
  await download.saveAs(path);
  return { buffer: await readFile(path), path, suggestedFilename: download.suggestedFilename() };
}

try {
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true });
  const errors = [];
  const notFound = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.url().startsWith('http://127.0.0.1:4174') && response.status() === 404) notFound.push(response.url()); });

  await page.goto('http://127.0.0.1:4174/#/pais/CHL', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Tabla de datos' }).click();
  await page.getByRole('heading', { name: 'Tabla de datos', level: 2 }).waitFor();
  const panel = page.getByRole('tabpanel', { name: 'Tabla de datos' });
  if (await panel.locator('tbody tr').count() < 20) throw new Error('La tabla de Chile no contiene las series reales esperadas.');
  await assertNoOverflow(page, 'tabla de Chile en escritorio');

  await page.getByLabel('Inicio del intervalo de tabla').fill('2000');
  await page.getByLabel('Fin del intervalo de tabla').fill('2024');
  await page.getByRole('tab', { name: 'Explorador histórico' }).click();
  if (await page.locator('.historical-explorer').getAttribute('data-view-start') !== '2000' || await page.locator('.historical-explorer').getAttribute('data-view-end') !== '2024') throw new Error('El explorador no conservó el intervalo de la tabla.');
  await page.getByRole('tab', { name: 'Tabla de datos' }).click();
  if (await page.getByLabel('Inicio del intervalo de tabla').inputValue() !== '2000') throw new Error('La tabla no conservó el intervalo compartido.');

  await page.getByLabel('Buscar indicadores').fill('PIB per cápita');
  if (await panel.locator('tbody tr').count() !== 1) throw new Error('La búsqueda no aisló la serie de PIB per cápita.');
  const cell2001 = panel.locator('[data-year="2001"][data-cell-status="available"]');
  await cell2001.click();
  await page.getByLabel('Ficha de PIB per cápita, PPA (constante 2021), 2001').waitFor();
  await page.getByLabel('Ficha de PIB per cápita, PPA (constante 2021), 2001').getByText('Ver procedencia del registro').click();
  await page.getByLabel('Ficha de PIB per cápita, PPA (constante 2021), 2001').getByText(/GDP_pc_PPP_2021/).first().waitFor();
  await cell2001.focus();
  await cell2001.press('ArrowRight');
  if (await page.evaluate(() => document.activeElement?.getAttribute('data-year')) !== '2002') throw new Error('La navegación por teclado entre años no funciona.');

  await page.getByLabel('Mostrar variación anual').check();
  if (await panel.locator('[data-variation-year="2000"]').textContent() !== '—') throw new Error('Se calculó variación sin año anterior.');
  if (await panel.locator('[data-variation-year="2001"]').textContent() === '—') throw new Error('No se calculó una variación consecutiva válida.');
  await page.getByLabel('Tipo de variación').selectOption('percent');
  await page.getByText(/exige denominador positivo/).waitFor();
  await page.screenshot({ path: artifactPath('fase-06-chile-tabla-desktop.png'), fullPage: true });
  await page.screenshot({ path: artifactPath('fase-06-chile-procedencia.png'), fullPage: false });

  await page.getByRole('button', { name: 'Deseleccionar todas' }).click();
  await page.getByRole('button', { name: 'Seleccionar visibles' }).click();
  const selection = await downloadAndRead(page, 'Descargar CSV', 'fase-06-seleccion-chile.csv');
  const selectionCsv = selection.buffer.toString('utf8');
  const selectionLines = selectionCsv.trim().split('\r\n');
  if (selectionLines.length !== 26 || !selectionLines[0].startsWith('country_code,country,year,series_id')) throw new Error('El CSV de selección no tiene las 25 observaciones y los campos estables esperados.');
  if (!selectionLines.slice(1).every((line) => line.startsWith('CHL,Chile,') && line.includes('gdp-per-capita-ppp-2021'))) throw new Error('El CSV de selección contiene registros fuera del alcance.');

  await page.getByRole('radio', { name: 'Categoría', exact: true }).check();
  await page.getByLabel('Categoría a descargar').selectOption('Actividad económica');
  const category = await downloadAndRead(page, 'Descargar CSV', 'fase-06-categoria-chile.csv');
  const categoryLines = category.buffer.toString('utf8').trim().split('\r\n');
  if (categoryLines.length < 2 || !categoryLines.slice(1).every((line) => line.startsWith('CHL,Chile,'))) throw new Error('La descarga de categoría incluye otro país o está vacía.');

  await page.getByRole('radio', { name: 'Módulo completo del país' }).check();
  const module = await downloadAndRead(page, 'Descargar XLSX', 'fase-06-modulo-chile.xlsx');
  if (module.buffer.subarray(0, 2).toString() !== 'PK') throw new Error('La descarga XLSX no es un archivo Open XML válido.');
  const workbook = await readExcelFile(module.buffer);
  const sheetNames = workbook.map((sheet) => sheet.sheet);
  for (const required of ['Matriz histórica', 'Datos largos', 'Diccionario', 'Fuentes y versiones', 'Notas metodológicas', 'Manifiesto', 'Presidencias', 'Legislatura', 'Judicial', 'Acontecimientos']) {
    if (!sheetNames.includes(required)) throw new Error(`Falta la hoja ${required} en el módulo completo.`);
  }
  const longSheet = workbook.find((sheet) => sheet.sheet === 'Datos largos');
  if (!longSheet || longSheet.data.length < 1300 || !longSheet.data.slice(1).every((row) => row[0] === 'CHL')) throw new Error('El XLSX completo no conserva las observaciones chilenas.');
  const manifest = workbook.find((sheet) => sheet.sheet === 'Manifiesto');
  if (!manifest?.data.some((row) => row[0] === 'Número de observaciones' && row[1] === longSheet.data.length - 1)) throw new Error('El manifiesto no coincide con los datos largos.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4174/#/pais/ARG', { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Descargar datos', exact: true }).click();
  await page.getByRole('heading', { name: 'Tabla de datos', level: 2 }).waitFor();
  await page.getByLabel('Buscar indicadores').fill('Huelgas generales');
  const argPanel = page.getByRole('tabpanel', { name: 'Tabla de datos' });
  if (await argPanel.locator('[data-year="1989"][data-cell-status="available"]').textContent() !== '0') throw new Error('El cero de huelgas no se conserva como cero.');
  if (await argPanel.locator('[data-year="1950"][data-cell-status="outside_coverage"]').count() !== 1) throw new Error('Argentina no distingue el año fuera de cobertura.');
  const matrix = page.getByRole('region', { name: 'Matriz histórica con desplazamiento horizontal' });
  const internalOverflow = await matrix.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (!internalOverflow) throw new Error('La matriz móvil no ofrece desplazamiento horizontal interno.');
  await assertNoOverflow(page, 'tabla de Argentina en móvil');
  await page.screenshot({ path: artifactPath('fase-06-argentina-tabla-mobile.png'), fullPage: true });
  await argPanel.locator('[data-year="1989"][data-cell-status="available"]').click();
  await page.getByLabel('Ficha de Huelgas generales, 1989').getByText(/Cero eventos registrados/).first().waitFor();
  await page.getByRole('button', { name: 'Cerrar ficha de celda' }).press('Enter');
  if (await page.getByLabel('Ficha de Huelgas generales, 1989').count()) throw new Error('La ficha no se cerró por teclado.');

  if (errors.length) throw new Error(`Errores del navegador: ${errors.join(' | ')}`);
  if (notFound.length) throw new Error(`Recursos no encontrados: ${notFound.join(' | ')}`);
  await Promise.all([selection.path, category.path, module.path].map((path) => unlink(path)));
  console.log('Fase 06 validada: selector y estado compartido, datos reales de Chile y Argentina, filtros, selección, variaciones, procedencia, teclado, CSV de selección y categoría, XLSX completo legible, escritorio, móvil, consola y desbordamientos.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
