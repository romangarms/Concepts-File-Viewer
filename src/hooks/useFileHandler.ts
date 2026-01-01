import { useCallback } from 'react';
import { FileHandler } from '../fileHandler.js';
import type { DrawingData } from '../types/index.js';

const fileHandler = new FileHandler();

export function useFileHandler() {
  const processFile = useCallback(async (file: File): Promise<DrawingData> => {
    return fileHandler.processConceptFile(file);
  }, []);

  const setupDragAndDrop = useCallback(
    (
      element: HTMLElement | null,
      onFileLoaded: (data: DrawingData) => void,
      onError: (error: Error) => void
    ) => {
      if (!element) return;
      fileHandler.setupDragAndDrop(element, onFileLoaded, onError);
    },
    []
  );

  const setupFileInput = useCallback(
    (
      input: HTMLInputElement | null,
      onFileLoaded: (data: DrawingData) => void,
      onError: (error: Error) => void
    ) => {
      if (!input) return;
      fileHandler.setupFileInput(input, onFileLoaded, onError);
    },
    []
  );

  return {
    processFile,
    setupDragAndDrop,
    setupFileInput,
  };
}
