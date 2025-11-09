interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onBack: () => void;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset, onBack, onRotateClockwise, onRotateCounterClockwise }: Readonly<ZoomControlsProps>) {
  return (
    <div className="zoom-controls">
      <button onClick={onZoomIn} className="zoom-button" title="Zoom In">
        +
      </button>
      <button onClick={onZoomOut} className="zoom-button" title="Zoom Out">
        −
      </button>
      <button onClick={onRotateCounterClockwise} className="zoom-button" title="Rotate Counter-Clockwise">
        ↶
      </button>
      <button onClick={onRotateClockwise} className="zoom-button" title="Rotate Clockwise">
        ↷
      </button>
      <button onClick={onReset} className="zoom-button" title="Reset View">
        ⌖
      </button>
      <button onClick={onBack} className="zoom-button" title="Back to File Selector">
        ←
      </button>
    </div>
  );
}
