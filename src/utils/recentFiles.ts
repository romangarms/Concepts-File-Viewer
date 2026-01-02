import { get, set } from 'idb-keyval';

const RECENT_FILES_KEY = 'concepts-recent-files';
const MAX_RECENT_FILES = 10;

export interface RecentFile {
  id: string;
  name: string;
  data: ArrayBuffer;
  size: number;
  lastOpened: number;
}

// Serializable version for IndexedDB (ArrayBuffer doesn't serialize well directly)
interface StoredRecentFile {
  id: string;
  name: string;
  data: number[]; // Uint8Array as number[]
  size: number;
  lastOpened: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function toStoredFormat(file: RecentFile): StoredRecentFile {
  return {
    ...file,
    data: Array.from(new Uint8Array(file.data)),
  };
}

function fromStoredFormat(stored: StoredRecentFile): RecentFile {
  return {
    ...stored,
    data: new Uint8Array(stored.data).buffer,
  };
}

/**
 * Get all recent files, sorted by most recently opened
 */
export async function getRecentFiles(): Promise<RecentFile[]> {
  try {
    const stored = await get<StoredRecentFile[]>(RECENT_FILES_KEY);
    if (!stored) return [];
    return stored.map(fromStoredFormat).sort((a, b) => b.lastOpened - a.lastOpened);
  } catch (error) {
    console.error('Failed to get recent files:', error);
    return [];
  }
}

/**
 * Add a file to recent files list
 * If the file already exists (by name), update its lastOpened time
 */
export async function addRecentFile(name: string, data: ArrayBuffer): Promise<void> {
  try {
    const files = await getRecentFiles();

    // Check if file with same name already exists
    const existingIndex = files.findIndex((f) => f.name === name);

    if (existingIndex !== -1) {
      // Update existing file
      files[existingIndex].data = data;
      files[existingIndex].size = data.byteLength;
      files[existingIndex].lastOpened = Date.now();
    } else {
      // Add new file
      const newFile: RecentFile = {
        id: generateId(),
        name,
        data,
        size: data.byteLength,
        lastOpened: Date.now(),
      };
      files.unshift(newFile);
    }

    // Keep only the most recent files
    const trimmed = files.slice(0, MAX_RECENT_FILES);

    // Store in IndexedDB
    await set(RECENT_FILES_KEY, trimmed.map(toStoredFormat));
  } catch (error) {
    console.error('Failed to add recent file:', error);
    throw error;
  }
}

/**
 * Remove a file from recent files by id
 */
export async function removeRecentFile(id: string): Promise<void> {
  try {
    const files = await getRecentFiles();
    const filtered = files.filter((f) => f.id !== id);
    await set(RECENT_FILES_KEY, filtered.map(toStoredFormat));
  } catch (error) {
    console.error('Failed to remove recent file:', error);
    throw error;
  }
}

/**
 * Clear all recent files
 */
export async function clearRecentFiles(): Promise<void> {
  try {
    await set(RECENT_FILES_KEY, []);
  } catch (error) {
    console.error('Failed to clear recent files:', error);
    throw error;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
