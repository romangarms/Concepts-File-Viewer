import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isFileSystemAccessSupported, saveDirectoryHandle } from '../utils/handleStorage';

export function DirectorySelector() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSelectDirectory = async () => {
    // Check if File System Access API is supported
    if (!isFileSystemAccessSupported()) {
      setError(
        'Directory browsing is only supported in Chrome and Edge browsers. ' +
        'Please use the "Single File" tab to open individual .concept files.'
      );
      return;
    }

    setError(null);

    try {
      // Show directory picker
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
      });

      // Save the directory handle to IndexedDB
      await saveDirectoryHandle(dirHandle);

      // Navigate to gallery root
      navigate('/gallery');
    } catch (err) {
      // User cancelled or other error
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // User cancelled - not an error
          return;
        }
        setError(err.message);
      } else {
        setError('Failed to select directory');
      }
    }
  };

  return (
    <div className="directory-selector">
      <div className="directory-selector-content">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>

        <h2>Browse Concepts Directory</h2>
        <p>
          Select a directory containing .concept files to browse with thumbnails.
          Subdirectories will be loaded as you navigate into them.
        </p>

        <button className="button" onClick={handleSelectDirectory}>
          Select Directory
        </button>

        {error && (
          <div className="status error" style={{ marginTop: '1rem' }}>
            {error}
          </div>
        )}

        {!isFileSystemAccessSupported() && (
          <div className="status error" style={{ marginTop: '1rem' }}>
            Directory browsing requires Chrome or Edge browser.
            <br />
            Use the "Single File" tab for other browsers.
          </div>
        )}
      </div>
    </div>
  );
}
