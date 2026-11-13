import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const artifactPath = (name) => fileURLToPath(new URL(`../artifacts/${name}`, import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4173/');
      if (response.ok) return;
    } catch { /* Server is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('El servidor temporal no inició.');
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error(`Desbordamiento horizontal en ${label}.`);
}

async function assertSynchronized(page) {
  const domain = await page.locator('.historical-explorer').evaluate((element) => ({
    start: element.getAttribute('data-view-start'),
    end: element.getAttribute('data-view-end'),
    year: element.getAttribute('data-selected-year'),
  }));
  const bands = page.locator('[data-band]');
  if (await bands.count() !== 4) throw new Error('El explorador no contiene las cuatro bandas esperadas.');
  for (const band of await bands.all()) {
    if (await band.getAttribute('data-view-start') !== domain.start || await band.getAttribute('data-view-end') !== domain.end || await band.getAttribute('data-selected-year') !== domain.year) {
      throw new Error('Una banda perdió la sincronización temporal.');
    }
  }
}

async function assertComparableBands(page) {
  const heights = await page.locator('[data-band="economy"] .history-chart, [data-band="society"] .history-chart').evaluateAll((charts) => charts.map((chart) => chart.getBoundingClientRect().height));
  if (heights.length !== 2 || Math.max(...heights) - Math.min(...heights) > 2) throw new Error('Las visualizaciones principales no mantienen alturas comparables.');
}

async function assertBandAlignment(page) {
  if (await page.locator('[data-band="powers"] > .history-chart-scroll > .history-chart').count() !== 1) throw new Error('Poderes del Estado no usa un único lienzo principal.');
  if (await page.locator('[data-band="events"] > .history-chart-scroll > .history-chart').count() !== 1) throw new Error('Acontecimientos no usa un único lienzo.');
  const headings = await page.locator('.powers-section-headers h4').allTextContents();
  if (JSON.stringify(headings) !== JSON.stringify(['Poder Ejecutivo', 'Poder Legislativo', 'Poder Judicial'])) throw new Error('Los encabezados superiores de Poderes no están ordenados.');
  if (await page.locator('[data-band="powers"] > .history-chart-scroll .legislative-legend').count()) throw new Error('La leyenda legislativa sigue dentro de la línea temporal.');
  const trackLabels = await page.locator('[data-band="powers"] > .history-chart-scroll .power-track-label').allTextContents();
  if (JSON.stringify(trackLabels) !== JSON.stringify(['Administraciones Ejecutiva', 'Cámara alta', 'Cámara baja', 'Corte Suprema'])) throw new Error('Los carriles no conservan únicamente sus etiquetas indicadoras.');
  const alignment = await page.evaluate(() => {
    const powers = document.querySelector('[data-band="powers"] > .history-chart-scroll > .history-chart');
    const events = document.querySelector('[data-band="events"] > .history-chart-scroll > .history-chart');
    const baselines = [...document.querySelectorAll('.power-track-baseline, .event-category-baseline')].map((line) => [Number(line.getAttribute('x1')), Number(line.getAttribute('x2'))]);
    const cursor = (svg) => {
      const line = svg.querySelector('[data-shared-cursor]');
      return { x1: Number(line.getAttribute('x1')), x2: Number(line.getAttribute('x2')), screenX: line.getBoundingClientRect().x };
    };
    const ticks = (svg) => [...svg.querySelectorAll('.history-axis-tick')].map((tick) => ({ year: tick.textContent, x: Number(tick.querySelector('line').getAttribute('x1')) }));
    return { baselines, powersCursor: cursor(powers), eventsCursor: cursor(events), powersTicks: ticks(powers), eventsTicks: ticks(events) };
  });
  if (!alignment.baselines.length || alignment.baselines.some(([x1, x2]) => x1 !== 180 || x2 !== 1160)) throw new Error('Los carriles no comparten los límites horizontales.');
  if (alignment.powersCursor.x1 !== alignment.eventsCursor.x1 || alignment.powersCursor.x2 !== alignment.eventsCursor.x2 || Math.abs(alignment.powersCursor.screenX - alignment.eventsCursor.screenX) > 1) throw new Error('Los cursores de Poderes y Acontecimientos no están alineados.');
  if (JSON.stringify(alignment.powersTicks) !== JSON.stringify(alignment.eventsTicks)) throw new Error('Poderes y Acontecimientos no comparten las marcas de años.');
}

async function socialChartGeometry(page) {
  return page.locator('[data-band="society"] > .history-chart-scroll > .history-chart').evaluate((chart) => {
    const bounds = chart.getBoundingClientRect();
    return { top: bounds.top + window.scrollY, height: bounds.height };
  });
}

function assertSocialGeometry(actual, expected, label) {
  if (Math.abs(actual.top - expected.top) > 1 || Math.abs(actual.height - expected.height) > 1) throw new Error(`El gráfico social se desplazó al cambiar a ${label}.`);
}

try {
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  if (await page.locator('[data-country]').count() !== 18) throw new Error('El mapa no contiene 18 países.');
  const argLabel = await page.locator('[data-country="ARG"]').getAttribute('aria-label');
  if (!argLabel?.includes('26.772') || argLabel.includes('sin dato disponible')) throw new Error('Argentina no muestra su valor real de 2024.');
  await page.screenshot({ path: artifactPath('regional-desktop.png'), fullPage: true });
  await assertNoOverflow(page, 'mapa de escritorio');

  await page.locator('[data-country="CHL"]').press('Enter');
  await page.getByRole('heading', { name: 'Chile', level: 1 }).waitFor();
  if (await page.locator('[data-indicator-id="gdp-per-capita-ppp-2021"]').count() !== 26) throw new Error('La serie de Chile no contiene las 26 observaciones de PIB.');
  if (await page.locator('[data-series-area="total-population"]').count() !== 1) throw new Error('La población no aparece como un área por defecto.');
  if (await page.locator('[data-series-point][data-indicator-id="total-population"]').count()) throw new Error('La población conserva puntos anuales innecesarios.');
  if (await page.locator('[data-composition-group], [data-indicator-id="adult-literacy-rate"], [data-indicator-id="poverty-national-headcount"]').count()) throw new Error('Persisten visualizaciones sociales simultáneas.');
  if (await page.locator('[data-band="institutions"]').count()) throw new Error('Persiste la banda independiente de instituciones.');
  if (await page.locator('[data-legislative-track][data-status="loaded"]').count() !== 2) throw new Error('Las cámaras legislativas de Chile no están cargadas.');
  if (await page.locator('[data-legislative-segment]').count() !== 22) throw new Error('Chile no muestra los 22 segmentos legislativos documentados.');
  if (await page.locator('[data-relation="congress_absent_or_dissolved"]').count() !== 2) throw new Error('No se representa la ausencia de Congreso en ambas cámaras.');
  if (await page.locator('[data-relation="unknown"]').count() < 1) throw new Error('No se conserva la composición desconocida sin inferir mayorías.');
  if (await page.locator('[data-judicial-change]').count() !== 1) throw new Error('No aparece el único nodo judicial documentado.');
  await page.getByRole('button', { name: /Cámara alta, 1973-09-11 a 1990-03-11: Congreso ausente o disuelto/ }).press('Enter');
  await page.locator('.explorer-record-detail').getByRole('heading', { name: 'Cámara alta · Senado' }).waitFor();
  await page.locator('.explorer-record-detail').getByText('Congreso ausente o disuelto', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Corte Suprema de Chile, 1957-09-30/ }).press('Enter');
  await page.locator('.explorer-record-detail').getByRole('heading', { name: 'Corte Suprema de Chile' }).waitFor();
  await page.locator('.explorer-record-detail').getByText(/no implica una renovación completa/).waitFor();
  await page.getByLabel('Año seleccionado').fill('2024');
  await assertSynchronized(page);
  await assertComparableBands(page);
  await assertBandAlignment(page);
  if (await page.locator('.band-time-controls').count() !== 4) throw new Error('Faltan controles temporales locales.');
  await page.getByRole('button', { name: 'Acercar intervalo en Poderes del Estado' }).click();
  await assertSynchronized(page);
  await assertBandAlignment(page);
  await page.getByRole('button', { name: 'Desplazar hacia atrás en Economía' }).click();
  await assertSynchronized(page);
  await assertBandAlignment(page);
  await page.getByRole('button', { name: 'Restablecer vista completa' }).click();
  await assertBandAlignment(page);

  const socialGeometry = await socialChartGeometry(page);
  const populationArea = page.getByRole('button', { name: /Población total, área histórica/ });
  await populationArea.press('Enter');
  await page.locator('.explorer-record-detail').getByText('Población total', { exact: true }).first().waitFor();
  if (await page.locator('[data-derived-record]').count()) throw new Error('La población total original se marcó como derivada.');

  await page.getByLabel('Tema social').selectOption('age');
  assertSocialGeometry(await socialChartGeometry(page), socialGeometry, 'composición etaria');
  if (await page.locator('[data-composition-group="age"] [data-composition-area]').count() !== 3) throw new Error('La composición etaria no contiene sus tres áreas.');
  if (await page.locator('[data-composition-group="age"]').getAttribute('data-composition-mode') !== 'population') throw new Error('La composición no usa población absoluta por defecto.');
  if (await page.locator('[data-composition-group="age"] [data-value-kind="derived"]').count() !== 3) throw new Error('Las áreas absolutas no están identificadas como derivadas.');
  if (await page.locator('.composition-point').count()) throw new Error('Las composiciones conservan puntos anuales visibles.');
  await page.getByRole('button', { name: /Población de 0 a 14 años, población derivada/ }).press('Enter');
  const derivedDetail = page.locator('[data-derived-record]');
  await derivedDetail.getByText(/población del grupo = población total × porcentaje del grupo \/ 100/).waitFor();
  await derivedDetail.getByText('Población total original', { exact: true }).waitFor();
  await derivedDetail.getByText('Porcentaje original', { exact: true }).waitFor();
  if (await derivedDetail.locator('.provenance-detail').count() !== 2) throw new Error('El valor derivado no conserva ambas procedencias.');
  await page.screenshot({ path: artifactPath('chile-social-population.png'), fullPage: true });
  await page.getByRole('button', { name: 'Porcentaje', exact: true }).click();
  assertSocialGeometry(await socialChartGeometry(page), socialGeometry, 'porcentaje etario');
  if (await page.locator('[data-composition-group="age"]').getAttribute('data-composition-mode') !== 'percentage') throw new Error('La alternancia a porcentaje no funciona.');
  if (await page.locator('[data-composition-group="age"] [data-value-kind="original"]').count() !== 3) throw new Error('Los porcentajes no conservan las series originales.');
  await page.getByRole('button', { name: 'Población', exact: true }).click();
  assertSocialGeometry(await socialChartGeometry(page), socialGeometry, 'población etaria');
  await page.getByLabel('Tema social').selectOption('residence');
  assertSocialGeometry(await socialChartGeometry(page), socialGeometry, 'urbano-rural');
  if (await page.locator('[data-composition-group="residence"] [data-composition-area]').count() !== 2) throw new Error('La composición urbano-rural no contiene sus dos áreas.');
  if (await page.locator('[data-composition-group="residence"]').getAttribute('data-composition-mode') !== 'population') throw new Error('Urbano-rural no conserva el modo de población.');
  await page.getByLabel('Tema social').selectOption('education');
  if (await page.locator('[data-indicator-id="adult-literacy-rate"]').count() !== 7) throw new Error('La alfabetización de Chile no contiene sus siete observaciones.');
  await page.getByLabel('Tema social').selectOption('poverty');
  if (await page.locator('[data-indicator-id="poverty-national-headcount"]').count() !== 16) throw new Error('La pobreza nacional de Chile no contiene sus 16 observaciones.');
  await page.getByLabel('Metodología de pobreza').selectOption('poverty-international-3-2021ppp');
  if (await page.locator('[data-indicator-id="poverty-national-headcount"]').count()) throw new Error('Las metodologías de pobreza se combinaron.');
  if (await page.locator('[data-indicator-id="poverty-international-3-2021ppp"]').count() !== 17) throw new Error('La pobreza internacional de Chile no contiene sus 17 observaciones.');
  const segments = await page.locator('[data-social-line="poverty-international-3-2021ppp"] path[data-segment-years]').evaluateAll((paths) => paths.map((path) => path.getAttribute('data-segment-years').split(',').map(Number)));
  for (const segment of segments) {
    for (let index = 1; index < segment.length; index += 1) {
      if (segment[index] !== segment[index - 1] + 1) throw new Error('Una línea de pobreza cruzó un vacío de cobertura.');
    }
  }
  await page.getByRole('button', { name: /Chile, 1990: 16 % de la población/ }).press('Enter');
  const chilePovertyDetail = page.locator('.explorer-record-detail');
  await chilePovertyDetail.getByText('Línea internacional: USD 3,00 por persona y día · PPA 2021', { exact: true }).waitFor();
  await chilePovertyDetail.getByRole('heading', { name: '1990 · 16' }).waitFor();

  await page.getByLabel('Tema económico').selectOption('gdp-total');
  if (await page.locator('[data-indicator-id="gdp-total-constant-2015-usd"]').count() !== 66) throw new Error('El PIB total real de Chile no contiene sus 66 observaciones.');
  if (await page.locator('[data-indicator-id="gdp-per-capita-ppp-2021"]').count()) throw new Error('Se mezclaron PIB total y PIB per cápita.');
  await page.getByLabel('Tema económico').selectOption('gdp-composition');
  if (await page.locator('[data-gdp-composition]').getAttribute('data-series-count') !== '3') throw new Error('La composición del PIB no contiene sus tres líneas.');
  if (await page.locator('[data-gdp-composition] [data-series-point]').count() !== 198) throw new Error('La composición del PIB no conserva las 66 observaciones por componente.');
  await page.getByLabel('Tema económico').selectOption('historical-lines');
  if (await page.locator('[data-economic-lines]').getAttribute('data-series-count') !== '1') throw new Error('La selección económica individual no está activa.');
  if (await page.getByLabel('Segunda serie económica').inputValue() !== '') throw new Error('Se agregó una segunda serie sin selección.');
  if (await page.getByLabel('Segunda serie económica').locator('option').count() !== 13) throw new Error('Las series económicas cargadas no coinciden con el inventario.');
  await page.getByLabel('Segunda serie económica').selectOption('inflation-cpi-annual');
  if (await page.locator('[data-economic-lines]').getAttribute('data-series-count') !== '2') throw new Error('La superposición de dos series reales no funciona.');
  await page.getByRole('note').filter({ hasText: 'Los ejes tienen escalas independientes' }).waitFor();

  await page.getByLabel('Tema social').selectOption('employment');
  if (await page.locator('[data-composition-group="employment"] [data-value-kind="source_estimate"]').count() !== 3) throw new Error('El empleo OIT no está identificado como estimación de fuente.');
  await page.getByRole('button', { name: /Empleo · agricultura, estimación modelada OIT/ }).press('Enter');
  await page.locator('.explorer-record-detail').getByText(/Estimación de fuente · no observación directa/).waitFor();
  await page.getByLabel('Incluir derivados y estimaciones de fuente').uncheck();
  if (await page.locator('[data-value-origin="source_estimate"], [data-value-kind="source_estimate"], [data-value-kind="derived"]').count()) throw new Error('El filtro deja estimaciones o derivados visibles.');
  if (await page.locator('[data-indicator-id="gdp-per-capita-ppp-2021"]').count() !== 26) throw new Error('El filtro ocultó observaciones económicas directas.');
  await page.locator('.explorer-record-detail').getByText('Selecciona un registro para abrir su ficha', { exact: true }).waitFor();
  await page.getByLabel('Tema social').selectOption('age');
  if (await page.locator('[data-composition-group="age"] [data-value-kind="original"]').count() !== 3) throw new Error('El filtro no conserva los porcentajes sociales originales.');
  await page.screenshot({ path: artifactPath('chile-solo-observaciones-directas.png'), fullPage: true });
  await page.getByLabel('Incluir derivados y estimaciones de fuente').check();
  await page.getByLabel('Tema social').selectOption('population');

  if (await page.locator('[data-event-category]').count() !== 7) throw new Error('Las siete categorías de acontecimientos no están separadas.');
  if (await page.locator('[data-event-category="elections"]').getAttribute('data-event-count') !== '19') throw new Error('No se cargaron las 19 elecciones documentales de Chile.');
  if (await page.locator('[data-temporal-type="annual_aggregate"][data-count="0"]').count()) throw new Error('Los ceros de huelgas generan nodos.');
  const strikeCounts = await page.locator('[data-temporal-type="annual_aggregate"]').evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-count'))));
  if (!strikeCounts.length || strikeCounts.some((count) => count <= 0)) throw new Error('Los agregados anuales visibles no son positivos.');
  await page.locator('[data-event-kind="election"]').first().press('Enter');
  await page.locator('.explorer-record-detail').getByText(/Acontecimiento documental/).waitFor();
  await page.locator('.explorer-record-detail').getByText('Fecha exacta documentada', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Crisis Vertical, 2019-10-18/ }).press('Enter');
  await page.locator('.explorer-record-detail').getByRole('heading', { name: '2019-10-18 → 2019-12-19' }).waitFor();
  await page.locator('.explorer-record-detail').getByText(/62 días · 2019-10-25 · confianza alta/).waitFor();
  await page.locator('.explorer-record-detail > div > .provenance-detail > summary').click();
  await page.locator('.explorer-record-detail').getByText('Base_Final_RCP_v6.xlsx · hoja crisis · fila 15', { exact: true }).waitFor();
  await page.screenshot({ path: artifactPath('chile-desktop.png'), fullPage: true });
  await assertNoOverflow(page, 'Chile de escritorio');

  await page.getByRole('button', { name: 'Volver al mapa regional' }).press('Enter');
  await page.getByLabel('Variable de exploración').selectOption('general-strikes');
  await page.getByLabel('Año seleccionado').fill('1989');
  const zeroLabel = await page.locator('[data-country="ARG"]').getAttribute('aria-label');
  if (!zeroLabel?.includes('0 · eventos por año')) throw new Error('El mapa no distingue el cero de huelgas.');
  await page.getByLabel('Año seleccionado').fill('1950');
  const outsideLabel = await page.locator('[data-country="ARG"]').getAttribute('aria-label');
  if (!outsideLabel?.includes('fuera de cobertura')) throw new Error('El año fuera de cobertura no está identificado.');

  await page.getByRole('button', { name: 'Metodología' }).press('Enter');
  await page.getByRole('heading', { name: '32 indicadores configurados' }).waitFor();
  await page.screenshot({ path: artifactPath('metodologia-desktop.png'), fullPage: true });
  await assertNoOverflow(page, 'metodología de escritorio');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' });
  await page.getByLabel('Variable de exploración').selectOption('gdp-per-capita-ppp-2021');
  await page.screenshot({ path: artifactPath('regional-mobile.png'), fullPage: true });
  await assertNoOverflow(page, 'mapa móvil');
  await page.locator('[data-country="ARG"]').press('Enter');
  await page.getByRole('heading', { name: 'Argentina', level: 1 }).waitFor();
  await assertBandAlignment(page);
  const mobileSocialGeometry = await socialChartGeometry(page);
  await page.getByLabel('Tema social').selectOption('age');
  assertSocialGeometry(await socialChartGeometry(page), mobileSocialGeometry, 'composición etaria móvil');
  await page.getByRole('button', { name: 'Porcentaje', exact: true }).click();
  assertSocialGeometry(await socialChartGeometry(page), mobileSocialGeometry, 'porcentaje etario móvil');
  await page.getByRole('button', { name: 'Población', exact: true }).click();
  await page.getByLabel('Tema social').selectOption('residence');
  assertSocialGeometry(await socialChartGeometry(page), mobileSocialGeometry, 'urbano-rural móvil');
  await page.getByLabel('Tema social').selectOption('population');
  assertSocialGeometry(await socialChartGeometry(page), mobileSocialGeometry, 'población total móvil');
  if (await page.locator('[data-series-point][data-indicator-id="total-population"]').count()) throw new Error('La población móvil contiene puntos innecesarios.');
  await page.getByRole('button', { name: /Argentina, 2000: 22\.281/ }).press('Enter');
  await page.locator('.explorer-record-detail > div > .provenance-detail > summary').click();
  await page.locator('.explorer-record-detail').getByText('variables_economicas.csv · fila 2', { exact: true }).waitFor();
  await page.getByLabel('Tema social').selectOption('poverty');
  await page.getByRole('button', { name: /Argentina, 2024: 38,1 % de la población/ }).press('Enter');
  const argPovertyDetail = page.locator('.explorer-record-detail');
  await argPovertyDetail.getByText('Línea nacional de pobreza', { exact: true }).waitFor();
  await argPovertyDetail.getByRole('heading', { name: '2024 · 38,1' }).waitFor();
  if (await argPovertyDetail.locator('.provenance-detail').getAttribute('open') === null) await argPovertyDetail.locator('.provenance-detail > summary').click();
  await argPovertyDetail.getByText('SI.POV.NAHC', { exact: true }).waitFor();

  await page.getByRole('button', { name: '1986 · 2 huelgas generales registradas. Agregado anual sin fechas individuales.' }).press('Enter');
  await page.locator('.explorer-record-detail').getByRole('heading', { name: '1986 · 2 huelgas generales registradas' }).waitFor();
  await page.locator('.explorer-record-detail').getByText(/centro gráfico del año solo como convención visual/).waitFor();
  if (await page.locator('[data-temporal-type="annual_aggregate"][data-year="1989"]').count()) throw new Error('El cero de 1989 genera un nodo.');
  await page.screenshot({ path: artifactPath('argentina-mobile.png'), fullPage: true });
  await assertNoOverflow(page, 'Argentina móvil');

  await page.getByLabel('Tema económico').selectOption('historical-lines');
  await page.screenshot({ path: artifactPath('argentina-mobile-lines.png'), fullPage: true });
  await assertComparableBands(page);
  await assertNoOverflow(page, 'ejes económicos móviles');
  await page.getByLabel('Año seleccionado').fill('2025');
  await page.locator('.history-accessible-records > details').first().locator('summary').click();
  await page.getByText(/Fuera de la cobertura efectiva de la fuente \(2000–2024\)/).waitFor();
  if (await page.locator('[data-indicator-id="electoral-democracy"][data-year="2025"]').count()) throw new Error('Se inventó un punto V-Dem para 2025.');
  if (await page.locator('[data-indicator-id="total-population"][data-year="1959"]').count()) throw new Error('Se inventó población para 1959.');
  if (await page.locator('[data-temporal-type="annual_aggregate"][data-year="2020"]').count()) throw new Error('Se inventó un agregado de huelgas para 2020.');
  const canvas = page.getByRole('region', { name: /Lienzo histórico de Argentina/ });
  await canvas.focus();
  await canvas.press('ArrowLeft');
  if (await page.locator('.historical-explorer').getAttribute('data-selected-year') !== '2024') throw new Error('El teclado no actualizó el año compartido.');
  await assertSynchronized(page);
  await page.getByLabel('Tema social').selectOption('population');
  await page.getByRole('button', { name: /Población total, área histórica/ }).click();
  await page.locator('.explorer-record-detail').getByText('Población total', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Acercar intervalo en Acontecimientos' }).click();
  await assertSynchronized(page);
  await assertNoOverflow(page, 'Argentina móvil tras interactuar');

  if (errors.length) throw new Error(`Errores del navegador: ${errors.join(' | ')}`);
  console.log('Validación superada: cuatro bandas, tres poderes sin datos ficticios, áreas seleccionables sin puntos anuales, composiciones absolutas y porcentuales con doble procedencia, pobreza y alfabetización, economía real y doble eje aislado, acontecimientos por categoría sin ceros, controles locales sincronizados, teclado, escritorio, móvil, consola y desbordamientos.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
