import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbnailGrid } from './ThumbnailGrid';
import { useFileHandler } from '../hooks/useFileHandler';
import {
  scanDirectoryLazy,
  loadThumbnails,
  getPathBreadcrumbs,
  type FileHandleInfo,
  type DirectoryHandleInfo,
  type DirectoryContents,
} from '../utils/lazyDirectoryScanner';

interface DirectoryBrowserProps {
  currentHandle: FileSystemDirectoryHandle;
  currentPath: string[];
  onNavigateTo: (path: string[]) => Promise<void>;
  onNavigateInto: (dirName: string) => Promise<void>;
  onNavigateUp: () => Promise<void>;
}

export function DirectoryBrowser({
  currentHandle,
  currentPath,
  onNavigateTo,
  onNavigateInto,
  onNavigateUp,
}: DirectoryBrowserProps) {
  const navigate = useNavigate();
  const { processFile } = useFileHandler();

  const [contents, setContents] = useState<DirectoryContents | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current directory contents when current handle changes
  useEffect(() => {
    if (!currentHandle) {
      return;
    }

    let cancelled = false;

    const loadDirectory = async () => {
      setIsScanning(true);
      setError(null);

      try {
        // Scan directory for files and subdirectories
        const directoryContents = await scanDirectoryLazy(currentHandle);

        if (cancelled) return;

        setContents(directoryContents);
        setIsScanning(false);

        // Start loading thumbnails after scanning completes
        setIsLoadingThumbnails(true);

        await loadThumbnails(directoryContents.files, () => {
          // Force re-render as thumbnails load
          setContents({ ...directoryContents });
        });

        if (cancelled) return;

        setIsLoadingThumbnails(false);
      } catch (err) {
        if (cancelled) return;

        console.error('Failed to load directory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load directory');
        setIsScanning(false);
        setIsLoadingThumbnails(false);
      }
    };

    loadDirectory();

    return () => {
      cancelled = true;
    };
  }, [currentHandle]);

  const breadcrumbs = getPathBreadcrumbs(currentPath);

  const handleBreadcrumbClick = (path: string[]) => {
    onNavigateTo(path).catch((err) => {
      console.error('Navigation failed:', err);
      setError('Failed to navigate to directory');
    });
  };

  const handleDirectoryClick = (directory: DirectoryHandleInfo) => {
    onNavigateInto(directory.name).catch((err) => {
      console.error('Navigation failed:', err);
      setError('Failed to enter directory');
    });
  };

  const handleFileClick = async (file: FileHandleInfo) => {
    try {
      // Get the actual File object from the handle
      const fileObj = await file.fileHandle.getFile();

      // Process the file
      const data = await processFile(fileObj);

      // Navigate to viewer with data and context
      navigate('/viewer', {
        state: {
          data,
          fromGallery: true,
          galleryPath: currentPath,
        },
      });
    } catch (error) {
      console.error('Failed to load concept file:', error);
      alert(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBack = () => {
    if (currentPath.length > 0) {
      onNavigateUp().catch((err) => {
        console.error('Navigation failed:', err);
        setError('Failed to navigate up');
      });
    }
  };

  if (error) {
    return (
      <div className="status error" style={{ margin: '2rem' }}>
        {error}
      </div>
    );
  }

  if (!contents) {
    return null;
  }

  return (
    <div className="gallery-container">
      <div className="breadcrumb">
        {currentPath.length > 0 && (
          <button className="back-button" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        )}

        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path.join('/')} className="breadcrumb-item">
            {index > 0 && <span className="breadcrumb-separator">/</span>}
            {index === breadcrumbs.length - 1 ? (
              <span className="breadcrumb-current">{crumb.name}</span>
            ) : (
              <a
                className="breadcrumb-link"
                onClick={() => handleBreadcrumbClick(crumb.path)}
              >
                {crumb.name}
              </a>
            )}
          </div>
        ))}

        {isLoadingThumbnails && (
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#667eea' }}>
            Loading thumbnails...
          </div>
        )}
      </div>

      <div className="gallery-content">
        {isScanning ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Scanning directory...</p>
          </div>
        ) : (
          <ThumbnailGrid
            files={contents.files}
            subdirectories={contents.subdirectories}
            onFileClick={handleFileClick}
            onDirectoryClick={handleDirectoryClick}
          />
        )}
      </div>
    </div>
  );
}
