import {
  STROKE_POINT_FIELDS,
  KEY_POINT_FIELDS,
  PLIST_KEYS,
  POINT_STRIDE
} from '../constants.js';
import type { Stroke, Point, PlistObject, DrawingData, Color, Transform, ImportedImage } from '../types/index.js';
import { decodeTransformBuffer } from './shared/transformUtils.js';
import { ensureAligned } from './shared/bufferUtils.js';
import { DEFAULT_COLOR, DEFAULT_BRUSH_WIDTH, DEFAULT_IMAGE_SIZE } from './shared/defaults.js';

/**
 * Checks if a value is a UID reference object
 * bplist-parser returns UIDs as {UID: number} not {data: number}
 */
function isUID(value: any): boolean {
  return value && typeof value === 'object' && ('data' in value || 'UID' in value);
}

/**
 * Gets the UID number from a UID object
 */
function getUIDValue(uid: any): number {
  if (uid.UID !== undefined) return uid.UID;
  if (uid.data !== undefined) return uid.data;
  throw new Error('Invalid UID object');
}

/**
 * Decodes float32 point data from a binary buffer
 */
function decodeFloat32Points(buffer: Uint8Array): Point[] {
  const alignedBuffer = ensureAligned(buffer);

  const floatArray = new Float32Array(alignedBuffer.buffer, alignedBuffer.byteOffset, alignedBuffer.byteLength / 4);
  const points: Point[] = [];

  for (let i = 0; i < floatArray.length; i += POINT_STRIDE) {
    points.push({
      x: floatArray[i],
      y: floatArray[i + 1],
    });
  }

  return points;
}

/**
 * Decodes glPosition data (8 bytes, 2 floats)
 */
function decodeGLPosition(buffer: Uint8Array): Point | null {
  if (buffer.byteLength !== 8) return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return {
    x: view.getFloat32(0, true), // little-endian
    y: view.getFloat32(4, true),
  };
}

/**
 * Parses a size string like "{397.5, 393}" to a Point
 */
function parseSize(sizeStr: string): Point | null {
  const match = sizeStr.match(/\{([^,]+),\s*([^}]+)\}/);
  if (!match) return null;

  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
  };
}

/**
 * Extracts brush width from brushProperties object
 */
function extractBrushWidth(obj: PlistObject, objects: PlistObject[]): number {
  if (!('brushProperties' in obj)) {
    return DEFAULT_BRUSH_WIDTH;
  }

  const brushPropsUID = obj['brushProperties'];
  if (!isUID(brushPropsUID)) {
    return DEFAULT_BRUSH_WIDTH;
  }

  const brushProps = objects[getUIDValue(brushPropsUID)];
  if (!brushProps || !('brushWidth' in brushProps)) {
    return DEFAULT_BRUSH_WIDTH;
  }

  const width = brushProps['brushWidth'];
  return typeof width === 'number' ? width : DEFAULT_BRUSH_WIDTH;
}

/**
 * Decodes a CGAffineTransform from diSavedTransform buffer
 * Uses the shared transform decoder for the actual buffer parsing
 */
function extractTransform(obj: PlistObject): Transform | undefined {
  if (!('diSavedTransform' in obj)) {
    return undefined;
  }

  const transformData = obj['diSavedTransform'];

  if (!(transformData instanceof Uint8Array) || transformData.length < 64) {
    console.warn('Transform data is not valid Uint8Array or too short');
    return undefined;
  }

  return decodeTransformBuffer(transformData);
}

/**
 * Extracts brush color from brushProperties object
 */
function extractBrushColor(obj: PlistObject, objects: PlistObject[]): Color {
  if (!('brushProperties' in obj)) {
    return { ...DEFAULT_COLOR };
  }

  const brushPropsUID = obj['brushProperties'];
  if (!isUID(brushPropsUID)) {
    return { ...DEFAULT_COLOR };
  }

  const brushProps = objects[getUIDValue(brushPropsUID)];
  if (!brushProps || !('brushColor' in brushProps)) {
    return { ...DEFAULT_COLOR };
  }

  const brushColorUID = brushProps['brushColor'];
  if (!isUID(brushColorUID)) {
    return { ...DEFAULT_COLOR };
  }

  const colorObj = objects[getUIDValue(brushColorUID)];
  if (!colorObj) {
    return { ...DEFAULT_COLOR };
  }

  // Extract RGB values (they're in 0-1 range)
  const r = typeof colorObj['UIRed'] === 'number' ? colorObj['UIRed'] : 0;
  const g = typeof colorObj['UIGreen'] === 'number' ? colorObj['UIGreen'] : 0;
  const b = typeof colorObj['UIBlue'] === 'number' ? colorObj['UIBlue'] : 0;
  const a = typeof colorObj['UIAlpha'] === 'number' ? colorObj['UIAlpha'] : 1;

  return { r, g, b, a };
}

