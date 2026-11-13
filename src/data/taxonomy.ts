import type { HistoricalDomain } from '../types/data';

export interface HistoricalTheme {
  id: string;
  name: string;
  indicatorIds: string[];
}

export interface HistoricalDomainDefinition {
  id: HistoricalDomain;
  name: string;
  shortName: string;
  description: string;
  availability: string;
  themes: HistoricalTheme[];
}

// Estructura conceptual: los temas sin indicadores no generan series ni valores.
export const historicalDomains: HistoricalDomainDefinition[] = [
  {
    id: 'economy',
    name: 'Economía y recursos públicos',
    shortName: 'Economía',
    description: 'Actividad económica, precios, trabajo, composición del PIB y recursos públicos con variantes y coberturas separadas.',
    availability: 'PIB per cápita para Argentina y Chile; 13 series económicas WDI adicionales para Chile.',
    themes: [
      { id: 'economic-activity', name: 'Actividad económica', indicatorIds: ['gdp-per-capita-ppp-2021', 'gdp-total-constant-2015-usd', 'gdp-growth-annual'] },
      { id: 'prices-rates', name: 'Precios, tipo de cambio y tasas', indicatorIds: ['inflation-cpi-annual', 'official-exchange-rate', 'lending-interest-rate'] },
      { id: 'economic-work', name: 'Trabajo', indicatorIds: ['unemployment-ilo-modeled'] },
      { id: 'gdp-composition', name: 'Composición del PIB por actividad', indicatorIds: ['gdp-agriculture-share', 'gdp-industry-share', 'gdp-services-share'] },
      { id: 'public-finances', name: 'Recursos públicos y deuda', indicatorIds: ['government-expense-share-gdp', 'government-revenue-share-gdp', 'central-government-debt-share-gdp'] },
    ],
  },
  {
    id: 'society',
    name: 'Sociedad, demografía y condiciones de vida',
    shortName: 'Sociedad',
    description: 'Población, pobreza por metodologías separadas, educación, desigualdad, trabajo y servicios básicos.',
    availability: '9 series sociales para Argentina y Chile; 6 series WDI adicionales para Chile.',
    themes: [
      { id: 'population', name: 'Población', indicatorIds: ['total-population'] },
      { id: 'population-composition', name: 'Composición de la población', indicatorIds: ['population-age-0-14', 'population-age-15-64', 'population-age-65-plus', 'urban-population-share', 'rural-population-share'] },
      { id: 'poverty', name: 'Pobreza', indicatorIds: ['poverty-national-headcount', 'poverty-international-3-2021ppp'] },
      { id: 'education', name: 'Educación', indicatorIds: ['adult-literacy-rate'] },
      { id: 'inequality', name: 'Distribución de ingresos', indicatorIds: ['gini-index'] },
      { id: 'labor', name: 'Ocupación y actividad', indicatorIds: ['labor-force-participation-rate', 'employment-agriculture-share', 'employment-industry-share', 'employment-services-share'] },
      { id: 'basic-services', name: 'Servicios básicos', indicatorIds: ['electricity-access'] },
    ],
  },
  {
    id: 'institutions',
    name: 'Instituciones, gobiernos y conflictividad política',
    shortName: 'Instituciones',
    description: 'Democracia electoral, huelgas generales, períodos presidenciales y episodios de crisis con fechas y procedencia.',
    availability: '2 series anuales, períodos presidenciales y crisis disponibles.',
    themes: [
      { id: 'democracy-representation', name: 'Democracia y representación', indicatorIds: ['electoral-democracy', 'presidential-periods'] },
      { id: 'conflict-crises', name: 'Conflictividad y crisis', indicatorIds: ['general-strikes', 'presidential-crises'] },
    ],
  },
];

export const historicalDomainById = Object.fromEntries(
  historicalDomains.map((domain) => [domain.id, domain]),
) as Record<HistoricalDomain, HistoricalDomainDefinition>;
