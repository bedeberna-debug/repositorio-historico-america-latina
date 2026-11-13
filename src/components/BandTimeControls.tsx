interface BandTimeControlsProps {
  bandName: string;
  onZoom: (direction: 'in' | 'out') => void;
  onPan: (direction: -1 | 1) => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canPanBack: boolean;
  canPanForward: boolean;
}

export function BandTimeControls({
  bandName, onZoom, onPan, canZoomIn, canZoomOut, canPanBack, canPanForward,
}: BandTimeControlsProps) {
  const controls = [
    { symbol: '+', action: 'Acercar', label: `Acercar intervalo en ${bandName}`, onClick: () => onZoom('in'), disabled: !canZoomIn },
    { symbol: '−', action: 'Alejar', label: `Alejar intervalo en ${bandName}`, onClick: () => onZoom('out'), disabled: !canZoomOut },
    { symbol: '←', action: 'Desplazar hacia atrás', label: `Desplazar hacia atrás en ${bandName}`, onClick: () => onPan(-1), disabled: !canPanBack },
    { symbol: '→', action: 'Desplazar hacia adelante', label: `Desplazar hacia adelante en ${bandName}`, onClick: () => onPan(1), disabled: !canPanForward },
  ];
  return <div className="band-time-controls" role="group" aria-label={`Controles temporales de ${bandName}`}>
    {controls.map((control) => <button
      key={control.action}
      type="button"
      aria-label={control.label}
      title={control.label}
      onClick={control.onClick}
      disabled={control.disabled}
    ><span aria-hidden="true">{control.symbol}</span></button>)}
  </div>;
}