/**
 * Attempts to extract an ImportedImage from an ImageItem object
 */
function extractImageItem(obj: PlistObject, objects: PlistObject[]): ImportedImage | null {
  // Check if this is an ImageItem by looking for imageIdentifier
  if (!('imageIdentifier' in obj)) {
    return null;
  }

  // Extract image UUID
  const imageIdUID = obj['imageIdentifier'];
  if (!isUID(imageIdUID)) {
    return null;
  }
  const uuid = objects[getUIDValue(imageIdUID)];
  if (typeof uuid !== 'string') {
    return null;
  }

  // Extract size
  let size: Point = { ...DEFAULT_IMAGE_SIZE };
  if ('size' in obj) {
    const sizeUID = obj['size'];
    if (isUID(sizeUID)) {
      const sizeStr = objects[getUIDValue(sizeUID)];
      if (typeof sizeStr === 'string') {
        const parsedSize = parseSize(sizeStr);
        if (parsedSize) {
          size = parsedSize;
        }
      }
    }
  }

  // Extract transform (position is in the transform)
  const transform = extractTransform(obj);

  // The position is stored in the transform's tx and ty values
  const position: Point = {
    x: transform?.tx ?? 0,
    y: transform?.ty ?? 0,
  };

  return {
    uuid,
    position,
    size,
    transform,
  };
}

/**
 * Attempts to extract a PDF page from a TiledPDFPage object
 */
function extractPdfPageItem(obj: PlistObject, objects: PlistObject[]): ImportedImage | null {
  // Check if this is a TiledPDFPage by looking for resourceIdentifier
  if (!('resourceIdentifier' in obj)) {
    return null;
  }

  // Extract PDF UUID
  const resourceIdUID = obj['resourceIdentifier'];
  if (!isUID(resourceIdUID)) {
    return null;
  }
  const uuid = objects[getUIDValue(resourceIdUID)];
  if (typeof uuid !== 'string') {
    return null;
  }

  // Extract page number
  // Concepts stores 'page' field as 1-indexed, we need 0-indexed for PDF.js
  let pageNumber = 0;
  if ('page' in obj && typeof obj['page'] === 'number') {
    // Convert from 1-indexed (Concepts) to 0-indexed (our system and PDF.js)
    pageNumber = obj['page'] - 1;
  }

  // Extract size
  let size: Point = { ...DEFAULT_IMAGE_SIZE };
  if ('size' in obj) {
    const sizeUID = obj['size'];
    if (isUID(sizeUID)) {
      const sizeStr = objects[getUIDValue(sizeUID)];
      if (typeof sizeStr === 'string') {
        const parsedSize = parseSize(sizeStr);
        if (parsedSize) {
          size = parsedSize;
        }
      }
    }
  }

  // Extract transform (position is in the transform)
  const transform = extractTransform(obj);

  // The position is stored in the transform's tx and ty values
  const position: Point = {
    x: transform?.tx ?? 0,
    y: transform?.ty ?? 0,
  };

  return {
    uuid,
    position,
    size,
    transform,
    pageNumber,
  };
}

/**
 * Attempts to extract stroke points from a stroke object
 */
