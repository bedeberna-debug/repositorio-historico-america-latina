import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ArrowUpRight, Construction, X } from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import geography from '../data/geo/latin-america.json';
import { countries, countryByCode } from '../data/countries';
import { getObservation, getObservationCoverage, observations } from '../data/repositories';
import { getSource } from '../data/sources';
import { formatValue, numericExtent, observationColor } from '../utils/scales';
import type { CountryCode, Indicator } from '../types/data';

const features = (geography as unknown as FeatureCollection).features;
const projection = geoMercator().fitExtent([[30, 20], [770, 525]], geography as unknown as FeatureCollection);
const pathGenerator = geoPath(projection);

interface RegionalMapProps {
  indicator: Indicator;
  year: number;
  selectedCountry: CountryCode | null;
  onSelect: (code: CountryCode) => void;
  onClosePreview: () => void;
}

export function RegionalMap({ indicator, year, selectedCountry, onSelect, onClosePreview }: RegionalMapProps) {
  const [hovered, setHovered] = useState<CountryCode | null>(null);
  const paths = useMemo(() => features.map((feature) => ({
    code: feature.properties?.iso3 as CountryCode,
    path: pathGenerator(feature) ?? '',
  })), []);
  const extent = useMemo(() => numericExtent(observations, indicator.id), [indicator.id]);
  const hoveredCountry = hovered ? countryByCode[hovered] : null;
  const hoveredObservation = hovered ? getObservation(hovered, indicator.id, year) : undefined;
  const hoveredSource = hoveredObservation ? getSource(hoveredObservation.provenance.sourceId) : null;
  const selected = selectedCountry ? countryByCode[selectedCountry] : null;

  const observationLabel = (code: CountryCode) => {
    if (code !== 'ARG' && code !== 'CHL') return 'Sin dato cargado en esta fase';
    const observation = getObservation(code, indicator.id, year);
    if (observation) return `${formatValue(observation)} · ${observation.provenance.unit} · ${year}`;
    const coverage = getObservationCoverage(code, indicator.id);
    if (coverage?.startYear !== null && coverage?.endYear !== null && coverage && (year < coverage.startYear! || year > coverage.endYear!)) {
      return `Sin dato disponible · fuera de cobertura (${coverage.startYear}–${coverage.endYear})`;
    }
    return `Sin dato disponible · ${year}`;
  };

  return (
    <div className="map-stage">
      <div className="map-topline">
        <span><i className="live-dot" /> Datos importados · Argentina y Chile</span>
        <span>18 países identificados</span>
      </div>
      <div className="map-hover-label" aria-live="polite">
        {hoveredCountry ? <>
          <strong>{hoveredCountry.name}</strong>
          <span>{observationLabel(hoveredCountry.code)}</span>
          {hoveredSource && <span>Fuente: {hoveredSource.title}</span>}
        </> : <span>Pasa el cursor o usa el teclado para consultar valor, unidad y fuente</span>}
      </div>
      <svg className="regional-map" viewBox="0 0 800 545" role="group" aria-label={`Mapa de 18 países de América Latina para ${indicator.name} en ${year}`}>
        <defs>
          <pattern id="not-applicable-pattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#b7b9b3" strokeWidth="2" /></pattern>
          <filter id="country-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#173f35" floodOpacity="0.12" /></filter>
        </defs>
        <g className="countries-layer">
          {paths.map(({ code, path }) => {
            const country = countryByCode[code];
            const observation = getObservation(code, indicator.id, year);
            const availableModule = country.moduleStatus === 'beta';
            const label = observationLabel(code);
            const source = observation ? getSource(observation.provenance.sourceId)?.title : null;
            return (
              <path
                key={code}
                d={path}
                data-country={code}
                className={`country-shape ${availableModule ? 'has-module' : ''} ${selectedCountry === code ? 'selected' : ''} ${observation ? 'has-observation' : 'no-observation'}`}
                style={{ fill: observationColor(observation, indicator, extent) }}
                role="button"
                tabIndex={0}
                aria-label={`${country.name}: ${label}. ${source ? `Fuente: ${source}. ` : ''}${availableModule ? 'Abrir vista de país' : 'Módulo particular pendiente'}`}
                onMouseEnter={() => setHovered(code)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(code)}
                onBlur={() => setHovered(null)}
                onClick={() => onSelect(code)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(code);
                  }
                }}
              >
                <title>{country.name} — {label}{source ? ` — Fuente: ${source}` : ''}</title>
              </path>
            );
          })}
        </g>
      </svg>
      <div className="map-bottomline">
        <span>ISO Alpha-3</span>
        <span>Geometría: Natural Earth / world-atlas</span>
      </div>
      {selected && (
        <aside className="country-preview" aria-label={`Información de ${selected.name}`}>
          <button className="icon-button close-preview" onClick={onClosePreview} aria-label="Cerrar información del país"><X size={17} /></button>
          <span className="country-code">{selected.code}</span>
          <Construction size={22} aria-hidden="true" />
          <h3>{selected.name}</h3>
          <p>El país está incorporado al mapa y a la arquitectura. Su módulo particular se desarrollará en una fase posterior.</p>
          <span className="preview-status">Sin dato cargado en esta fase · {year}</span>
        </aside>
      )}
      <div className="map-module-hint">
        <span>Módulos disponibles</span>
        {countries.filter((country) => country.moduleStatus === 'beta').map((country) => (
          <button key={country.code} onClick={() => onSelect(country.code)}>{country.name}<ArrowUpRight size={13} /></button>
        ))}
      </div>
    </div>
  );
}
