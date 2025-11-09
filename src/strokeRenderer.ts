import type { Stroke, DrawingData } from './types.js';
import { ImageRenderer } from './imageRenderer.js';

// Zoom configuration constants
const ZOOM_CONFIG = {
  MIN_ZOOM: 0.1,          // Minimum zoom out (smaller = more zoomed out)
  MAX_ZOOM: 10,           // Maximum zoom in
  ZOOM_STEP: 1.2,         // Zoom in/out multiplier for buttons
  WHEEL_ZOOM_FACTOR: 0.9  // Zoom factor for mouse wheel (1/0.9 for zoom in)
};

export class StrokeRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private baseScale: number = 1;
  private userScale: number = 1; // Start at 1x (baseScale handles fit-to-screen)
  private panX: number = 0;
  private panY: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private currentDrawingData: DrawingData | null = null;
  private logicalHeight: number = 0; // Store logical height for Y-axis flip
  private initialPanX: number = 0; // Store initial centered position for reset
  private initialPanY: number = 0;
  private canvasRotation: number = 0; // Canvas rotation in degrees
  private imageRenderer: ImageRenderer = new ImageRenderer(); // Handle image loading and rendering

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.setupInteractions();
  }

  /**
   * Set up mouse/touch interactions for pan and zoom
   */
  private setupInteractions(): void {
    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? ZOOM_CONFIG.WHEEL_ZOOM_FACTOR : 1 / ZOOM_CONFIG.WHEEL_ZOOM_FACTOR;
      const newScale = this.userScale * zoomFactor;

      // Limit zoom range
      if (newScale < ZOOM_CONFIG.MIN_ZOOM || newScale > ZOOM_CONFIG.MAX_ZOOM) return;

      // Zoom towards mouse position
      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.userScale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.userScale);

      this.userScale = newScale;
      this.redraw();
    });

    // Pan with mouse drag
    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.panX += deltaX;
      this.panY += deltaY;

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.redraw();
    });

    // Use window for mouseup to catch releases outside canvas
    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      // Don't reset dragging on leave, only on mouseup
      if (!this.isDragging) {
        this.canvas.style.cursor = 'grab';
      }
    });

    // Prevent default drag behavior
    this.canvas.addEventListener('dragstart', (e: DragEvent) => {
      e.preventDefault();
      return false;
    });

    // Touch support for mobile/tablets
    let lastTouchX = 0;
    let lastTouchY = 0;
    let lastTouchDistance = 0;

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        // Single touch - pan
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Two touches - pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        // Single touch - pan
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;

        this.panX += deltaX;
        this.panY += deltaY;

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;

        this.redraw();
      } else if (e.touches.length === 2) {
        // Two touches - pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (lastTouchDistance > 0) {
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rect = this.canvas.getBoundingClientRect();
          const canvasX = centerX - rect.left;
          const canvasY = centerY - rect.top;

          const zoomFactor = distance / lastTouchDistance;
          const newScale = this.userScale * zoomFactor;

          // Limit zoom range
          if (newScale >= ZOOM_CONFIG.MIN_ZOOM && newScale <= ZOOM_CONFIG.MAX_ZOOM) {
            // Zoom towards pinch center
            this.panX = canvasX - (canvasX - this.panX) * (newScale / this.userScale);
            this.panY = canvasY - (canvasY - this.panY) * (newScale / this.userScale);
            this.userScale = newScale;
            this.redraw();
          }
        }

        lastTouchDistance = distance;
      }
    });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length < 2) {
        lastTouchDistance = 0;
      }
    });

    // Set initial cursor
    this.canvas.style.cursor = 'grab';
  }

  /**
   * Public methods to control zoom
   */
  zoomIn(): void {
    const newScale = Math.min(ZOOM_CONFIG.MAX_ZOOM, this.userScale * ZOOM_CONFIG.ZOOM_STEP);
    this.zoomTowardCenter(newScale);
  }

  zoomOut(): void {
    const newScale = Math.max(ZOOM_CONFIG.MIN_ZOOM, this.userScale / ZOOM_CONFIG.ZOOM_STEP);
    this.zoomTowardCenter(newScale);
  }

  private zoomTowardCenter(newScale: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Adjust pan to zoom toward center (same logic as mouse wheel zoom)
    this.panX = centerX - (centerX - this.panX) * (newScale / this.userScale);
    this.panY = centerY - (centerY - this.panY) * (newScale / this.userScale);

    this.userScale = newScale;
    this.redraw();
  }

  resetView(): void {
    this.userScale = 1;
    this.panX = this.initialPanX;
    this.panY = this.initialPanY;
    this.canvasRotation = 0;
    this.redraw();
  }

  rotateClockwise(): void {
    this.canvasRotation = (this.canvasRotation + 90) % 360;
    this.redraw();
  }

  rotateCounterClockwise(): void {
    this.canvasRotation = (this.canvasRotation - 90 + 360) % 360;
    this.redraw();
  }

  /**
   * Apply transform to a point
   */
  private transformPoint(point: { x: number; y: number }, transform?: import('./types.js').Transform): { x: number; y: number } {
    if (!transform) {
      return point;
    }

    const { a, b, c, d, tx, ty } = transform;
    return {
      x: a * point.x + c * point.y + tx,
      y: b * point.x + d * point.y + ty,
    };
  }

  /**
   * Apply Concepts transform to canvas context
   * Now that we have global Y-flip, just apply transform as-is
   */
  private applyConceptsTransform(transform: import('./types.js').Transform): void {
    // Apply the affine transform matrix directly (Y-flip is handled globally)
    this.ctx.transform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.tx * this.baseScale,
      transform.ty * this.baseScale
    );
  }

  /**
   * Calculate bounds of all strokes and images to fit them in the viewport
   * Takes transforms into account
   */
  private calculateBounds(data: DrawingData): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Include strokes in bounds
    for (const stroke of data.strokes) {
      for (const point of stroke.points) {
        // Apply transform if present
        const transformedPoint = this.transformPoint(point, stroke.transform);

        minX = Math.min(minX, transformedPoint.x);
        minY = Math.min(minY, transformedPoint.y);
        maxX = Math.max(maxX, transformedPoint.x);
        maxY = Math.max(maxY, transformedPoint.y);
      }
    }

    // Include images in bounds
    for (const image of data.images) {
      const corners = [
        { x: image.position.x, y: image.position.y },
        { x: image.position.x + image.size.x, y: image.position.y },
        { x: image.position.x, y: image.position.y + image.size.y },
        { x: image.position.x + image.size.x, y: image.position.y + image.size.y },
      ];

      for (const corner of corners) {
        const transformedPoint = this.transformPoint(corner, image.transform);
        minX = Math.min(minX, transformedPoint.x);
        minY = Math.min(minY, transformedPoint.y);
        maxX = Math.max(maxX, transformedPoint.x);
        maxY = Math.max(maxY, transformedPoint.y);
      }
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render all strokes and images to the canvas
   */
  async render(drawingData: DrawingData): Promise<void> {
    this.currentDrawingData = drawingData;
    const { strokes, images } = drawingData;

    if (strokes.length === 0 && images.length === 0) {
      console.warn('No strokes or images to render');
      return;
    }

    // Load all images and PDFs
    for (const image of images) {
      if (image.imageData && !this.imageRenderer.has(image.uuid, image.pageNumber)) {
        try {
          await this.imageRenderer.loadAndCache(image.uuid, image.imageData, image.pageNumber);
        } catch (error) {
          console.error(`Failed to load image/PDF ${image.uuid}:`, error);
        }
      }
    }

    // Simple approach: just center the drawing without auto-scaling
    const bounds = this.calculateBounds(drawingData);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    // Use logical dimensions (not physical pixels)
    const rect = this.canvas.getBoundingClientRect();
    this.logicalHeight = rect.height; // Store for Y-axis flipping

    // Always use baseScale = 1 (no scaling at base level)
    this.baseScale = 1;

    // Step 1: Center the drawing at userScale = 1
    // Drawing center in original coordinates (bottom-left origin)
    const drawingCenterX = bounds.minX + width / 2;
    const drawingCenterY = bounds.minY + height / 2;

    // After Y-flip, the drawing center becomes:
    const flippedDrawingCenterY = this.logicalHeight - drawingCenterY;

    // Canvas center
    const canvasCenterX = rect.width / 2;
    const canvasCenterY = rect.height / 2;

    // Pan to place drawing center at canvas center (at scale 1)
    this.offsetX = 0;
    this.offsetY = 0;
    this.initialPanX = canvasCenterX - drawingCenterX;
    this.initialPanY = canvasCenterY - flippedDrawingCenterY;
    this.panX = this.initialPanX;
    this.panY = this.initialPanY;

    // Step 2: Calculate auto-zoom to fit drawing in viewport
    const padding = 40;
    const scaleToFitX = (rect.width - padding * 2) / width;
    const scaleToFitY = (rect.height - padding * 2) / height;
    const scaleToFit = Math.min(scaleToFitX, scaleToFitY);

    // Apply the zoom (this will adjust pan to keep center stable)
    this.userScale = 1; // Start at 1
    this.zoomTowardCenter(scaleToFit);

    this.redraw();
  }

  /**
   * Redraw the canvas with current pan/zoom settings
   */
  private redraw(): void {
    if (!this.currentDrawingData) return;

    this.clear();

    // Apply canvas-level transformations
    this.ctx.save();

    // Apply rotation around the viewport center FIRST (before pan/zoom)
    // This makes rotation happen around what's currently visible
    if (this.canvasRotation !== 0) {
      const rect = this.canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate((this.canvasRotation * Math.PI) / 180);
      this.ctx.translate(-centerX, -centerY);
    }

    // Then apply pan and user zoom
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.userScale, this.userScale);

    // Flip Y-axis to match Concepts' bottom-left origin
    // Translate to bottom of canvas, then flip Y
    this.ctx.translate(0, this.logicalHeight);
    this.ctx.scale(1, -1);

    // Render images first (so they appear behind strokes)
    for (const image of this.currentDrawingData.images) {
      this.imageRenderer.render(this.ctx, image, this.baseScale);
    }

    // Render each stroke
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (const stroke of this.currentDrawingData.strokes) {
      this.renderStroke(stroke);
    }

    // Restore canvas state
    this.ctx.restore();
  }

  /**
   * Render a single stroke
   */
  private renderStroke(stroke: Stroke): void {
    if (stroke.points.length === 0) return;

    // Set stroke width (scale it with the drawing - use baseScale only, userScale is applied at canvas level)
    this.ctx.lineWidth = stroke.width * this.baseScale;

    // Set stroke color (convert 0-1 range to 0-255)
    const r = Math.round(stroke.color.r * 255);
    const g = Math.round(stroke.color.g * 255);
    const b = Math.round(stroke.color.b * 255);
    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${stroke.color.a})`;

    // Apply transform if present
    if (stroke.transform) {
      this.ctx.save();
      this.applyConceptsTransform(stroke.transform);
    }

    this.ctx.beginPath();

    const firstPoint = stroke.points[0];
    this.ctx.moveTo(
      firstPoint.x * this.baseScale,
      firstPoint.y * this.baseScale  // No Y-flip needed - global flip handles it
    );

    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      this.ctx.lineTo(
        point.x * this.baseScale,
        point.y * this.baseScale  // No Y-flip needed - global flip handles it
      );
    }

    // Close the path if marked as closed
    if (stroke.closed) {
      this.ctx.closePath();
    }

    this.ctx.stroke();

    // Restore context if we applied a transform
    if (stroke.transform) {
      this.ctx.restore();
    }
  }

  /**
   * Resize the canvas to match its display size
   * Accounts for device pixel ratio for sharp rendering on high-DPI displays
   */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size in actual pixels (accounting for device pixel ratio)
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Scale the context to match, so we can still draw at logical pixel coordinates
    this.ctx.scale(dpr, dpr);
  }
}
