import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { feature } from 'topojson-client';

const numericToIso = {
  '032': 'ARG', '068': 'BOL', '076': 'BRA', '152': 'CHL',
  '170': 'COL', '188': 'CRI', '214': 'DOM', '218': 'ECU',
  '222': 'SLV', '320': 'GTM', '340': 'HND', '484': 'MEX',
  '558': 'NIC', '591': 'PAN', '600': 'PRY', '604': 'PER',
  '858': 'URY', '862': 'VEN',
};

const sourceUrl = new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url);
const topology = JSON.parse(await readFile(sourceUrl, 'utf8'));
const collection = feature(topology, topology.objects.countries);
const features = collection.features
  .filter((item) => numericToIso[String(item.id).padStart(3, '0')])
  .map((item) => ({
    ...item,
    properties: { iso3: numericToIso[String(item.id).padStart(3, '0')] },
  }));

if (features.length !== 18) {
  throw new Error(`Se esperaban 18 geometrías y se obtuvieron ${features.length}.`);
}

const output = {
  type: 'FeatureCollection',
  metadata: {
    source: 'world-atlas 2.0.2 / Natural Earth, countries-110m',
    license: 'Natural Earth: dominio público; world-atlas: ISC',
    detail: 'Geometría generalizada para visualización regional; no apta para delimitaciones de precisión.',
  },
  features,
};

await mkdir(new URL('../src/data/geo/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/geo/latin-america.json', import.meta.url), JSON.stringify(output));
console.log('Geometría regional preparada: 18 países.');
