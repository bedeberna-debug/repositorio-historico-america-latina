import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { RegionalView } from './pages/RegionalView';
import { CountryView } from './pages/CountryView';
import { MethodologyView } from './pages/MethodologyView';
import { isCountryCode } from './data/countries';

export const START_YEAR = 1950;
export const CURRENT_YEAR = new Date().getFullYear();
export const DEFAULT_YEAR = 2024;

type Route = { view: 'regional' } | { view: 'methodology' } | { view: 'country'; code: 'ARG' | 'CHL' };

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  const match = hash.match(/^\/pais\/([A-Z]{3})$/);
  if (match && isCountryCode(match[1]) && (match[1] === 'ARG' || match[1] === 'CHL')) {
    return { view: 'country', code: match[1] };
  }
  if (hash === '/metodologia') return { view: 'methodology' };
  return { view: 'regional' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [indicatorId, setIndicatorId] = useState('gdp-per-capita-ppp-2021');
  const [year, setYear] = useState(DEFAULT_YEAR);

  useEffect(() => {
    const handleHash = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = (path: string) => {
    if (window.location.hash === `#${path}`) {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = path;
    }
  };

  return (
    <div className="app-shell">
      <Header route={route.view} navigate={navigate} />
      <main id="main-content">
        {route.view === 'regional' && (
          <RegionalView indicatorId={indicatorId} setIndicatorId={setIndicatorId} year={year} setYear={setYear} navigate={navigate} />
        )}
        {route.view === 'country' && (
          <CountryView code={route.code} indicatorId={indicatorId} setIndicatorId={setIndicatorId} year={year} setYear={setYear} navigate={navigate} />
        )}
        {route.view === 'methodology' && <MethodologyView />}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span>Repositorio Histórico de Datos de América Latina</span>
          <span>Fase 06 · Tabla de datos y descargas verificables</span>
        </div>
      </footer>
    </div>
  );
}
