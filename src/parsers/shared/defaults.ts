import type { Color, Point } from '../../types/index.js';

/** Default black color with full opacity */
export const DEFAULT_COLOR: Readonly<Color> = Object.freeze({
  r: 0,
  g: 0,
  b: 0,
  a: 1,
});

/** Default brush width in points */
export const DEFAULT_BRUSH_WIDTH = 2.0;

/** Default size for images when not specified */
export const DEFAULT_IMAGE_SIZE: Readonly<Point> = Object.freeze({
  x: 100,
  y: 100,
});

/** Epsilon for floating point comparisons */
export const TRANSFORM_EPSILON = 0.0001;
