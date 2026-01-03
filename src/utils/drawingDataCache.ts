import { get, set, del } from 'idb-keyval';
import type { DrawingData } from '../types/index.js';

const DRAWING_DATA_KEY = 'conceptsDrawingData';

/**
 * Save drawing data to IndexedDB
 * Uses IndexedDB instead of localStorage to handle large files (30MB+)
 */
export async function saveDrawingData(data: DrawingData): Promise<void> {
  try {
    await set(DRAWING_DATA_KEY, data);
  } catch (error) {
    console.error('Failed to save drawing data:', error);
    throw error;
  }
}

/**
 * Get drawing data from IndexedDB
 */
export async function getDrawingData(): Promise<DrawingData | null> {
  try {
    const data = await get<DrawingData>(DRAWING_DATA_KEY);
    return data ?? null;
  } catch (error) {
    console.error('Failed to get drawing data:', error);
    return null;
  }
}

/**
 * Clear drawing data from IndexedDB
 */
export async function clearDrawingData(): Promise<void> {
  try {
    await del(DRAWING_DATA_KEY);
  } catch (error) {
    console.error('Failed to clear drawing data:', error);
    throw error;
  }
}
