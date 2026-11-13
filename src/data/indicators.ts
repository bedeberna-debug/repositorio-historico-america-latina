import type { Indicator, IndicatorKind } from '../types/data';
import socialIndicatorData from '../../data/canonical/social-indicators.json';
import chileIndicatorData from '../../data/canonical/chile-indicators.json';

export const baseIndicators: Indicator[] = [
  {
    id: 'gdp-per-capita-ppp-2021', domain: 'economy', theme: 'Actividad económica', variant: 'PPA constante 2021', family: 'Economía', name: 'PIB per cápita, PPA (constante 2021)', shortName: 'PIB per cápita (PPA)', kind: 'continuous', unit: 'dólares internacionales constantes de 2021',
    definition: 'Producto interno bruto por habitante, ajustado por paridad de poder adquisitivo y expresado en valores constantes de 2021, según la variable efectiva del archivo.', originalVariable: 'GDP_pc_PPP_2021', sourceIds: ['course-economic'], mapCompatible: true,
  },
  {
    id: 'electoral-democracy', domain: 'institutions', theme: 'Democracia y representación', variant: 'v2x_polyarchy', family: 'Democracia y representación', name: 'Democracia electoral', shortName: 'Democracia electoral', kind: 'continuous', unit: 'índice de 0 a 1',
    definition: 'Índice de democracia electoral v2x_polyarchy. La versión y documentación de la fuente permanecen pendientes de confirmación.', originalVariable: 'v2x_polyarchy', sourceIds: ['vdem'], mapCompatible: true,
  },
  {
    id: 'general-strikes', domain: 'institutions', theme: 'Conflictividad y crisis', variant: 'Huelgas generales nacionales', family: 'Conflictividad y crisis', name: 'Huelgas generales', shortName: 'Huelgas generales', kind: 'annual_count', unit: 'eventos por año', originalVariable: 'strikes',
    definition: 'Conteo anual de huelgas generales nacionales organizadas por organizaciones de trabajadores; cero, ausencia y falta de cobertura son estados distintos.', sourceIds: ['martinez-pol-events'], mapCompatible: true,
  },
  {
    id: 'presidential-periods', domain: 'institutions', theme: 'Democracia y representación', variant: 'Registro de administración', family: 'Democracia y representación', name: 'Períodos presidenciales', shortName: 'Períodos presidenciales', kind: 'presidential_period', unit: 'intervalos con fechas', originalVariable: 'adm; datein; dateout; tenure; failure',
    definition: 'Administraciones representadas como intervalos con fechas, duración e interrupción cuando la fuente permite determinarla.', sourceIds: ['comparative-survival'], mapCompatible: false,
  },
  {
    id: 'presidential-crises', domain: 'institutions', theme: 'Conflictividad y crisis', variant: 'Episodio de crisis presidencial', family: 'Conflictividad y crisis', name: 'Crisis e interrupciones presidenciales', shortName: 'Crisis presidenciales', kind: 'crisis_episode', unit: 'episodios con fechas', originalVariable: 'tipo; inicio; termino; fecha_peak',
    definition: 'Episodios delimitados por fechas, con actores, mecanismos, salida presidencial, notas y confianza conservados.', sourceIds: ['rcp-crisis'], mapCompatible: false,
  },
];

export const socialIndicators = socialIndicatorData as Indicator[];
export const chileIndicators = chileIndicatorData as Indicator[];
export const indicators: Indicator[] = [...baseIndicators, ...socialIndicators, ...chileIndicators];

export const indicatorById = Object.fromEntries(indicators.map((indicator) => [indicator.id, indicator])) as Record<string, Indicator>;

export const kindLabels: Record<IndicatorKind, string> = {
  continuous: 'Valor continuo',
  annual_count: 'Conteo anual',
  categorical: 'Categoría',
  presidential_period: 'Período presidencial',
  crisis_episode: 'Episodio de crisis',
};
