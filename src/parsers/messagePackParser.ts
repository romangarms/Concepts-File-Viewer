/**
 * MessagePack parser for Android/Windows Concepts app files (.concepts)
 * Parses tree.pack to extract stroke data in the same DrawingData format as plistParser.ts
 */

import type { Stroke, Point, DrawingData, Color, Transform, ImportedImage } from '../types/index.js';
import { decodeTransformBuffer } from './shared/transformUtils.js';
import { ensureAligned } from './shared/bufferUtils.js';
import { DEFAULT_COLOR, DEFAULT_BRUSH_WIDTH } from './shared/defaults.js';

// Enable debug logging via URL param or console
const DEBUG = typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
   (window as any).__MSGPACK_DEBUG === true);

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[MessagePack]', ...args);
  }
}

/**
 * Decodes a 64-byte buffer as a 4x4 matrix and extracts the 2D affine transform
 * Uses the shared transform decoder
 */
function decodeTransform(buffer: Uint8Array): Transform | undefined {
  if (buffer.length !== 64) {
    log('Transform buffer is not 64 bytes:', buffer.length);
    return undefined;
  }
  return decodeTransformBuffer(buffer);
}

/**
 * Decodes a 16-byte buffer as RGBA color (4 float32 values)
 */
function decodeColor(buffer: Uint8Array, alphaMultiplier?: number): Color {
  if (buffer.length !== 16) {
    log('Color buffer is not 16 bytes:', buffer.length);
    return { ...DEFAULT_COLOR };
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, 16);

  const r = view.getFloat32(0, true);
  const g = view.getFloat32(4, true);
  const b = view.getFloat32(8, true);
  let a = view.getFloat32(12, true);

  // Apply alpha multiplier if provided
  if (alphaMultiplier !== undefined) {
    a *= alphaMultiplier;
  }

  return { r, g, b, a };
}

/**
 * Decodes stroke points from a Uint8Array
 * Format: 16 bytes per point [x(4), y(4), pressure(2), angle(2), flags(4)]
 */
function decodeStrokePoints(buffer: Uint8Array): Point[] {
  const POINT_SIZE = 16;
  const pointCount = Math.floor(buffer.length / POINT_SIZE);
  const points: Point[] = [];

  const alignedBuffer = ensureAligned(buffer);
  const view = new DataView(alignedBuffer.buffer, alignedBuffer.byteOffset, alignedBuffer.byteLength);

  for (let i = 0; i < pointCount; i++) {
    const offset = i * POINT_SIZE;
    const x = view.getFloat32(offset, true);
    const y = view.getFloat32(offset + 4, true);
    // Pressure is 2 bytes at offset+8, range 0-65535, normalize to 0-1
    const pressureRaw = view.getUint16(offset + 8, true);
    const pressure = pressureRaw / 65535;

    points.push({ x, y, pressure });
  }

  return points;
}

/**
 * Extracts brush properties from the nested brush structure
 * Structure discovered through testing:
 * - brushData[1][1][1][2].data = color buffer (16-byte Ext type 4, RGBA as 4 float32)
 * - brushData[1][1][1][3] = alpha multiplier
 * - brushData[7].data = transform (64-byte Ext type 7)
 */
function extractBrushProperties(brushData: any): { color: Color; width: number; transform?: Transform } {
  try {
    if (!Array.isArray(brushData)) {
      return { color: { ...DEFAULT_COLOR }, width: DEFAULT_BRUSH_WIDTH };
    }

    // Navigate to color: brushData[1][1][1] contains [0, [0, brushType], colorExt, alpha]
    const level1 = brushData[1];
    if (!Array.isArray(level1)) {
      return { color: { ...DEFAULT_COLOR }, width: DEFAULT_BRUSH_WIDTH };
    }

    const level2 = level1[1];
    if (!Array.isArray(level2)) {
      return { color: { ...DEFAULT_COLOR }, width: DEFAULT_BRUSH_WIDTH };
    }

    const level3 = level2[1];
    if (!Array.isArray(level3)) {
      return { color: { ...DEFAULT_COLOR }, width: DEFAULT_BRUSH_WIDTH };
    }

    // Extract color buffer (Ext type 4, 16 bytes)
    const colorExt = level3[2];
    const alpha = typeof level3[3] === 'number' ? level3[3] : 1;

    let color: Color = { ...DEFAULT_COLOR };
    if (colorExt && colorExt.data instanceof Uint8Array && colorExt.data.length === 16) {
      color = decodeColor(colorExt.data, alpha);
    }

    // Brush width from level2[3]
    const brushWidth = typeof level2[3] === 'number' ? level2[3] : DEFAULT_BRUSH_WIDTH;

    // Extract transform from brushData[7] (Ext type 7, 64 bytes)
    let transform: Transform | undefined;
    if (brushData.length > 7) {
      const transformExt = brushData[7];
      if (transformExt && transformExt.data instanceof Uint8Array && transformExt.data.length === 64) {
        transform = decodeTransform(transformExt.data);
      }
    }

    return { color, width: brushWidth, transform };
  } catch (e) {
    log('Error extracting brush properties:', e);
    return { color: { ...DEFAULT_COLOR }, width: DEFAULT_BRUSH_WIDTH };
  }
}

