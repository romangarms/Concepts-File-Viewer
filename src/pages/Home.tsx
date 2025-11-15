import { useState, useEffect } from 'react';
import { FileUploader } from '../components/FileUploader.js';
import { DirectorySelector } from '../components/DirectorySelector.js';

type Tab = 'single' | 'directory';

const TAB_STORAGE_KEY = 'concepts-active-tab';

export function Home() {
  // Initialize tab from localStorage or default to 'single'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return (saved as Tab) || 'single';
  });

  // Save tab selection to localStorage
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  return (
    <div className="container">
      <header>
        <h1>Concepts File Viewer</h1>
        <p>View iOS Concepts app drawings in your browser</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          Single File
        </button>
        <button
          className={`tab ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          Browse Directory
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'single' && <FileUploader />}
        {activeTab === 'directory' && <DirectorySelector />}
      </div>
    </div>
  );
}
