import { useState, useEffect } from 'react';
import {
  restoreDirectoryHandle,
  navigateToPath,
} from '../utils/handleStorage';

/**
 * Hook for managing gallery state
 * Path now comes from URL, this hook only manages the directory handle
 */
export function useGalleryState(pathFromUrl: string[]) {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentHandle, setCurrentHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore root handle from IndexedDB on mount
  useEffect(() => {
    restoreDirectoryHandle()
      .then((handle) => {
        setRootHandle(handle);
      })
      .catch((err) => {
        console.error('Failed to restore directory handle:', err);
        setError('Failed to restore directory');
      })
      .finally(() => {
        setIsRestoring(false);
      });
  }, []);

  // Navigate to current path whenever rootHandle or path changes
  useEffect(() => {
    if (!rootHandle) {
      setCurrentHandle(null);
      return;
    }

    let cancelled = false;

    navigateToPath(rootHandle, pathFromUrl)
      .then((handle) => {
        if (!cancelled) {
          setCurrentHandle(handle);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to navigate to path:', err);
          setError(`Failed to navigate to: ${pathFromUrl.join('/')}`);
          setCurrentHandle(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rootHandle, pathFromUrl]);

  return {
    rootHandle,
    currentHandle,
    isRestoring,
    error,
  };
}
