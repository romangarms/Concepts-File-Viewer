// Represents a 2D point (x, y) with optional pressure
export interface Point {
  x: number;
  y: number;
  pressure?: number; // 0-1 range, optional
}

// RGB color
export interface Color {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1 (alpha)
}

// 2D affine transform matrix
export interface Transform {
  a: number;  // scale x / cos(rotation)
  b: number;  // skew y / sin(rotation)
  c: number;  // skew x / -sin(rotation)
  d: number;  // scale y / cos(rotation)
  tx: number; // translate x
  ty: number; // translate y
}

// A stroke with its points and metadata
export interface Stroke {
  points: Point[];
  width: number;     // Brush width in points
  color: Color;      // Brush color
  transform?: Transform; // Optional transform (for moved/rotated strokes)
  closed?: boolean;  // Whether the path should connect back to start
}

// An imported image or PDF page in the drawing
export interface ImportedImage {
  uuid: string;       // Image/PDF UUID (matches filename in ImportedImages/)
  position: Point;    // Position in drawing coordinates
  size: Point;        // Size (width, height) in drawing coordinates
  transform?: Transform; // Optional transform (for moved/rotated images)
  imageData?: string; // Base64 encoded image/PDF data
  pageNumber?: number; // For PDFs: which page to render (0-indexed)
}

// Plist object with UID reference
export interface PlistUID {
  data: number;
}

// Generic plist object
export interface PlistObject {
  [key: string]: any;
}

// Root structure of Concepts plist
export interface ConceptsPlist {
  $objects: PlistObject[];
  $top: {
    root: PlistUID;
  };
}

// Parsed drawing data
export interface DrawingData {
  strokes: Stroke[];
  images: ImportedImage[];
  metadata?: {
    width?: number;
    height?: number;
  };
}

// All plist files from a .concept file
export interface ConceptPlists {
  strokes: any;
  drawing: any;
  resources: any;
  metadata: any;
}

// Legacy types - kept for reference but no longer used
// These were used with webkitdirectory before File System Access API
// export interface ConceptFileInfo { ... }
// export interface DirectoryNode { ... }
