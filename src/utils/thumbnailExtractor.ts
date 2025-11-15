import JSZip from 'jszip';

/**
 * Extracts the Thumb.jpg from a .concept file (which is a ZIP archive)
 * and returns it as a base64 data URL for display
 */
export async function extractThumbnail(file: File): Promise<string | null> {
  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the ZIP archive
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Try to find Thumb.jpg in the archive
    const thumbFile = zip.file('Thumb.jpg');

    if (!thumbFile) {
      console.warn(`No Thumb.jpg found in ${file.name}`);
      return null;
    }

    // Extract the thumbnail as a Uint8Array
    const thumbData = await thumbFile.async('uint8array');

    // Convert to base64 data URL
    const base64 = btoa(
      Array.from(thumbData)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`Failed to extract thumbnail from ${file.name}:`, error);
    return null;
  }
}

/**
 * Batch extract thumbnails from multiple .concept files
 * Returns a Map of file paths to thumbnail data URLs
 */
export async function extractThumbnails(
  files: File[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const thumbnails = new Map<string, string>();

  for (let i = 0; i < files.length; i++) {
    // Check if cancelled
    if (signal?.aborted) {
      break;
    }

    const file = files[i];
    const thumbnail = await extractThumbnail(file);

    if (thumbnail) {
      // Use webkitRelativePath if available, otherwise use name
      const path = (file as any).webkitRelativePath || file.name;
      thumbnails.set(path, thumbnail);
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return thumbnails;
}