function extractStrokePoints(obj: PlistObject, objects: PlistObject[]): Point[] | null {
  // Try strokePoints45 or strokePointsNonOptionalAngles fields
  for (const field of [
    STROKE_POINT_FIELDS.STROKE_POINTS_45,
    STROKE_POINT_FIELDS.STROKE_POINTS_NON_OPTIONAL_ANGLES,
  ]) {
    if (field in obj) {
      const uid = obj[field];
      if (isUID(uid)) {
        const blob = objects[getUIDValue(uid)];
        if (blob instanceof Uint8Array) {
          try {
            return decodeFloat32Points(blob);
          } catch (e) {
            console.warn(`Failed to decode ${field}:`, e);
          }
        }
      }
    }
  }

  // Fallback: try keyPoints → glPosition
  if (KEY_POINT_FIELDS.KEY_POINTS in obj) {
    const keyPointsUID = obj[KEY_POINT_FIELDS.KEY_POINTS];
    if (isUID(keyPointsUID)) {
      const keyPointsObj = objects[getUIDValue(keyPointsUID)];
      const keyPointUIDs = keyPointsObj?.[PLIST_KEYS.NS_OBJECTS];

      if (Array.isArray(keyPointUIDs)) {
        const points: Point[] = [];
        for (const ptUID of keyPointUIDs) {
          if (isUID(ptUID)) {
            const pt = objects[getUIDValue(ptUID)];
            if (pt && KEY_POINT_FIELDS.GL_POSITION in pt) {
              const buffer = pt[KEY_POINT_FIELDS.GL_POSITION];
              if (buffer instanceof Uint8Array) {
                const point = decodeGLPosition(buffer);
                if (point) points.push(point);
              }
            }
          }
        }
        if (points.length > 0) return points;
      }
    }
  }

  return null;
}

/**
 * Parses a Concepts Strokes.plist file and extracts all stroke data
 */
export function parseConceptsStrokes(plistData: any): DrawingData {
  // Check if bplist-parser already resolved the structure
  // It might return the decoded object directly instead of the raw archive format
  if (!plistData[PLIST_KEYS.OBJECTS] || !plistData[PLIST_KEYS.TOP]) {
    // Try to work with already-decoded structure
    if (plistData[PLIST_KEYS.ROOT]) {
      plistData = { [PLIST_KEYS.TOP]: { [PLIST_KEYS.ROOT]: plistData } };
    } else {
      throw new Error('Invalid plist structure: missing $objects and $top, and no root found');
    }
  }

  const objects = plistData[PLIST_KEYS.OBJECTS];
  const rootUID = plistData[PLIST_KEYS.TOP]?.[PLIST_KEYS.ROOT];

  if (!rootUID) {
    throw new Error('Invalid plist structure: no root in $top');
  }

  // Handle case where bplist-parser already resolved UIDs
  const root = isUID(rootUID) ? objects[getUIDValue(rootUID)] : rootUID;

  const groupLayerRef = root[PLIST_KEYS.ROOT_GROUP_LAYERS];
  const groupLayer = isUID(groupLayerRef) ? objects[getUIDValue(groupLayerRef)] : groupLayerRef;

  const groupItems = groupLayer[PLIST_KEYS.NS_OBJECTS];

  if (!Array.isArray(groupItems)) {
    throw new Error('Invalid plist structure: groupItems is not an array');
  }

  const strokes: Stroke[] = [];
  const images: ImportedImage[] = [];

  // Iterate through all group items
  for (const strokeRef of groupItems) {
    const stroke = isUID(strokeRef) ? objects[getUIDValue(strokeRef)] : strokeRef;

    if (!stroke || !(PLIST_KEYS.GROUP_ITEMS in stroke)) continue;

    const subItemsRef = stroke[PLIST_KEYS.GROUP_ITEMS];
    const subItemsObj = isUID(subItemsRef) ? objects[getUIDValue(subItemsRef)] : subItemsRef;
    const subObjs = subItemsObj?.[PLIST_KEYS.NS_OBJECTS];

    if (!Array.isArray(subObjs)) continue;

    // Extract items from each sub-object
    for (const objRef of subObjs) {
      const obj = isUID(objRef) ? objects[getUIDValue(objRef)] : objRef;
      if (!obj) continue;

      // Try to extract as an image first
      const image = extractImageItem(obj, objects);
      if (image) {
        images.push(image);
        continue;
      }

      // Try to extract as a PDF page
      const pdfPage = extractPdfPageItem(obj, objects);
      if (pdfPage) {
        images.push(pdfPage);
        continue;
      }

      // Otherwise, try to extract as a stroke
      const points = extractStrokePoints(obj, objects);
      if (points && points.length > 0) {
        const width = extractBrushWidth(obj, objects);
        const color = extractBrushColor(obj, objects);
        const transform = extractTransform(obj);
        const closed = obj['closed'] === true;
        strokes.push({ points, width, color, transform, closed });
      }
    }
  }

  return { strokes, images };
}
