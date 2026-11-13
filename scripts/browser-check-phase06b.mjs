import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const artifactPath = (name) => fileURLToPath(new URL(`../artifacts/${name}`, import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4175/');
      if (response.ok) return;
    } catch { /* El servidor está iniciando. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('El servidor temporal de fase 06B no inició.');
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  if (dimensions.page > dimensions.viewport) throw new Error(`Desbordamiento horizontal en ${label}: ${dimensions.page} > ${dimensions.viewport}.`);
}

async function visibleYearCount(page) {
  return page.locator('.data-matrix-scroll').evaluate((scroller) => {
    const indicator = scroller.querySelector('thead .indicator-column').getBoundingClientRect();
    const bounds = scroller.getBoundingClientRect();
    return [...scroller.querySelectorAll('thead .year-heading')].filter((heading) => {
      const rect = heading.getBoundingClientRect();
      return rect.left >= indicator.right - 1 && rect.right <= bounds.right + 1;
    }).length;
  });
}

async function assertAxesOutsidePlot(page, selector, right = false) {
  const chart = page.locator(selector);
  if (await chart.locator('[data-axis-side="left"]').count() !== 3) throw new Error(`${selector}: el eje izquierdo no tiene tres marcas.`);
  if (await chart.locator('[data-axis-side="right"]').count() !== (right ? 3 : 0)) throw new Error(`${selector}: el eje derecho no coincide con el modo esperado.`);
  const structure = await chart.evaluate((element) => {
    const axes = [...element.querySelectorAll('[data-axis-side], [data-axis-title]')];
    const labels = [...element.querySelectorAll('.economic-axis text, .economic-axis-title')];
    return {
      clippedAxes: axes.filter((axis) => axis.closest('g[clip-path]')).length,
      emptyLabels: labels.filter((label) => !label.textContent?.trim()).length,
      cutLabels: labels.filter((label) => {
        const box = label.getBBox();
        return box.x < 0 || box.y < 0 || box.x + box.width > 1200 || box.y + box.height > 225;
      }).length,
      plotClip: element.querySelector('[data-economic-plot]')?.getAttribute('clip-path') ?? '',
      leftUnit: element.querySelector('[data-axis-side="left"]')?.getAttribute('data-axis-unit') ?? '',
      rightUnit: element.querySelector('[data-axis-side="right"]')?.getAttribute('data-axis-unit') ?? '',
      leftTitle: element.querySelector('[data-axis-title="left"]')?.textContent ?? '',
      rightTitle: element.querySelector('[data-axis-title="right"]')?.textContent ?? '',
    };
  });
  if (structure.clippedAxes || structure.emptyLabels || structure.cutLabels) throw new Error(`${selector}: ejes recortados, recortados por el grupo de datos o etiquetas fuera del SVG.`);
  if (!structure.plotClip.includes('history-')) throw new Error(`${selector}: el área de datos no conserva su recorte.`);
  if (!structure.leftUnit || !structure.leftTitle.includes(structure.leftUnit)) throw new Error(`${selector}: unidad del eje izquierdo incoherente.`);
  if (right && (!structure.rightUnit || !structure.rightTitle.includes(structure.rightUnit))) throw new Error(`${selector}: unidad del eje derecho incoherente.`);
}

try {
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  const notFound = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.url().startsWith('http://127.0.0.1:4175') && response.status() === 404) notFound.push(response.url()); });

  await page.goto('http://127.0.0.1:4175/#/pais/CHL', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Tabla de datos' }).click();
  await page.getByLabel('Inicio del intervalo de tabla').fill('2000');
  await page.getByLabel('Fin del intervalo de tabla').fill('2024');
  await page.getByLabel('Buscar indicadores').fill('PIB per cápita');
  const table = page.locator('table.data-matrix');
  if (await table.locator('thead .sticky-column').count() !== 1 || await table.locator('thead .sticky-column').textContent() !== 'Indicador') throw new Error('La vista esencial no fija únicamente Indicador.');
  if (!await table.locator('.data-matrix-main-head > th').nth(1).evaluate((cell) => cell.classList.contains('year-heading'))) throw new Error('Los años no siguen inmediatamente a Indicador.');
  if (await visibleYearCount(page) < 8) throw new Error('La tabla esencial de escritorio muestra menos de ocho años.');
  await page.screenshot({ path: artifactPath('fase-06b-tabla-esencial-desktop.png'), fullPage: true });

  const selection = page.getByRole('checkbox', { name: /Activar PIB per cápita/ });
  await selection.uncheck();
  await page.getByLabel('Mostrar columnas metodológicas').check();
  if (await table.locator('thead .metadata-column').count() !== 6) throw new Error('No se desplegaron las seis columnas metodológicas.');
  const metadataFixed = await table.locator('thead .metadata-column').evaluateAll((columns) => columns.filter((column) => column.classList.contains('sticky-column') || getComputedStyle(column).left !== 'auto').length);
  if (metadataFixed) throw new Error('Una columna metodológica quedó fija horizontalmente.');
  if (await selection.isChecked() || await page.getByLabel('Buscar indicadores').inputValue() !== 'PIB per cápita') throw new Error('El despliegue metodológico alteró selección o filtros.');
  await page.screenshot({ path: artifactPath('fase-06b-tabla-metadatos-desktop.png'), fullPage: true });
  await page.getByLabel('Mostrar columnas metodológicas').uncheck();
  await selection.check();

  await page.getByRole('tab', { name: 'Explorador histórico' }).click();
  const economy = page.locator('[data-band="economy"]');
  await assertAxesOutsidePlot(page, '[data-band="economy"] [data-economic-single]');
  await economy.screenshot({ path: artifactPath('fase-06b-economia-eje-unico.png') });

  await page.getByLabel('Tema económico').selectOption('historical-lines');
  await page.getByLabel('Segunda serie económica').selectOption('inflation-cpi-annual');
  await assertAxesOutsidePlot(page, '[data-band="economy"] [data-economic-lines]', true);
  await economy.screenshot({ path: artifactPath('fase-06b-economia-doble-eje.png') });

  await page.getByLabel('Tema económico').selectOption('gdp-composition');
  await assertAxesOutsidePlot(page, '[data-band="economy"] [data-gdp-composition]');
  if (await economy.locator('[data-axis-title="left"]').textContent() !== 'Componentes por actividad · % del PIB') throw new Error('La composición no conserva su título y unidad común.');
  await economy.screenshot({ path: artifactPath('fase-06b-composicion-economica.png') });

  await page.getByLabel('Tema económico').selectOption('gdp-total');
  await page.getByRole('button', { name: 'Restablecer vista completa' }).click();
  await assertAxesOutsidePlot(page, '[data-band="economy"] [data-economic-single]');

  await page.goto('http://127.0.0.1:4175/#/pais/ARG', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Argentina', level: 1 }).waitFor();
  await page.getByLabel('Tema económico').selectOption('gdp-per-capita');
  await assertAxesOutsidePlot(page, '[data-band="economy"] [data-economic-single]');
  await assertNoOverflow(page, 'economía de Argentina');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Tabla de datos' }).click();
  await page.getByLabel('Buscar indicadores').fill('PIB per cápita');
  if (await visibleYearCount(page) < 1) throw new Error('La tabla móvil no muestra ningún año junto al indicador compacto.');
  const internalOverflow = await page.locator('.data-matrix-scroll').evaluate((element) => element.scrollWidth > element.clientWidth);
  if (!internalOverflow) throw new Error('La tabla móvil perdió el desplazamiento horizontal interno.');
  await assertNoOverflow(page, 'tabla esencial móvil');
  await page.screenshot({ path: artifactPath('fase-06b-tabla-mobile.png'), fullPage: true });

  if (errors.length) throw new Error(`Errores del navegador: ${errors.join(' | ')}`);
  if (notFound.length) throw new Error(`Recursos no encontrados: ${notFound.join(' | ')}`);
  console.log('Fase 06B validada: tabla esencial con ocho o más años en escritorio, metadatos opcionales no fijos, tabla móvil con años visibles, ejes simples y dobles fuera del recorte, unidades coherentes, composición, intervalos y ambos países; consola y desbordamientos correctos.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
