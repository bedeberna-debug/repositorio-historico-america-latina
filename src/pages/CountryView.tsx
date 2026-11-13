import { ArrowDownRight, ArrowLeft, ArrowUpRight, CalendarDays, Database, FileCheck2, Landmark, MapPinned, Users } from 'lucide-react';
import { countryByCode } from '../data/countries';
import { indicatorById } from '../data/indicators';
import { getCrisisEpisodes, getPresidentialPeriods, observations } from '../data/repositories';
import { getSource } from '../data/sources';
import { CountryDataWorkspace } from '../components/CountryDataWorkspace';
import { CURRENT_YEAR, START_YEAR } from '../App';
import type { CountryCode } from '../types/data';

interface CountryViewProps {
  code: 'ARG' | 'CHL';
  indicatorId: string;
  setIndicatorId: (id: string) => void;
  year: number;
  setYear: (year: number) => void;
  navigate: (path: string) => void;
}

const bandLinks = [
  { id: 'powers', name: 'Poderes del Estado', description: 'Ejecutivo, segmentos legislativos y cambios judiciales según la cobertura documental de cada país.', availability: 'Chile incorpora períodos oficiales, cámaras independientes y un primer nodo judicial.', icon: Landmark },
  { id: 'economy', name: 'Economía', description: 'PIB, precios, trabajo, actividad y finanzas públicas con líneas y escalas diferenciadas.', availability: 'PIB per cápita en ambos países; ampliación económica WDI en Chile.', icon: Database },
  { id: 'society', name: 'Sociedad', description: 'Población, pobreza, educación, desigualdad, trabajo y servicios básicos.', availability: 'Series sociales en ambos países; seis series adicionales en Chile.', icon: Users },
  { id: 'events', name: 'Acontecimientos', description: 'Elecciones, sucesiones, crisis, reformas y huelgas en categorías con temporalidad explícita.', availability: 'Cobertura documental no exhaustiva; agregados anuales sin fechas inventadas.', icon: CalendarDays },
];

export function CountryView({ code, indicatorId, setIndicatorId, year, setYear, navigate }: CountryViewProps) {
  const country = countryByCode[code];
  const indicator = indicatorById[indicatorId];
  const source = getSource(indicator.sourceIds[0]);
  const countryObservations = observations.filter((item) => item.countryCode === code);
  const periods = getPresidentialPeriods(code);
  const crises = getCrisisEpisodes(code);

  const goToBand = (band: string) => {
    document.getElementById(`band-${band}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="country-page">
      <section className="country-hero">
        <div className="page country-hero-inner">
          <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Volver al mapa regional</button>
          <div className="country-title-row">
            <div>
              <span className="country-eyebrow">Módulo país · {country.code} · Fase 06</span>
              <h1>{country.name}</h1>
              <p>Exploración histórica conjunta de poderes del Estado, economía, sociedad y acontecimientos, con trazabilidad de cada registro.</p>
            </div>
            <div className="country-monogram" aria-hidden="true">{country.code}<span>{START_YEAR}—{CURRENT_YEAR}</span></div>
          </div>
          <div className="country-switcher" aria-label="Cambiar módulo de país">
            {(['ARG', 'CHL'] as CountryCode[]).map((countryCode) => (
              <button key={countryCode} className={code === countryCode ? 'active' : ''} onClick={() => navigate(`/pais/${countryCode}`)} aria-current={code === countryCode ? 'page' : undefined}>
                {countryByCode[countryCode].name}<ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="page country-content">
        <section className="country-scope" aria-labelledby="country-scope-title">
          <div className="country-scope-intro">
            <span className="section-kicker">Contexto general y cobertura</span>
            <h2 id="country-scope-title">Qué puede consultarse en este módulo</h2>
            <p>El eje general cubre {START_YEAR}–{CURRENT_YEAR}; cada serie, gobierno y crisis mantiene sus fechas y cobertura efectivas.</p>
          </div>
          <dl className="country-scope-stats">
            <div><dt>Observaciones anuales</dt><dd>{countryObservations.length}</dd></div>
            <div><dt>Períodos presidenciales</dt><dd>{periods.length}</dd></div>
            <div><dt>Crisis registradas</dt><dd>{crises.length}</dd></div>
          </dl>
          <div className="structural-context-note"><MapPinned size={18} /><p><strong>Geografía, territorio y clima:</strong> espacio estructural reservado. Estos antecedentes aún no están cargados; cuando se incorporen deberán incluir fuente y fecha de referencia.</p></div>
        </section>

        <nav className="domain-access" aria-label="Acceso a las bandas históricas">
          {bandLinks.map((band, index) => {
            const Icon = band.icon;
            return <button key={band.id} className={`domain-card domain-${band.id}`} onClick={() => goToBand(band.id)} aria-controls={`band-${band.id}`}>
              <span className="domain-card-number">0{index + 1}</span>
              <Icon size={22} aria-hidden="true" />
              <span className="domain-card-copy"><strong>{band.name}</strong><span>{band.description}</span><small>{band.availability}</small></span>
              <ArrowDownRight size={19} aria-hidden="true" />
            </button>;
          })}
        </nav>

        <CountryDataWorkspace countryCode={code} year={year} setYear={setYear} setIndicatorId={setIndicatorId} />

        <section className="method-notes" aria-labelledby="notes-title">
          <div className="method-notes-intro"><FileCheck2 size={24} /><div><span className="section-kicker">Trazabilidad</span><h2 id="notes-title">Fuentes y notas metodológicas</h2></div></div>
          <div className="notes-accordions">
            <details>
              <summary>Definición, tema y variante del indicador seleccionado <span>+</span></summary>
              <p><strong>{indicator.name}.</strong> {indicator.definition}</p>
              <p><strong>Jerarquía:</strong> {indicator.domain === 'economy' ? 'Economía y recursos públicos' : indicator.domain === 'society' ? 'Sociedad, demografía y condiciones de vida' : 'Instituciones, gobiernos y conflictividad política'} → {indicator.theme} → {indicator.name} → {indicator.variant}.</p>
              <p><strong>Unidad:</strong> {indicator.unit}. <strong>Variable original:</strong> {indicator.originalVariable ?? 'Pendiente de documentar'}.</p>
            </details>
            <details>
              <summary>Procedencia y estado de verificación <span>+</span></summary>
              <p>{source?.title}. Fuente importada; esto no equivale a validación externa. Los paquetes iniciales conservan 30 registros de muestra cotejados; los registros de la ampliación de Chile indican individualmente su estado de verificación.</p>
              <p>La ficha de cada observación, gobierno o acontecimiento enlaza con su transformación, dataset, versión, variable original y fuente. Los cálculos derivados conservan ambos registros de origen.</p>
            </details>
            <details>
              <summary>Reglas para datos ausentes y acontecimientos <span>+</span></summary>
              <p>No se interpolan ni imputan valores. “Sin dato disponible”, “fuera de cobertura” y “cero eventos registrados” son estados diferentes. Las crisis y presidencias conservan fechas exactas y episodios independientes.</p>
              <p>Las sucesiones, configuraciones legislativas, cambios judiciales y elecciones solo se incorporan con respaldo documental; no se infieren vínculos, mayorías ni relaciones por proximidad temporal.</p>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
}
