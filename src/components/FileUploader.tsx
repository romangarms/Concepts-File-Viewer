import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileHandler } from '../hooks/useFileHandler.js';
import type { DrawingData } from '../types.js';

export function FileUploader() {
  const navigate = useNavigate();
  const { setupDragAndDrop, setupFileInput } = useFileHandler();
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFileLoaded = (data: DrawingData) => {
      setStatus({
        message: `Loading ${data.strokes.length} strokes...`,
        type: 'success',
      });

      // Navigate to viewer with data
      navigate('/viewer', { state: { data } });
    };

    const handleError = (error: Error) => {
      setStatus({
        message: `Error: ${error.message}`,
        type: 'error',
      });
    };

    setupDragAndDrop(dropZoneRef.current, handleFileLoaded, handleError);
    setupFileInput(fileInputRef.current, handleFileLoaded, handleError);
  }, [setupDragAndDrop, setupFileInput, navigate]);

  return (
    <>
      <div ref={dropZoneRef} id="drop-zone" className="drop-zone">
        <div className="drop-zone-content">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h2>Drop .concept file here</h2>
          <p>or</p>
          <label htmlFor="file-input" className="file-input-label">
            Choose File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept=".concept"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {status && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </>
  );
}
