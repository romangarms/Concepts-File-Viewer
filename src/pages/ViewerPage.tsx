import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStrokeRenderer } from '../hooks/useStrokeRenderer.js';
import { ZoomControls } from '../components/ZoomControls.js';
import { Toast } from '../components/Toast.js';
import { getDrawingData, saveDrawingData } from '../utils/drawingDataCache.js';
import type { DrawingData } from '../types/index.js';

export function ViewerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { canvasRef, render, zoomIn, zoomOut, resetView, rotateClockwise, rotateCounterClockwise } = useStrokeRenderer();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; show: boolean }>({
    message: '',
    type: 'success',
    show: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      let data = location.state?.data as DrawingData | undefined;

      // If no data in location state, try to restore from IndexedDB
      if (!data) {
        data = await getDrawingData() ?? undefined;
      } else {
        // Save data to IndexedDB when it's provided via navigation
        await saveDrawingData(data);

        // Also save navigation state (fromGallery and galleryPath)
        const fromGallery = location.state?.fromGallery;
        const galleryPath = location.state?.galleryPath;

        if (fromGallery && galleryPath) {
          localStorage.setItem('conceptsNavigationState', JSON.stringify({
            fromGallery,
            galleryPath,
          }));
        }
      }

      setIsLoading(false);

      if (!data) {
        setToast({
          message: 'No data found. Please select a file first.',
          type: 'error',
          show: true,
        });
        setTimeout(() => {
          navigate('/');
        }, 2000);
        return;
      }

      // Show success toast
      setToast({
        message: `Loaded ${data.strokes.length} strokes and ${data.images.length} images`,
        type: 'success',
        show: true,
      });

      // Render the drawing
      render(data);
    }

    loadData();
  }, [location.state, navigate, render]);

  const handleBack = () => {
    // Try to get navigation state from location.state first
    let fromGallery = location.state?.fromGallery;
    let galleryPath = location.state?.galleryPath as string[] | undefined;

    // If not in location.state, try to restore from localStorage
    if (!fromGallery || !galleryPath) {
      const savedNavState = localStorage.getItem('conceptsNavigationState');
      if (savedNavState) {
        try {
          const parsed = JSON.parse(savedNavState);
          fromGallery = parsed.fromGallery;
          galleryPath = parsed.galleryPath;
        } catch (error) {
          console.error('Failed to parse saved navigation state:', error);
        }
      }
    }

    if (fromGallery && galleryPath) {
      // Navigate back to gallery with the path in URL
      const encodedPath = galleryPath.map(encodeURIComponent).join('/');
      // Clear navigation state from localStorage since we're navigating away
      localStorage.removeItem('conceptsNavigationState');
      navigate(`/gallery/${encodedPath}`);
    } else {
      // Navigate to home
      localStorage.removeItem('conceptsNavigationState');
      navigate('/');
    }
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  return (
    <>
      <canvas ref={canvasRef} id="canvas"></canvas>
      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onBack={handleBack}
        onRotateClockwise={rotateClockwise}
        onRotateCounterClockwise={rotateCounterClockwise}
      />
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onHide={hideToast}
      />
    </>
  );
}
