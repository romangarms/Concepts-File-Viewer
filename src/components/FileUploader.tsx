import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileHandler } from '../hooks/useFileHandler.js';
import { addRecentFile } from '../utils/recentFiles.js';
import { RecentFiles } from './RecentFiles.js';

export function FileUploader() {
  const navigate = useNavigate();
  const { processFile } = useFileHandler();
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [recentFilesKey, setRecentFilesKey] = useState(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    try {
      // Read file as ArrayBuffer for storage
      const arrayBuffer = await file.arrayBuffer();

      // Save to recent files
      await addRecentFile(file.name, arrayBuffer);
      setRecentFilesKey(k => k + 1);

      // Process and navigate
      const data = await processFile(file);
      setStatus({
        message: `Loading ${data.strokes.length} strokes...`,
        type: 'success',
      });
      navigate('/viewer', { state: { data } });
    } catch (error) {
      setStatus({
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      });
    }
  }, [processFile, navigate]);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    const fileInput = fileInputRef.current;
    if (!dropZone || !fileInput) return;

    // Drag and drop handlers
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const highlight = () => dropZone.classList.add('drag-over');
    const unhighlight = () => dropZone.classList.remove('drag-over');

    const handleDrop = (e: DragEvent) => {
      unhighlight();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const handleInputChange = () => {
      const files = fileInput.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    // Set up event listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
      dropZone.addEventListener(event, preventDefaults);
    });
    ['dragenter', 'dragover'].forEach(event => {
      dropZone.addEventListener(event, highlight);
    });
    ['dragleave', 'drop'].forEach(event => {
      dropZone.addEventListener(event, unhighlight);
    });
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleInputChange);

    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        dropZone.removeEventListener(event, preventDefaults);
      });
      ['dragenter', 'dragover'].forEach(event => {
        dropZone.removeEventListener(event, highlight);
      });
      ['dragleave', 'drop'].forEach(event => {
        dropZone.removeEventListener(event, unhighlight);
      });
      dropZone.removeEventListener('drop', handleDrop);
      fileInput.removeEventListener('change', handleInputChange);
    };
  }, [handleFile]);

  return (
    <>
      <div ref={dropZoneRef} id="drop-zone" className="drop-zone">
        <div className="drop-zone-content">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h2>Drop .concept or .concepts file here</h2>
          <p>or</p>
          <label htmlFor="file-input" className="file-input-label">
            Choose File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept=".concept,.concepts"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <RecentFiles key={recentFilesKey} />

      {status && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </>
  );
}
