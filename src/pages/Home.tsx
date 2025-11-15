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
        <h1>Concepts File Viewer</h1>
        <p>View iOS Concepts app drawings in your browser</p>
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

      <div className="tab-content">
        {activeTab === 'single' && <FileUploader />}
        {activeTab === 'directory' && <DirectorySelector />}
      </div>
    </div>
  );
}
