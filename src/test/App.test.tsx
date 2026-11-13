import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const currentYear = new Date().getFullYear();

function countryExplorer() {
  return document.querySelector('.historical-explorer') as HTMLElement;
}

describe('navegación y visualización regional', () => {
  beforeEach(() => { window.location.hash = ''; });

  it('identifica los 18 países en el mapa interactivo', () => {
    render(<App />);
    const map = screen.getByRole('group', { name: /Mapa de 18 países/ });
    expect(within(map).getAllByRole('button')).toHaveLength(18);
  });

  it('colorea Argentina y Chile con valores reales y no los anuncia como sin dato', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^Argentina: 26\.772/ })).toHaveAttribute('data-country', 'ARG');
    expect(screen.getByRole('button', { name: /^Chile: 30\.267/ })).toHaveAttribute('data-country', 'CHL');
    expect(screen.getByText('1873')).toBeInTheDocument();
    expect(screen.getByText('Fase 06 · tabla de datos y descargas verificables')).toBeInTheDocument();
  });

  it('mantiene fuera de cobertura los años sin observaciones', () => {
    render(<App />);
    const year = screen.getByLabelText('Año seleccionado');
    fireEvent.change(year, { target: { value: '1950' } });
    expect(year).toHaveValue('1950');
    expect(screen.getByRole('button', { name: /^Argentina: Sin dato disponible · fuera de cobertura/ })).toBeInTheDocument();
  });

  it('adapta la leyenda a conteos y episodios de crisis', async () => {
    const user = userEvent.setup();
    render(<App />);
    const selector = screen.getByLabelText('Variable de exploración');
    await user.selectOptions(selector, 'general-strikes');
    expect(screen.getByText(/0 eventos registrados/)).toBeInTheDocument();
    expect(screen.getByText(/1–4 eventos/)).toBeInTheDocument();
    await user.selectOptions(selector, 'presidential-crises');
    expect(screen.getByText(/Los episodios se consultan por fechas/)).toBeInTheDocument();
    expect(screen.getByText(/no se fuerza a una agregación anual/)).toBeInTheDocument();
  });

  it('distingue los otros países como no cargados en esta fase', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Bolivia: Sin dato cargado en esta fase/ }));
    expect(screen.getByRole('complementary', { name: 'Información de Bolivia' })).toBeInTheDocument();
    expect(screen.getByText(/Sin dato cargado en esta fase · 2024/)).toBeInTheDocument();
  });

  it('permite consultar unidades, fuentes y metadatos pendientes en metodología', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Metodología/ }));
    expect(await screen.findByRole('heading', { name: '32 indicadores configurados' })).toBeInTheDocument();
    expect(screen.getByText('variables_economicas.csv')).toBeInTheDocument();
    expect(screen.getAllByText('No confirmada').length).toBeGreaterThan(0);
    expect(screen.getByText(/Martínez, Christopher A\. \(2020\)/)).toBeInTheDocument();
  });
});

