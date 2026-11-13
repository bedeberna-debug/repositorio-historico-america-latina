import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

async function openTable(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: 'Tabla de datos' }));
  return screen.getByRole('tabpanel', { name: 'Tabla de datos' });
}

describe('tabla de datos y descargas de la fase 06', () => {
  beforeEach(() => { window.location.hash = '#/pais/ARG'; });

  it('alterna vistas conservando intervalo, configuración del explorador y filtros de tabla', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Inicio del intervalo'), { target: { value: '1990' } });
    fireEvent.change(screen.getByLabelText('Fin del intervalo'), { target: { value: '2010' } });
    await user.selectOptions(screen.getByLabelText('Tema social'), 'age');
    const panel = await openTable(user);
    expect(within(panel).getByLabelText('Inicio del intervalo de tabla')).toHaveValue(1990);
    expect(within(panel).getByLabelText('Fin del intervalo de tabla')).toHaveValue(2010);
    await user.type(within(panel).getByLabelText('Buscar indicadores'), 'PIB per cápita');
    expect(panel.querySelectorAll('tbody tr')).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: 'Explorador histórico' }));
    expect(screen.getByLabelText('Tema social')).toHaveValue('age');
    expect(document.querySelector('.historical-explorer')).toHaveAttribute('data-view-start', '1990');
    await user.click(screen.getByRole('tab', { name: 'Tabla de datos' }));
    expect(screen.getByLabelText('Buscar indicadores')).toHaveValue('PIB per cápita');
  });

  it('activa, desactiva y selecciona grupos visibles sin duplicar series', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = await openTable(user);
    await user.type(within(panel).getByLabelText('Buscar indicadores'), 'PIB per cápita');
    const toggle = within(panel).getByRole('checkbox', { name: /Activar PIB per cápita/ });
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(within(panel).getByText('0', { selector: '.data-selection-toolbar strong' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Descargar CSV' })).toBeDisabled();
    await user.click(within(panel).getByRole('button', { name: 'Seleccionar visibles' }));
    expect(toggle).toBeChecked();
    expect(panel.querySelectorAll('tbody tr')).toHaveLength(1);
    await user.click(within(panel).getByRole('button', { name: 'Deseleccionar todas' }));
    expect(toggle).not.toBeChecked();
  });

  it('abre procedencia de una celda real y calcula variaciones consecutivas', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = await openTable(user);
    fireEvent.change(within(panel).getByLabelText('Inicio del intervalo de tabla'), { target: { value: '2000' } });
    fireEvent.change(within(panel).getByLabelText('Fin del intervalo de tabla'), { target: { value: '2003' } });
    await user.type(within(panel).getByLabelText('Buscar indicadores'), 'PIB per cápita');
    const cell = panel.querySelector<HTMLButtonElement>('[data-year="2001"][data-cell-status="available"]')!;
    await user.click(cell);
    const detail = within(panel).getByLabelText('Ficha de PIB per cápita, PPA (constante 2021), 2001');
    expect(within(detail).getByRole('heading')).toHaveTextContent('Argentina · 2001');
    await user.click(within(detail).getByText('Ver procedencia del registro'));
    expect(within(detail).getAllByText(/variables_economicas.csv/).length).toBeGreaterThan(0);
    await user.click(within(panel).getByLabelText('Mostrar variación anual'));
    expect(panel.querySelector('[data-variation-year="2000"]')).toHaveTextContent('—');
    expect(panel.querySelector('[data-variation-year="2001"]')).not.toHaveTextContent('—');
    await user.selectOptions(within(panel).getByLabelText('Tipo de variación'), 'percent');
    expect(within(panel).getByText(/exige denominador positivo/)).toBeInTheDocument();
    cell.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveAttribute('data-year', '2002');
  });

  it('prioriza los años y despliega metadatos no fijos sin perder filtros ni selección', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = await openTable(user);
    const matrix = panel.querySelector('table.data-matrix')!;
    expect(matrix).toHaveClass('essential');
    const fixedColumns = matrix.querySelectorAll('thead .sticky-column');
    expect(fixedColumns).toHaveLength(1);
    expect(fixedColumns[0]).toHaveTextContent('Indicador');
    const mainHeaders = matrix.querySelectorAll('.data-matrix-main-head > th');
    expect(mainHeaders[1]).toHaveClass('year-heading');
    expect(matrix.querySelectorAll('.metadata-column')).toHaveLength(0);

    await user.type(within(panel).getByLabelText('Buscar indicadores'), 'PIB per cápita');
    const selection = within(panel).getByRole('checkbox', { name: /Activar PIB per cápita/ });
    await user.click(selection);
    expect(selection).not.toBeChecked();
    await user.click(within(panel).getByLabelText('Mostrar columnas metodológicas'));
    expect(within(panel).getByLabelText('Buscar indicadores')).toHaveValue('PIB per cápita');
    expect(selection).not.toBeChecked();
    expect(matrix).toHaveClass('with-method-columns');
    const metadata = matrix.querySelectorAll('.metadata-column');
    expect(metadata).toHaveLength(12);
    metadata.forEach((column) => expect(column).not.toHaveClass('sticky-column'));
    expect(matrix.querySelectorAll('thead .sticky-column')).toHaveLength(1);
    expect(matrix.querySelector('.data-indicator-cell')).toHaveTextContent('PPA (constante 2021)');
    await user.click(within(panel).getByLabelText('Mostrar columnas metodológicas'));
    expect(matrix.querySelectorAll('.metadata-column')).toHaveLength(0);
    expect(selection).not.toBeChecked();
  });

  it('mantiene las ausencias y abre la fórmula y entradas de una composición derivada', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = await openTable(user);
    await user.click(within(panel).getByLabelText('Mostrar columnas metodológicas'));
    await user.type(within(panel).getByLabelText('Buscar indicadores'), 'Población de 0 a 14 años');
    const rows = [...panel.querySelectorAll<HTMLTableRowElement>('tbody tr')];
    expect(rows).toHaveLength(2);
    const derived = rows.find((row) => row.textContent?.includes('Derivado'))!;
    const value = derived.querySelector<HTMLButtonElement>('[data-year="2000"]')!;
    await user.click(value);
    expect(panel.querySelector('[data-table-derived-record]')).toHaveTextContent('población del grupo = población total × porcentaje del grupo / 100');
    await user.click(within(panel).getByRole('button', { name: 'Restablecer filtros' }));
    await user.type(within(panel).getByLabelText('Buscar indicadores'), 'USD 3,00');
    const missing = panel.querySelector('[data-year="2015"][data-cell-status="no_data"]');
    expect(missing).toBeInTheDocument();
    expect(missing).toHaveTextContent('Sin dato');
    const outside = panel.querySelector('[data-year="1950"][data-cell-status="outside_coverage"]');
    expect(outside).toHaveTextContent('Fuera de cobertura');
  });
});
