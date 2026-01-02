import * as pdfjsLib from 'pdfjs-dist';
import type { ImportedImage, Transform } from './types/index.js';

// Configure PDF.js worker
// In production (GitHub Pages), the worker is at ./pdf.worker.mjs relative to index.html
// In dev, it's at /dist/pdf.worker.mjs
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
pdfjsLib.GlobalWorkerOptions.workerSrc = isProduction
  ? './pdf.worker.mjs'
  : '/dist/pdf.worker.mjs';

/**
 * Handles loading and rendering of imported images and PDFs
 */
export class ImageRenderer {
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  /**
   * Load image data into HTMLImageElement
   */
  private async loadImage(imageData: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageData;
    });
  }

  /**
   * Load and render a PDF page to HTMLImageElement
   */
  private async loadPdf(pdfData: string, pageNumber: number = 0): Promise<HTMLImageElement> {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfData);
    const pdf = await loadingTask.promise;

    // Get the specified page (1-indexed in PDF.js)
    const requestedPage = pageNumber + 1;
    const page = await pdf.getPage(requestedPage);

    // Render at 2x scale for better quality
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // Create canvas to render PDF page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context for PDF rendering');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page to canvas
    const renderContext: any = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;

    // Convert canvas to HTMLImageElement
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert PDF page to blob'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          resolve(img);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
    });
  }

  /**
   * Load and cache an image or PDF page by UUID
   */
  async loadAndCache(uuid: string, imageData: string, pageNumber?: number): Promise<void> {
    // Create a unique key for this image/PDF page combination
    const cacheKey = pageNumber !== undefined ? `${uuid}_page${pageNumber}` : uuid;

    if (this.loadedImages.has(cacheKey)) {
      return;
    }

    try {
      // Check if this is a PDF
      const isPdf = imageData.startsWith('data:application/pdf');

      const img = isPdf
        ? await this.loadPdf(imageData, pageNumber ?? 0)
        : await this.loadImage(imageData);

      this.loadedImages.set(cacheKey, img);
    } catch (error) {
      console.error(`Failed to load image/PDF ${uuid}:`, error);
      throw error;
    }
  }

  /**
   * Check if an image is loaded
   */
  has(uuid: string, pageNumber?: number): boolean {
    const cacheKey = pageNumber !== undefined ? `${uuid}_page${pageNumber}` : uuid;
    return this.loadedImages.has(cacheKey);
  }

  /**
   * Get a loaded image
   */
  get(uuid: string, pageNumber?: number): HTMLImageElement | undefined {
    const cacheKey = pageNumber !== undefined ? `${uuid}_page${pageNumber}` : uuid;
    return this.loadedImages.get(cacheKey);
  }

  /**
   * Apply Concepts transform to canvas context
   */
  private applyConceptsTransform(
    ctx: CanvasRenderingContext2D,
    transform: Transform,
    baseScale: number
  ): void {
    ctx.transform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.tx * baseScale,
      transform.ty * baseScale
    );
  }

  /**
   * Render a single image or PDF page to the canvas
   *
   * In Concepts, images/PDFs are positioned by their CENTER point (tx, ty):
   * - If a transform exists, use the full affine transform
   * - If no transform, treat as identity transform at position (0, 0)
   */
  render(
    ctx: CanvasRenderingContext2D,
    image: ImportedImage,
    baseScale: number
  ): void {
    const cacheKey = image.pageNumber !== undefined ? `${image.uuid}_page${image.pageNumber}` : image.uuid;

    const img = this.get(image.uuid, image.pageNumber);
    if (!img) {
      console.warn(`[Renderer] Image not found in cache: ${cacheKey}`);
      return;
    }

    ctx.save();

    // Apply transform or identity transform with position
    if (image.transform) {
      // Full affine transform (includes rotation, scale, translation)
      this.applyConceptsTransform(ctx, image.transform, baseScale);
    } else {
      // Identity transform - just translate to position
      const tx = image.position.x;
      const ty = image.position.y;
      ctx.translate(tx * baseScale, ty * baseScale);
    }

    // Image center is positioned at (tx, ty) in Concepts coordinates
    const halfWidth = (image.size.x * baseScale) / 2;
    const halfHeight = (image.size.y * baseScale) / 2;

    // Flip the image around its own Y-axis (at its center)
    ctx.scale(1, -1);

    // Draw with offset (note: Y is negated because we flipped)
    ctx.drawImage(
      img,
      -halfWidth,
      -halfHeight,
      image.size.x * baseScale,
      image.size.y * baseScale
    );

    ctx.restore();
  }
}
