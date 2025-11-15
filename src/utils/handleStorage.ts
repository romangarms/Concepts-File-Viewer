import { get, set, del } from 'idb-keyval';

const ROOT_HANDLE_KEY = 'concepts-root-directory-handle';

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Verify that we have read permission for a directory handle
 */
export async function verifyPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  const options = { mode: 'read' as FileSystemPermissionMode };

  // Check if permission was already granted
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

/**
 * Store the root directory handle in IndexedDB
 * Note: Path is now stored in URL, not IndexedDB
 */
export async function saveDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    await set(ROOT_HANDLE_KEY, rootHandle);
  } catch (error) {
    console.error('Failed to save directory handle:', error);
    throw error;
  }
}

/**
 * Restore the directory handle from IndexedDB
 * Returns null if no saved handle or permission denied
 */
export async function restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const rootHandle = await get<FileSystemDirectoryHandle>(ROOT_HANDLE_KEY);

    if (!rootHandle) {
      return null;
    }

    // Verify we still have permission
    const hasPermission = await verifyPermission(rootHandle);
    if (!hasPermission) {
      // Permission denied - clear stored state
      await clearDirectoryState();
      return null;
    }

    return rootHandle;
  } catch (error) {
    console.error('Failed to restore directory handle:', error);
    await clearDirectoryState();
    return null;
  }
}

/**
 * Clear stored directory handle from IndexedDB
 */
export async function clearDirectoryState(): Promise<void> {
  try {
    await del(ROOT_HANDLE_KEY);
  } catch (error) {
    console.error('Failed to clear directory state:', error);
  }
}

/**
 * Navigate to a specific path from the root handle
 * Returns the directory handle at the specified path
 */
export async function navigateToPath(
  rootHandle: FileSystemDirectoryHandle,
  path: string[]
): Promise<FileSystemDirectoryHandle> {
  let currentHandle = rootHandle;

  for (const dirName of path) {
    try {
      currentHandle = await currentHandle.getDirectoryHandle(dirName);
    } catch (error) {
      throw new Error(`Failed to navigate to directory: ${path.join('/')}`);
    }
  }

  return currentHandle;
}