/**
 * Processes a stroke item from the tree.pack structure
 * Item structure: [4, [0, [6, brushInfo, 2, displayWidth, ..., points]]]
 */
function processStrokeItem(item: any): Stroke | null {
  try {
    // Validate item structure: [4, [0, strokeData]]
    if (!Array.isArray(item) || item.length < 2 || item[0] !== 4) {
      return null;
    }

    const content = item[1];
    if (!Array.isArray(content) || content.length < 2) {
      return null;
    }

    const strokeData = content[1];
    if (!Array.isArray(strokeData)) {
      return null;
    }

    // Check if this is a stroke (type marker 6 at index 0)
    if (strokeData[0] !== 6) {
      log('Not a stroke item, type:', strokeData[0]);
      return null;
    }

    // Extract brush properties from index 1 (includes color, width, and transform)
    const brushInfo = strokeData[1];
    const { color, transform } = extractBrushProperties(brushInfo);

    // Get the display width from strokeData[3] (this is the actual stroke width used for rendering)
    const displayWidth = typeof strokeData[3] === 'number' ? strokeData[3] : DEFAULT_BRUSH_WIDTH;

    // Extract points from strokeData[17] (the stroke points Uint8Array)
    const pointsBuffer = strokeData[17];
    if (!(pointsBuffer instanceof Uint8Array)) {
      log('No points buffer found at index 17');
      return null;
    }

    const points = decodeStrokePoints(pointsBuffer);
    if (points.length === 0) {
      log('No points decoded');
      return null;
    }

    // Check for closed flag at strokeData[5]
    const closed = strokeData[5] === true;

    return {
      points,
      width: displayWidth,
      color,
      transform,
      closed,
    };
  } catch (e) {
    log('Error processing stroke item:', e);
    return null;
  }
}

/**
 * Recursively finds all stroke items in the tree structure
 */
function findStrokeItems(data: any, depth = 0): Stroke[] {
  const strokes: Stroke[] = [];
  const maxDepth = 20;

  if (depth > maxDepth) {
    return strokes;
  }

  if (!Array.isArray(data)) {
    return strokes;
  }

  // Check if this is a stroke item [4, [0, [6, ...]]]
  if (data.length >= 2 && data[0] === 4) {
    const stroke = processStrokeItem(data);
    if (stroke) {
      strokes.push(stroke);
      return strokes;
    }
  }

  // Recursively search children
  for (const child of data) {
    if (Array.isArray(child)) {
      strokes.push(...findStrokeItems(child, depth + 1));
    }
  }

  return strokes;
}

/**
 * Parses decoded MessagePack data from tree.pack and extracts drawing data
 */
export function parseConceptsStrokesFromMessagePack(treeData: any): DrawingData {
  log('Parsing MessagePack tree data');

  // Validate structure: [version, data]
  if (!Array.isArray(treeData) || treeData.length < 2) {
    throw new Error('Invalid tree.pack structure: expected [version, data]');
  }

  const version = treeData[0];
  const rootData = treeData[1];

  log('Format version:', version);
  log('Root data structure length:', Array.isArray(rootData) ? rootData.length : 'N/A');

  // The structure is: rootData[4] = [[layerType, layerInfo, items], ...]
  // where layerType is 1 for a layer, and items is an array of stroke items
  const layers = rootData[4];

  if (!Array.isArray(layers)) {
    throw new Error('Invalid tree.pack structure: no layers found at rootData[4]');
  }

  log('Number of layers:', layers.length);

  const strokes: Stroke[] = [];

  // Process each layer
  for (const layer of layers) {
    if (!Array.isArray(layer) || layer.length < 3) {
      continue;
    }

    const layerType = layer[0];
    const layerItems = layer[2]; // Items are at index 2

    log(`Processing layer type ${layerType}, items:`, Array.isArray(layerItems) ? layerItems.length : 'N/A');

    if (!Array.isArray(layerItems)) {
      continue;
    }

    // Process each item in the layer
    for (const item of layerItems) {
      const stroke = processStrokeItem(item);
      if (stroke) {
        strokes.push(stroke);
      }
    }
  }

  log(`Found ${strokes.length} strokes total`);

  // TODO: Extract images from resource.pack
  const images: ImportedImage[] = [];

  return { strokes, images };
}

/**
 * Converts the decoded MessagePack data to JSON-serializable format for debugging
 */
export function messagePackToJson(data: any): any {
  if (data instanceof Uint8Array) {
    // Convert Uint8Array to hex string for display
    const hex = Array.from(data.slice(0, 100))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    return `<Uint8Array(${data.length})> ${hex}${data.length > 100 ? '...' : ''}`;
  }

  if (data && typeof data === 'object' && data.type !== undefined && data.data instanceof Uint8Array) {
    // Handle msgpack ext type objects
    const hex = Array.from<number>(data.data.slice(0, 100))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    return `<Ext(type=${data.type}, ${data.data.length})> ${hex}${data.data.length > 100 ? '...' : ''}`;
  }

  if (Array.isArray(data)) {
    return data.map(item => messagePackToJson(item));
  }

  if (data && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = messagePackToJson(value);
    }
    return result;
  }

  return data;
}
