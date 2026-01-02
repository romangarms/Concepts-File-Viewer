import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader.js';
import { DirectorySelector } from '../components/DirectorySelector.js';
import { restoreDirectoryHandle } from '../utils/handleStorage.js';

type Tab = 'single' | 'directory';

const TAB_STORAGE_KEY = 'concepts-active-tab';
const GALLERY_PATH_STORAGE_KEY = 'concepts-gallery-path';

export function Home() {
  const navigate = useNavigate();

  // Initialize tab from localStorage or default to 'single'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return (saved as Tab) || 'single';
  });

  const [guideExpanded, setGuideExpanded] = useState(false);

  // Save tab selection to localStorage
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Handle tab change - navigate to gallery if directory was already selected
  const handleTabChange = async (tab: Tab) => {
    setActiveTab(tab);

    if (tab === 'directory') {
      // Check if a directory was already selected
      const rootHandle = await restoreDirectoryHandle();
      if (rootHandle) {
        // Navigate to gallery, which will restore the saved path
        navigate('/gallery');
      }
      // If no directory selected, stay on Home and show DirectorySelector
    }
  };

  return (
    <div className="container">
      <header>
        <img src="favicon.png" alt="Logo" className="header-logo" />
        <div className="header-text">
          <h1>Concepts File Viewer</h1>
          <p>View iOS Concepts app drawings in your browser</p>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => handleTabChange('single')}
        >
          Single File
        </button>
        <button
          className={`tab ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => handleTabChange('directory')}
        >
          Browse Directory
        </button>
      </div>

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
              <h3>Single File</h3>
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

      <div className="tab-content">
        {activeTab === 'single' && <FileUploader />}
        {activeTab === 'directory' && <DirectorySelector />}
      </div>
    </div>
  );
}
