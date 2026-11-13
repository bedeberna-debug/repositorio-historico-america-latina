import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { EconomicLinesChart } from '../components/EconomyBand';
import { makeHistoryScale } from '../components/HistoryChart';
import type { CountryYearObservation, Provenance } from '../types/data';

// Registros exclusivos de prueba: no se importan ni incorporan al repositorio canónico.
const testProvenance: Provenance = {
  sourceId: 'test-only-isolated',
  datasetVersionId: 'test-only-version',
  originalVariable: 'test_only_variable',
  definition: 'Registro sintético aislado para verificar la infraestructura de doble eje.',
  unit: 'unidad de prueba',
  coverage: { startYear: 2000, endYear: 2002, territorialLevel: 'national' },
  transformations: ['Ninguna; registro aislado de prueba'],
  verificationStatus: 'unverified',
  sourceFile: 'test-only',
  sourceSheet: null,
  sourceRow: 0,
};

function testSeries(indicatorId: string, unit: string, values: number[]): CountryYearObservation[] {
  return values.map((value, index) => ({
    id: `test-only-${indicatorId}-${index}`,
    countryCode: 'ARG',
    indicatorId,
    year: 2000 + index,
    originalValue: value,
    normalizedValue: value,
    valueStatus: 'available',
    provenance: { ...testProvenance, unit },
  }));
}

describe('infraestructura económica de doble eje', () => {
  it('mantiene escalas, unidades, colores semánticos y procedencia independientes', () => {
    const primary = testSeries('test-primary', 'unidad A de prueba', [10, 20, 30]);
    const secondary = testSeries('test-secondary', 'unidad B de prueba', [1000, 2000, 4000]);
    const leftScale = makeHistoryScale(primary);
    const rightScale = makeHistoryScale(secondary);
    expect(leftScale.minimum).not.toBe(rightScale.minimum);
    expect(leftScale.maximum).not.toBe(rightScale.maximum);

    const { container } = render(<svg><EconomicLinesChart
      primary={primary}
      secondary={secondary}
      selectedYear={2001}
      xYear={(year) => (year - 2000) * 100}
      onSelect={() => undefined}
      observationLabel={(item) => `Prueba aislada ${item.year}: ${item.originalValue} ${item.provenance.unit}`}
      clipId="test-economic-clip"
    /></svg>);
    expect(container.querySelector('[data-axis-title="left"]')).toHaveTextContent('unidad A de prueba');
    expect(container.querySelector('[data-axis-title="right"]')).toHaveTextContent('unidad B de prueba');
    expect(container.querySelectorAll('[data-axis-side="left"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-axis-side="right"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-axis-side="left"] text')).toHaveLength(3);
    expect(container.querySelectorAll('[data-axis-side="right"] text')).toHaveLength(3);
    container.querySelectorAll('[data-axis-side]').forEach((axis) => {
      expect(axis.closest('[data-economic-plot]')).toBeNull();
      expect(axis.closest('[clip-path]')).toBeNull();
    });
    expect(container.querySelector('[data-economic-plot]')).toHaveAttribute('clip-path', 'url(#test-economic-clip)');
    expect(container.querySelectorAll('[data-axis-side="left"]')).toHaveLength(3);
    expect(container.querySelector('[data-axis-side="left"]')).toHaveAttribute('data-axis-unit', 'unidad A de prueba');
    expect(container.querySelector('[data-axis-side="right"]')).toHaveAttribute('data-axis-unit', 'unidad B de prueba');
    expect(container.querySelectorAll('[data-axis-side="left"] .history-grid-line')).toHaveLength(3);
    expect(container.querySelector('[data-axis-side="right"] .history-grid-line')).not.toBeInTheDocument();
    expect(container.querySelector('.history-series-line.economic-primary')).toBeInTheDocument();
    expect(container.querySelector('.history-series-line.economic-secondary')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Prueba aislada 2000: 10 unidad A de prueba"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Prueba aislada 2000: 1000 unidad B de prueba"]')).toBeInTheDocument();
  });

  it('retira la segunda serie y vuelve a una sola escala', () => {
    const primary = testSeries('test-primary', 'unidad A de prueba', [10, 20, 30]);
    const { container } = render(<svg><EconomicLinesChart
      primary={primary}
      selectedYear={2001}
      xYear={(year) => (year - 2000) * 100}
      onSelect={() => undefined}
      observationLabel={() => 'Prueba aislada'}
    /></svg>);
    expect(container.querySelectorAll('[data-axis-side="left"]')).toHaveLength(3);
    expect(container.querySelector('[data-axis-side="right"]')).not.toBeInTheDocument();
    expect(container.querySelector('.economic-secondary')).not.toBeInTheDocument();
  });
});
