import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DirectoryBrowser } from '../components/DirectoryBrowser';
import { useGalleryState } from '../hooks/useGalleryState';
import { clearDirectoryState } from '../utils/handleStorage';

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
        <h1>Concepts Gallery</h1>
        <p>
          Browse your .concept files
          <button
            className="button secondary"
            style={{ marginLeft: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={handleSelectDifferentDirectory}
          >
            Select Different Directory
          </button>
        </p>
      </header>

      <DirectoryBrowser
        currentHandle={currentHandle}
        currentPath={currentPath}
        onNavigateTo={handleNavigateTo}
        onNavigateInto={handleNavigateInto}
        onNavigateUp={handleNavigateUp}
      />
    </div>
  );
}
