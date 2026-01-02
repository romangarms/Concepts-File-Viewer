import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader.js';
import {
  isFileSystemAccessSupported,
  saveDirectoryHandle,
  restoreDirectoryHandle,
} from '../utils/handleStorage.js';

export function Home() {
  const navigate = useNavigate();
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);

  const handleBrowseDirectory = async () => {
    if (!isFileSystemAccessSupported()) {
      setDirError('Directory browsing requires Chrome or Edge browser.');
      return;
    }

    setDirError(null);

    // Check if a directory was already selected
    const existingHandle = await restoreDirectoryHandle();
    if (existingHandle) {
      navigate('/gallery');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      await saveDirectoryHandle(dirHandle);
      navigate('/gallery');
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setDirError(err.message);
      }
    }
  };

  return (
    <div className="container">
      <header>
        <img src="favicon.png" alt="Logo" className="header-logo" />
        <div className="header-text">
          <h1>Concepts File Viewer</h1>
          <p>View Concepts app drawings in your browser</p>
        </div>
      </header>

      <div className="guide-section">
        <button
          className="guide-toggle"
          onClick={() => setGuideExpanded(!guideExpanded)}
        >
          <span>How do I get .concepts files?</span>
          <svg
            className={`guide-chevron ${guideExpanded ? 'expanded' : ''}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {guideExpanded && (
          <div className="guide-content">
            <div className="guide-column">
              <h3>Drop or Choose File</h3>
              <p>Export a drawing from the Concepts app:</p>
              <ol>
                <li>Open your drawing in Concepts</li>
                <li>Tap the <strong>Share</strong> button</li>
                <li>Select <strong>Export</strong> → <strong>Concepts</strong></li>
                <li>Save to Files or AirDrop to your computer</li>
              </ol>
            </div>

            <div className="guide-column">
              <h3>Browse Directory</h3>
              <p>Access your full Concepts library via iCloud:</p>
              <ol>
                <li>Enable <strong>iCloud Drive</strong> sync on your device</li>
                <li>
                  <strong>macOS:</strong> Enable iCloud Drive in System Settings → Apple ID → iCloud
                </li>
                <li>
                  <strong>Windows:</strong> Install <a href="https://support.apple.com/en-us/HT204283" target="_blank" rel="noopener noreferrer">iCloud for Windows</a>
                </li>
                <li>Navigate to: <code>iCloud Drive/Concepts/drawings/</code></li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="main-content">
        <FileUploader
          onBrowseDirectory={handleBrowseDirectory}
          browseError={dirError}
        />
      </div>
    </div>
  );
}
