import { extractThumbnail } from './thumbnailExtractor';

export interface FileHandleInfo {
  name: string;              // Display name (without .concept extension)
  fullName: string;          // Full filename including extension
  fileHandle: FileSystemFileHandle;
  size: number;
  modified: number;
  thumbnail?: string;        // Base64 data URL, loaded on-demand
  isLoading?: boolean;       // True while thumbnail is being extracted
}

export interface DirectoryHandleInfo {
  name: string;
  dirHandle: FileSystemDirectoryHandle;
  fileCount?: number;        // Number of .concept files, counted on-demand
}

export interface DirectoryContents {
  files: FileHandleInfo[];
  subdirectories: DirectoryHandleInfo[];
}

/**
 * Scan a directory for .concept files and subdirectories
 * Only scans immediate children, no recursion
 * Does NOT extract thumbnails (call loadThumbnails separately)
 */
export async function scanDirectoryLazy(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (current: number) => void
): Promise<DirectoryContents> {
  const files: FileHandleInfo[] = [];
  const subdirectories: DirectoryHandleInfo[] = [];

  let count = 0;

  try {
    for await (const entry of dirHandle.values()) {
      // Skip hidden files and directories (starting with ".")
      if (entry.name.startsWith('.')) {
        continue;
      }

      count++;
      if (onProgress) {
        onProgress(count);
      }

      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.concept')) {
        // Get file metadata without reading contents
        const file = await entry.getFile();

        files.push({
          name: entry.name.replace(/\.concept$/i, ''),
          fullName: entry.name,
          fileHandle: entry,
          size: file.size,
          modified: file.lastModified,
          // thumbnail will be loaded on-demand
        });
      } else if (entry.kind === 'directory') {
        subdirectories.push({
          name: entry.name,
          dirHandle: entry,
          // fileCount will be counted on-demand if needed
        });
      }
    }

    // Sort files and directories alphabetically
    files.sort((a, b) => a.name.localeCompare(b.name));
    subdirectories.sort((a, b) => a.name.localeCompare(b.name));

    return { files, subdirectories };
  } catch (error) {
    console.error('Failed to scan directory:', error);
    throw new Error('Failed to read directory contents');
  }
}

/**
 * Load thumbnail for a single file
 * Updates the fileInfo object in place
 */
export async function loadThumbnailForFile(
  fileInfo: FileHandleInfo
): Promise<void> {
  if (fileInfo.thumbnail || fileInfo.isLoading) {
    return; // Already loaded or loading
  }

  fileInfo.isLoading = true;

  try {
    const file = await fileInfo.fileHandle.getFile();
    const thumbnail = await extractThumbnail(file);
    fileInfo.thumbnail = thumbnail || undefined;
  } catch (error) {
    console.error(`Failed to load thumbnail for ${fileInfo.name}:`, error);
    fileInfo.thumbnail = undefined;
  } finally {
    fileInfo.isLoading = false;
  }
}

/**
 * Load thumbnails for multiple files in parallel
 * Returns when all thumbnails are loaded
 */
export async function loadThumbnails(
  files: FileHandleInfo[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const total = files.length;
  let completed = 0;

  // Load thumbnails in batches of 5 to avoid overwhelming the system
  const batchSize = 5;

  for (let i = 0; i < files.length; i += batchSize) {
    if (signal?.aborted) {
      throw new Error('Thumbnail loading cancelled');
    }

    const batch = files.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (fileInfo) => {
        await loadThumbnailForFile(fileInfo);
        completed++;
        if (onProgress) {
          onProgress(completed, total);
        }
      })
    );
  }
}

/**
 * Count the number of .concept files in a directory (recursive)
 * Used to show file count for subdirectories
 */
export async function countConceptFiles(
  dirHandle: FileSystemDirectoryHandle
): Promise<number> {
  let count = 0;

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.concept')) {
        count++;
      } else if (entry.kind === 'directory') {
        // Recursively count files in subdirectories
        count += await countConceptFiles(entry);
      }
    }
  } catch (error) {
    console.error('Failed to count files:', error);
  }

  return count;
}

/**
 * Get breadcrumb path components for navigation
 */
export function getPathBreadcrumbs(path: string[]): Array<{ name: string; path: string[] }> {
  const breadcrumbs: Array<{ name: string; path: string[] }> = [
    { name: 'Root', path: [] },
  ];

  for (let i = 0; i < path.length; i++) {
    breadcrumbs.push({
      name: path[i],
      path: path.slice(0, i + 1),
    });
  }

  return breadcrumbs;
}
