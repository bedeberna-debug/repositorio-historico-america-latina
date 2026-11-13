import type { CountryYearObservation } from '../types/data';

export const POPULATION_DERIVATION_FORMULA = 'población del grupo = población total × porcentaje del grupo / 100';

function numericValue(item: CountryYearObservation | undefined): item is CountryYearObservation {
  return Boolean(item) && typeof item!.normalizedValue === 'number' && item!.valueStatus !== 'no_data' && item!.valueStatus !== 'not_applicable';
}

/**
 * Genera un valor efímero en la unidad de presentación de la población total.
 * Las observaciones de origen permanecen intactas y enlazadas en `derivation`.
 */
export function derivePopulationObservation(
  population: CountryYearObservation | undefined,
  percentage: CountryYearObservation | undefined,
): CountryYearObservation | undefined {
  if (!numericValue(population) || !numericValue(percentage)) return undefined;
  if (population.countryCode !== percentage.countryCode || population.year !== percentage.year) return undefined;
  const populationProvenance = population.provenance;
  const percentageProvenance = percentage.provenance;
  const compatible = populationProvenance.sourceId === percentageProvenance.sourceId
    && Boolean(populationProvenance.accessDate)
    && populationProvenance.accessDate === percentageProvenance.accessDate
    && populationProvenance.coverage.territorialLevel === percentageProvenance.coverage.territorialLevel
    && populationProvenance.coverage.territorialCode === percentageProvenance.coverage.territorialCode
    && population.year >= (populationProvenance.coverage.startYear ?? -Infinity)
    && population.year <= (populationProvenance.coverage.endYear ?? Infinity)
    && percentage.year >= (percentageProvenance.coverage.startYear ?? -Infinity)
    && percentage.year <= (percentageProvenance.coverage.endYear ?? Infinity);
  if (!compatible) return undefined;

  const result = Number(population.normalizedValue) * Number(percentage.normalizedValue) / 100;
  return {
    ...percentage,
    id: `derived-population:${percentage.id}`,
    originalValue: null,
    normalizedValue: result,
    valueStatus: 'available',
    valueOrigin: 'derived',
    originalFrequency: 'annual',
    provenance: {
      ...percentageProvenance,
      definition: 'Valor derivado de presentación; no es una observación original.',
      originalVariable: `${populationProvenance.originalVariable} × ${percentageProvenance.originalVariable} / 100`,
      unit: populationProvenance.unit,
      originalUnit: populationProvenance.originalUnit,
      transformations: [
        ...percentageProvenance.transformations,
        `Derivación en vista: ${POPULATION_DERIVATION_FORMULA}. No se ajusta la suma de componentes.`,
      ],
      verificationStatus: 'unverified',
      notes: 'Cálculo derivado, no observación original. Se conservan por separado la población total, el porcentaje, sus fuentes, archivos y versiones.',
    },
    derivation: {
      formula: POPULATION_DERIVATION_FORMULA,
      population,
      percentage,
      resultUnit: populationProvenance.unit,
    },
  };
}
