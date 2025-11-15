import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DirectoryBrowser } from '../components/DirectoryBrowser';
import { useGalleryState } from '../hooks/useGalleryState';
import { clearDirectoryState } from '../utils/handleStorage';

type Tab = 'single' | 'directory';

const TAB_STORAGE_KEY = 'concepts-active-tab';
const GALLERY_PATH_STORAGE_KEY = 'concepts-gallery-path';

export function GalleryPage() {
  const params = useParams();
  const navigate = useNavigate();

  // Initialize tab from localStorage or default to 'directory' (since we're on gallery page)
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return (saved as Tab) || 'directory';
  });

  // Save tab selection to localStorage
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Get path from URL wildcard parameter
  // Use useMemo to stabilize array reference for React dependencies
  const pathParam = params['*'] || '';
  const currentPath = useMemo(
    () => (pathParam ? pathParam.split('/').map(decodeURIComponent).filter(Boolean) : []),
    [pathParam]
  );

  // Save current path to localStorage whenever it changes
  useEffect(() => {
    if (currentPath.length > 0) {
      localStorage.setItem(GALLERY_PATH_STORAGE_KEY, JSON.stringify(currentPath));
    }
  }, [currentPath]);

  // On mount, check if we should restore a saved path
  useEffect(() => {
    // Only restore if we're at the root of the gallery (no path in URL)
    if (pathParam === '') {
      const savedPath = localStorage.getItem(GALLERY_PATH_STORAGE_KEY);
      if (savedPath) {
        try {
          const parsedPath = JSON.parse(savedPath) as string[];
          if (parsedPath.length > 0) {
            const encodedPath = parsedPath.map(encodeURIComponent).join('/');
            navigate(`/gallery/${encodedPath}`, { replace: true });
          }
        } catch (error) {
          console.error('Failed to parse saved gallery path:', error);
        }
      }
    }
  }, []); // Run only on mount

  // Handle tab change
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'single') {
      // Current path is already saved in the useEffect above
      navigate('/');
    }
  };

  const { rootHandle, currentHandle, isRestoring, error } = useGalleryState(currentPath);

  const handleNavigateTo = async (path: string[]) => {
    const encodedPath = path.map(encodeURIComponent).join('/');
    navigate(`/gallery/${encodedPath}`);
  };

  const handleNavigateInto = async (dirName: string) => {
    const newPath = [...currentPath, dirName];
    await handleNavigateTo(newPath);
  };

  const handleNavigateUp = async () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      await handleNavigateTo(newPath);
    }
  };

  const handleSelectDifferentDirectory = async () => {
    await clearDirectoryState();
    navigate('/');
  };

  if (isRestoring) {
    return (
      <div className="container">
        <header>
          <h1>Concepts Gallery</h1>
          <p>Restoring session...</p>
        </header>
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading directory...</p>
        </div>
      </div>
    );
  }

  if (!rootHandle) {
    return (
      <div className="container">
        <header>
          <h1>Concepts Gallery</h1>
          <p>No directory selected</p>
        </header>
        <div className="status error" style={{ margin: '2rem' }}>
          No directory selected. Please go back and select a directory.
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (error || !currentHandle) {
    return (
      <div className="container">
        <header>
          <h1>Concepts Gallery</h1>
          <p>Error loading directory</p>
        </header>
        <div className="status error" style={{ margin: '2rem' }}>
          {error || 'Failed to load directory'}
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="button" onClick={() => navigate('/gallery')}>
            Go to Root
          </button>
          <button
            className="button secondary"
            style={{ marginLeft: '1rem' }}
            onClick={handleSelectDifferentDirectory}
          >
            Select Different Directory
          </button>
        </div>
      </div>
    );
  }

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
        <DirectoryBrowser
          currentHandle={currentHandle}
          currentPath={currentPath}
          onNavigateTo={handleNavigateTo}
          onNavigateInto={handleNavigateInto}
          onNavigateUp={handleNavigateUp}
          onSelectDifferentDirectory={handleSelectDifferentDirectory}
        />
      </div>
    </div>
  );
}