describe('explorador histórico ampliado de la fase 05', () => {
  beforeEach(() => { window.location.hash = '#/pais/ARG'; });

  it('abre Argentina desde el mapa con el explorador integrado', async () => {
    window.location.hash = '';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Argentina: 26\.772/ }));
    expect(await screen.findByRole('heading', { name: 'Argentina', level: 1 })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/pais/ARG');
    expect(screen.getByRole('region', { name: 'Lienzo histórico de Argentina' })).toBeInTheDocument();
    expect(screen.getByText('Fase 06 · Tabla de datos y descargas verificables')).toBeInTheDocument();
  });

  it('abre Chile por teclado y conserva fechas de períodos y crisis en la consulta accesible', async () => {
    window.location.hash = '';
    const user = userEvent.setup();
    render(<App />);
    const chile = screen.getByRole('button', { name: /^Chile: 30\.267/ });
    chile.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'Chile', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('1990-03-11 → 1994-03-11 · 1461 días')).toBeInTheDocument();
    expect(screen.getByText('2019-10-18 → 2019-12-19 · 62 días')).toBeInTheDocument();
  });

  it('usa únicamente los registros reales del país abierto', () => {
    window.location.hash = '#/pais/CHL';
    render(<App />);
    expect(document.querySelector('[data-period-id="pres-chl-oficial-patricio-aylwin"]')).toBeInTheDocument();
    expect(document.querySelector('[data-period-id="pres-arg-3701"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-event-id="crisis-chl-2019-10-18"]')).toBeInTheDocument();
    expect(document.querySelector('[data-event-id="crisis-arg-2001-12-01"]')).not.toBeInTheDocument();
  });

  it('muestra población como área seleccionable sin puntos anuales y cuatro bandas sincronizadas', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Población total, área histórica/ })).toBeInTheDocument();
    expect(document.querySelector('[data-series-point][data-indicator-id="total-population"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-composition-group="age"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-composition-group="residence"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-indicator-id="adult-literacy-rate"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-indicator-id="poverty-national-headcount"]')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-indicator-id="gdp-per-capita-ppp-2021"]')).toHaveLength(26);
    expect(document.querySelectorAll('[data-band]')).toHaveLength(4);
    expect(document.querySelector('[data-band="institutions"]')).not.toBeInTheDocument();
  });

  it('reemplaza la visualización social y alterna entre población derivada y porcentajes originales', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Inicio del intervalo'), { target: { value: '1990' } });
    fireEvent.change(screen.getByLabelText('Fin del intervalo'), { target: { value: '2010' } });
    const selector = screen.getByLabelText('Tema social');
    await user.selectOptions(selector, 'age');
    expect(document.querySelectorAll('[data-composition-group="age"] [data-composition-area]')).toHaveLength(3);
    expect(document.querySelector('[data-composition-group="age"]')).toHaveAttribute('data-composition-mode', 'population');
    expect(document.querySelectorAll('[data-composition-group="age"] [data-value-kind="derived"]')).toHaveLength(3);
    expect(document.querySelector('.composition-point')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Porcentaje' }));
    expect(document.querySelector('[data-composition-group="age"]')).toHaveAttribute('data-composition-mode', 'percentage');
    expect(document.querySelectorAll('[data-composition-group="age"] [data-value-kind="original"]')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Población' }));
    await user.selectOptions(selector, 'residence');
    expect(document.querySelectorAll('[data-composition-group="residence"] [data-composition-area]')).toHaveLength(2);
    expect(document.querySelector('[data-composition-group="residence"]')).toHaveAttribute('data-composition-mode', 'population');
    expect(document.querySelector('[data-composition-group="age"]')).not.toBeInTheDocument();
    await user.selectOptions(selector, 'education');
    expect(document.querySelectorAll('[data-indicator-id="adult-literacy-rate"]')).toHaveLength(2);
    expect(document.querySelector('[data-composition-group="residence"]')).not.toBeInTheDocument();
    expect(countryExplorer()).toHaveAttribute('data-view-start', '1990');
    expect(countryExplorer()).toHaveAttribute('data-view-end', '2010');
  });

  it('mantiene la población anterior a 1960 como ausencia y no inventa puntos', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Año seleccionado'), { target: { value: '1959' } });
    expect(document.querySelector('[data-indicator-id="total-population"][data-year="1959"]')).not.toBeInTheDocument();
    const summary = screen.getByLabelText('Valores disponibles para 1959');
    expect(within(summary).getByText('Población total').parentElement).toHaveTextContent('Sin dato disponible');
  });

  it('consulta pobreza por metodología sin mezclar las series ni cruzar vacíos', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Tema social'), 'poverty');
    expect(document.querySelectorAll('[data-indicator-id="poverty-national-headcount"]')).toHaveLength(10);
    expect(document.querySelector('[data-indicator-id="poverty-international-3-2021ppp"]')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Metodología de pobreza'), 'poverty-international-3-2021ppp');
    expect(document.querySelectorAll('[data-indicator-id="poverty-international-3-2021ppp"]')).toHaveLength(36);
    expect(document.querySelector('[data-indicator-id="poverty-national-headcount"]')).not.toBeInTheDocument();
    document.querySelectorAll('[data-social-line="poverty-international-3-2021ppp"] path[data-segment-years]').forEach((path) => {
      const years = path.getAttribute('data-segment-years')!.split(',').map(Number);
      years.slice(1).forEach((year, index) => expect(year).toBe(years[index] + 1));
    });
  });

  it('presenta PIB total, composición real y superposición de series cargadas en Chile', async () => {
    window.location.hash = '#/pais/CHL';
    const user = userEvent.setup();
    render(<App />);
    const selector = screen.getByLabelText('Tema económico');
    await user.selectOptions(selector, 'gdp-total');
    expect(document.querySelectorAll('[data-indicator-id="gdp-total-constant-2015-usd"]').length).toBeGreaterThan(0);
    expect(document.querySelector('[data-indicator-id="gdp-per-capita-ppp-2021"]')).not.toBeInTheDocument();
    await user.selectOptions(selector, 'gdp-composition');
    expect(document.querySelector('[data-gdp-composition]')).toHaveAttribute('data-series-count', '3');
    expect(document.querySelectorAll('[data-gdp-composition] [data-series-point]').length).toBeGreaterThan(0);
    await user.selectOptions(selector, 'historical-lines');
    expect(document.querySelectorAll('[data-indicator-id="gdp-per-capita-ppp-2021"]')).toHaveLength(26);
    expect(screen.getByLabelText('Segunda serie económica')).toHaveValue('');
    expect(screen.getByRole('note')).toHaveTextContent('Los ejes tienen escalas independientes');
    expect(within(screen.getByLabelText('Segunda serie económica')).getAllByRole('option')).toHaveLength(13);
    await user.selectOptions(screen.getByLabelText('Segunda serie económica'), 'inflation-cpi-annual');
    expect(document.querySelector('[data-economic-lines]')).toHaveAttribute('data-series-count', '2');
    expect(screen.queryByRole('option', { name: 'Salario mínimo · pendiente' })).not.toBeInTheDocument();
  });

  it('sincroniza zoom, año e intervalo en todas las bandas y restablece la vista', async () => {
    const user = userEvent.setup();
    render(<App />);
    const explorer = countryExplorer();
    await user.click(screen.getByRole('button', { name: 'Acercar intervalo' }));
    const start = explorer.getAttribute('data-view-start');
    const end = explorer.getAttribute('data-view-end');
    expect(Number(end) - Number(start)).toBeLessThan(currentYear - 1950);
    document.querySelectorAll('[data-band]').forEach((band) => {
      expect(band).toHaveAttribute('data-view-start', start!);
      expect(band).toHaveAttribute('data-view-end', end!);
      expect(band).toHaveAttribute('data-selected-year', '2024');
    });
    await user.click(screen.getByRole('button', { name: 'Restablecer vista completa' }));
    expect(explorer).toHaveAttribute('data-view-start', '1950');
    expect(explorer).toHaveAttribute('data-view-end', String(currentYear));
  });

  it('permite definir un intervalo y desplazarse sin perder sincronización', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Inicio del intervalo'), { target: { value: '1990' } });
    fireEvent.change(screen.getByLabelText('Fin del intervalo'), { target: { value: '2010' } });
    expect(countryExplorer()).toHaveAttribute('data-view-start', '1990');
    expect(countryExplorer()).toHaveAttribute('data-view-end', '2010');
    await user.click(screen.getByRole('button', { name: 'Desplazar hacia atrás' }));
    document.querySelectorAll('[data-band]').forEach((band) => {
      expect(band.getAttribute('data-view-start')).toBe(countryExplorer().getAttribute('data-view-start'));
      expect(band.getAttribute('data-view-end')).toBe(countryExplorer().getAttribute('data-view-end'));
    });
  });

  it('mantiene V-Dem 2025 vacío y explica la falta de cobertura', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Año seleccionado'), { target: { value: '2025' } });
    expect(screen.getByText(/Fuera de la cobertura efectiva de la fuente \(2000–2024\)/)).toBeInTheDocument();
    expect(document.querySelector('[data-indicator-id="electoral-democracy"][data-year="2025"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-indicator-id="electoral-democracy"][data-year="2024"]')).toBeInTheDocument();
  });

  it('omite nodos de huelgas con cero y abre únicamente agregados anuales positivos', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Año seleccionado'), { target: { value: '1989' } });
    expect(document.querySelector('[data-temporal-type="annual_aggregate"][data-year="1989"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1989 · 0 huelgas generales registradas. Agregado anual sin fechas individuales.' })).not.toBeInTheDocument();
    const node = screen.getByRole('button', { name: '1986 · 2 huelgas generales registradas. Agregado anual sin fechas individuales.' });
    expect(node).toHaveAttribute('data-temporal-type', 'annual_aggregate');
    expect(node).toHaveAttribute('data-count', '2');
    await user.click(node);
    const detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getByRole('heading', { name: '1986 · 2 huelgas generales registradas' })).toBeInTheDocument();
    expect(within(detail).getByText(/centro gráfico del año solo como convención visual/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Año seleccionado'), { target: { value: '2020' } });
    expect(screen.getByText(/Fuera de la cobertura efectiva de la fuente \(1984–2019\)/)).toBeInTheDocument();
    expect(document.querySelector('[data-temporal-type="annual_aggregate"][data-year="2020"]')).not.toBeInTheDocument();
  });

  it('consulta unidad, fuente, archivo y fila de una observación seleccionada', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Argentina, 2000: 22\.281/ }));
    const detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getAllByText(/dólares internacionales constantes de 2021/).length).toBeGreaterThan(0);
    await user.click(within(detail).getByText('Ver procedencia del registro'));
    expect(within(detail).getByText('variables_economicas.csv · fila 2')).toBeInTheDocument();
    expect(within(detail).getByText('GDP_pc_PPP_2021')).toBeInTheDocument();
    expect(within(detail).getByText('Cotejado contra la fila original')).toBeInTheDocument();
  });

  it('presenta línea, medida, fuente y comparabilidad antes del valor de pobreza', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Tema social'), 'poverty');
    await user.click(screen.getByRole('button', { name: /Argentina, 2024: 38,1 % de la población/ }));
    const detail = screen.getByLabelText('Ficha del registro seleccionado');
    const note = detail.querySelector('.poverty-method-note')!;
    const value = within(detail).getByRole('heading', { name: '2024 · 38,1' });
    expect(note).toHaveTextContent('Línea nacional de pobreza');
    expect(note).toHaveTextContent('Medida: incidencia (% de la población). Fuente:');
    expect(note).toHaveTextContent('No comparar directamente las líneas nacionales');
    expect(note.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    await user.click(within(detail).getByText('Ver procedencia del registro'));
    expect(within(detail).getByText('SI.POV.NAHC')).toBeInTheDocument();
  });

  it('abre la ficha de un gobierno con fechas y sin clasificación política inferida', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Carlos Menem, gobierno de 1989-07-08 a 1995-12-10' }));
    const detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getByRole('heading', { name: 'Carlos Menem' })).toBeInTheDocument();
    expect(within(detail).getByText('1989-07-08 → 1995-12-10 · 2346 días')).toBeInTheDocument();
    expect(within(detail).getAllByText('Sin dato cargado; sin clasificación política inferida')).toHaveLength(2);
  });

  it('abre crisis como acontecimientos con fechas, confianza y procedencia', async () => {
    window.location.hash = '#/pais/CHL';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Crisis Vertical, 2019-10-18/ }));
    const detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getByRole('heading', { name: '2019-10-18 → 2019-12-19' })).toBeInTheDocument();
    expect(within(detail).getByText(/62 días · 2019-10-25 · confianza alta/)).toBeInTheDocument();
    await user.click(within(detail).getByText('Ver procedencia del registro'));
    expect(within(detail).getByText('Base_Final_RCP_v6.xlsx · hoja crisis · fila 15')).toBeInTheDocument();
  });

  it('integra los tres poderes en un único lienzo y no inventa registros para Argentina', () => {
    render(<App />);
    const charts = document.querySelectorAll('[data-band="powers"] > .history-chart-scroll > .history-chart');
    expect(charts).toHaveLength(1);
    const sections = document.querySelectorAll('[data-power-section]');
    expect(sections).toHaveLength(3);
    sections.forEach((section) => expect(section.closest('svg')).toBe(charts[0]));
    const headings = document.querySelectorAll('.powers-section-headers h4');
    expect([...headings].map((heading) => heading.textContent)).toEqual(['Poder Ejecutivo', 'Poder Legislativo', 'Poder Judicial']);
    headings.forEach((heading) => expect(heading.closest('svg')).toBeNull());
    expect(document.querySelector('.powers-section-headers .legislative-legend')).toBeInTheDocument();
    expect(charts[0].querySelector('.legislative-legend')).toBeNull();
    expect([...charts[0].querySelectorAll('.power-track-label')].map((label) => label.textContent)).toEqual(['Administraciones Ejecutiva', 'Cámara alta', 'Cámara baja', 'Corte Suprema']);
    expect(document.querySelectorAll('[data-legislative-track][data-status="no_data"]')).toHaveLength(2);
    expect(document.querySelector('[data-judicial-track="supreme-court"][data-status="no_data"]')).toBeInTheDocument();
    expect(document.querySelector('[data-legislative-period], [data-judicial-change]')).not.toBeInTheDocument();
    expect(screen.getByText('Mayoría oficialista')).toBeInTheDocument();
    expect(screen.getByText(/Cada cámara y segmento conserva fechas propias/)).toBeInTheDocument();
  });

  it('abre segmentos legislativos y el nodo judicial documentado de Chile', async () => {
    window.location.hash = '#/pais/CHL';
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelectorAll('[data-legislative-track][data-status="loaded"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-legislative-segment]')).toHaveLength(22);
    expect(document.querySelector('[data-relation="congress_absent_or_dissolved"]')).toBeInTheDocument();
    expect(document.querySelector('[data-relation="unknown"]')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cámara alta, 1973-09-11 a 1990-03-11: Congreso ausente o disuelto/ }));
    let detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getByRole('heading', { name: 'Cámara alta · Senado' })).toBeInTheDocument();
    expect(within(detail).getByText('Congreso ausente o disuelto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Corte Suprema de Chile, 1957-09-30/ }));
    detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getByRole('heading', { name: 'Corte Suprema de Chile' })).toBeInTheDocument();
    expect(within(detail).getByText(/no implica una renovación completa/)).toBeInTheDocument();
  });

  it('abre fichas desde las áreas con teclado y conserva la procedencia de los cálculos derivados', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Población total, área histórica/ }));
    let detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getByText('Población total', { selector: 'strong' })).toBeInTheDocument();
    expect(within(detail).queryByTestId('derived-record')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Tema social'), 'age');
    await user.click(screen.getByRole('button', { name: /Población de 0 a 14 años, población derivada/ }));
    detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(detail.querySelector('[data-derived-record]')).toBeInTheDocument();
    expect(within(detail).getByText(/población del grupo = población total × porcentaje del grupo \/ 100/)).toBeInTheDocument();
    expect(within(detail).getByText('Población total original')).toBeInTheDocument();
    expect(within(detail).getByText('Porcentaje original')).toBeInTheDocument();
    expect(within(detail).getAllByText('Ver procedencia del registro')).toHaveLength(2);
  });

  it('sincroniza los controles compactos de cada banda con todas las demás', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelectorAll('.band-time-controls')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'Acercar intervalo en Sociedad' }));
    let start = countryExplorer().getAttribute('data-view-start');
    let end = countryExplorer().getAttribute('data-view-end');
    document.querySelectorAll('[data-band]').forEach((band) => {
      expect(band).toHaveAttribute('data-view-start', start!);
      expect(band).toHaveAttribute('data-view-end', end!);
    });
    await user.click(screen.getByRole('button', { name: 'Desplazar hacia atrás en Acontecimientos' }));
    start = countryExplorer().getAttribute('data-view-start');
    end = countryExplorer().getAttribute('data-view-end');
    document.querySelectorAll('[data-band]').forEach((band) => {
      expect(band).toHaveAttribute('data-view-start', start!);
      expect(band).toHaveAttribute('data-view-end', end!);
    });
  });

  it('separa las siete categorías de acontecimientos y mantiene compactas las filas vacías', () => {
    render(<App />);
    expect(document.querySelectorAll('[data-event-category]')).toHaveLength(7);
    expect(document.querySelector('[data-event-category="institutional-crises"]')).toHaveAttribute('data-event-count', '2');
    expect(document.querySelector('[data-event-category="protests"]')).toHaveClass('has-events');
    expect(document.querySelector('[data-event-category="elections"]')).toHaveClass('empty');
    expect(document.querySelector('[data-event-id="crisis-arg-2001-12-01"]')?.closest('[data-event-category]')).toHaveAttribute('data-event-category', 'institutional-crises');
    expect(document.querySelector('[data-event-id^="annual-strike-"]')?.closest('[data-event-category]')).toHaveAttribute('data-event-category', 'protests');
  });

  it('abre acontecimientos documentales chilenos sin inferir vínculos', async () => {
    window.location.hash = '#/pais/CHL';
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelector('[data-event-category="elections"]')).toHaveAttribute('data-event-count', '19');
    expect(document.querySelector('[data-event-category="successions"]')).toHaveAttribute('data-event-count', '2');
    expect(document.querySelector('[data-event-category="reforms"]')).toHaveAttribute('data-event-count', '12');
    const election = document.querySelector('[data-event-kind="election"]') as SVGGElement;
    await user.click(election);
    const detail = screen.getByLabelText('Ficha del registro seleccionado');
    expect(within(detail).getByText(/Acontecimiento documental/)).toBeInTheDocument();
    expect(within(detail).getByText('Fecha exacta documentada')).toBeInTheDocument();
    expect(within(detail).getByText(/Sin vínculo documental cargado; no se infiere/)).toBeInTheDocument();
  });

  it('filtra estimaciones y derivados sin ocultar observaciones directas', async () => {
    window.location.hash = '#/pais/CHL';
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Tema social'), 'employment');
    expect(document.querySelectorAll('[data-composition-group="employment"] [data-value-kind="source_estimate"]')).toHaveLength(3);
    await user.click(screen.getByLabelText('Incluir derivados y estimaciones de fuente'));
    expect(document.querySelector('[data-composition-group="employment"]')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-indicator-id="gdp-per-capita-ppp-2021"]')).toHaveLength(26);
    await user.selectOptions(screen.getByLabelText('Tema social'), 'age');
    expect(document.querySelector('[data-value-kind="derived"]')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-composition-group="age"] [data-value-kind="original"]')).toHaveLength(3);
  });

  it('mantiene navegación de año por teclado en el eje compartido', async () => {
    const user = userEvent.setup();
    render(<App />);
    const canvas = screen.getByRole('region', { name: /Lienzo histórico de Argentina/ });
    canvas.focus();
    await user.keyboard('{ArrowRight}');
    expect(countryExplorer()).toHaveAttribute('data-selected-year', '2025');
    document.querySelectorAll('[data-band]').forEach((band) => expect(band).toHaveAttribute('data-selected-year', '2025'));
  });
});
