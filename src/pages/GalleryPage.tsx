import { useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DirectoryBrowser } from '../components/DirectoryBrowser';
import { useGalleryState } from '../hooks/useGalleryState';
import { clearDirectoryState, saveDirectoryHandle } from '../utils/handleStorage';

const GALLERY_PATH_STORAGE_KEY = 'concepts-gallery-path';

export function GalleryPage() {
  const params = useParams();
  const navigate = useNavigate();

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
          localStorage.removeItem(GALLERY_PATH_STORAGE_KEY);
        }
      }
    }
  }, []); // Run only on mount

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
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      await clearDirectoryState();
      await saveDirectoryHandle(dirHandle);
      // Navigate to gallery root with new directory
      navigate('/gallery', { replace: true });
      // Force a page reload to reset state with new directory
      window.location.reload();
    } catch (err) {
      // User cancelled the picker - do nothing, stay on current view
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to select directory:', err);
      }
    }
  };

  if (isRestoring) {
    return (
      <div className="container">
        <header>
          <Link to="/"><img src="favicon.png" alt="Logo" className="header-logo" /></Link>
          <div className="header-text">
            <h1>Concepts File Viewer</h1>
            <p>Restoring session...</p>
          </div>
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
          <Link to="/"><img src="favicon.png" alt="Logo" className="header-logo" /></Link>
          <div className="header-text">
            <h1>Concepts File Viewer</h1>
            <p>No directory selected</p>
          </div>
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
          <Link to="/"><img src="favicon.png" alt="Logo" className="header-logo" /></Link>
          <div className="header-text">
            <h1>Concepts File Viewer</h1>
            <p>Error loading directory</p>
          </div>
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
        <Link to="/"><img src="favicon.png" alt="Logo" className="header-logo" /></Link>
        <div className="header-text">
          <h1>Concepts File Viewer</h1>
          <p>View Concepts app drawings in your browser</p>
        </div>
      </header>

      <div className="action-bar">
        <button className="button secondary" onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </button>
      </div>

      <div className="main-content">
        <DirectoryBrowser
          currentHandle={currentHandle}
          currentPath={currentPath}
          rootFolderName={rootHandle.name}
          onNavigateTo={handleNavigateTo}
          onNavigateInto={handleNavigateInto}
          onNavigateUp={handleNavigateUp}
          onSelectDifferentDirectory={handleSelectDifferentDirectory}
        />
      </div>
    </div>
  );
}
