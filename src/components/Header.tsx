import { BookOpen, Map } from 'lucide-react';

interface HeaderProps {
  route: 'regional' | 'country' | 'methodology';
  navigate: (path: string) => void;
}

export function Header({ route, navigate }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <div className="header-inner">
        <button className="brand" onClick={() => navigate('/')} aria-label="Ir al explorador regional">
          <span className="brand-mark" aria-hidden="true"><span>R</span><i /></span>
          <span className="brand-copy"><strong>Repositorio Histórico</strong><small>Datos de América Latina</small></span>
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className={route !== 'methodology' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('/')}>
            <Map size={16} aria-hidden="true" /> Explorador
          </button>
          <button className={route === 'methodology' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('/metodologia')}>
            <BookOpen size={16} aria-hidden="true" /> Metodología
          </button>
        </nav>
        <span className="beta-badge"><i /> Beta · Fase 06</span>
      </div>
    </header>
  );
}
