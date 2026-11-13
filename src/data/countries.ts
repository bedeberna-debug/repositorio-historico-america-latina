import type { Country, CountryCode } from '../types/data';

export const countries: Country[] = [
  { code: 'ARG', name: 'Argentina', mapName: 'Argentina', moduleStatus: 'beta' },
  { code: 'BOL', name: 'Bolivia', mapName: 'Bolivia', moduleStatus: 'planned' },
  { code: 'BRA', name: 'Brasil', mapName: 'Brasil', moduleStatus: 'planned' },
  { code: 'CHL', name: 'Chile', mapName: 'Chile', moduleStatus: 'beta' },
  { code: 'COL', name: 'Colombia', mapName: 'Colombia', moduleStatus: 'planned' },
  { code: 'CRI', name: 'Costa Rica', mapName: 'Costa Rica', moduleStatus: 'planned' },
  { code: 'DOM', name: 'República Dominicana', mapName: 'Rep. Dominicana', moduleStatus: 'planned' },
  { code: 'ECU', name: 'Ecuador', mapName: 'Ecuador', moduleStatus: 'planned' },
  { code: 'SLV', name: 'El Salvador', mapName: 'El Salvador', moduleStatus: 'planned' },
  { code: 'GTM', name: 'Guatemala', mapName: 'Guatemala', moduleStatus: 'planned' },
  { code: 'HND', name: 'Honduras', mapName: 'Honduras', moduleStatus: 'planned' },
  { code: 'MEX', name: 'México', mapName: 'México', moduleStatus: 'planned' },
  { code: 'NIC', name: 'Nicaragua', mapName: 'Nicaragua', moduleStatus: 'planned' },
  { code: 'PAN', name: 'Panamá', mapName: 'Panamá', moduleStatus: 'planned' },
  { code: 'PRY', name: 'Paraguay', mapName: 'Paraguay', moduleStatus: 'planned' },
  { code: 'PER', name: 'Perú', mapName: 'Perú', moduleStatus: 'planned' },
  { code: 'URY', name: 'Uruguay', mapName: 'Uruguay', moduleStatus: 'planned' },
  { code: 'VEN', name: 'Venezuela', mapName: 'Venezuela', moduleStatus: 'planned' },
];

export const countryByCode = Object.fromEntries(countries.map((country) => [country.code, country])) as Record<CountryCode, Country>;

export function isCountryCode(value: string): value is CountryCode {
  return value in countryByCode;
}
