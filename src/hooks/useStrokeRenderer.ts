import { useEffect, useRef, useCallback } from 'react';
import { StrokeRenderer } from '../strokeRenderer.js';
import type { DrawingData } from '../types/index.js';

export function useStrokeRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StrokeRenderer | null>(null);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new StrokeRenderer(canvasRef.current);
    }

    const handleResize = () => {
      rendererRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const render = useCallback(async (data: DrawingData) => {
    if (rendererRef.current) {
      rendererRef.current.resize();
      await rendererRef.current.render(data);
    }
  }, []);

  const zoomIn = useCallback(() => {
    rendererRef.current?.zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    rendererRef.current?.zoomOut();
  }, []);

  const resetView = useCallback(() => {
    rendererRef.current?.resetView();
  }, []);

  const rotateClockwise = useCallback(() => {
    rendererRef.current?.rotateClockwise();
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    rendererRef.current?.rotateCounterClockwise();
  }, []);

  return {
    canvasRef,
    render,
    zoomIn,
    zoomOut,
    resetView,
    rotateClockwise,
    rotateCounterClockwise,
  };
}
