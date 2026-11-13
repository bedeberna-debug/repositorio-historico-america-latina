import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { CURRENT_YEAR, START_YEAR } from '../App';

interface TimelineProps {
  year: number;
  setYear: (year: number) => void;
  compact?: boolean;
}

export function Timeline({ year, setYear, compact = false }: TimelineProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (year >= CURRENT_YEAR) {
        setPlaying(false);
      } else {
        setYear(year + 1);
      }
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing, year, setYear]);

  const togglePlayback = () => {
    if (!playing && year >= CURRENT_YEAR) setYear(START_YEAR);
    setPlaying((value) => !value);
  };

  return (
    <section className={compact ? 'timeline compact' : 'timeline'} aria-label="Línea de tiempo">
      <div className="timeline-heading">
        <div className="step-label"><span>{compact ? '02' : '02'}</span><h2>Recorre el tiempo</h2></div>
        <output htmlFor={compact ? 'country-year' : 'regional-year'} className="year-output" aria-live="polite">{year}</output>
      </div>
      <div className="timeline-control">
        <button className="play-button" onClick={togglePlayback} aria-label={playing ? 'Pausar reproducción' : 'Reproducir línea de tiempo'}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <div className="range-wrap">
          <input
            id={compact ? 'country-year' : 'regional-year'}
            aria-label="Año seleccionado"
            type="range"
            min={START_YEAR}
            max={CURRENT_YEAR}
            value={year}
            onChange={(event) => { setPlaying(false); setYear(Number(event.target.value)); }}
            style={{ '--range-progress': `${((year - START_YEAR) / (CURRENT_YEAR - START_YEAR)) * 100}%` } as React.CSSProperties}
          />
          <div className="timeline-ticks" aria-hidden="true"><span>{START_YEAR}</span><span>1975</span><span>2000</span><span>{CURRENT_YEAR}</span></div>
        </div>
      </div>
      {!compact && <p className="timeline-note">El recorrido respeta los vacíos: no interpola ni completa años sin observaciones.</p>}
    </section>
  );
}
