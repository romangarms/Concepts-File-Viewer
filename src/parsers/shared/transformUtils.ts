import type { Transform } from '../../types/index.js';
import { TRANSFORM_EPSILON } from './defaults.js';

/**
 * Checks if a transform is effectively an identity transform.
 * Returns true if all components are within epsilon of identity values.
 */
export function isIdentityTransform(transform: Transform): boolean {
  return (
    Math.abs(transform.a - 1) < TRANSFORM_EPSILON &&
    Math.abs(transform.b) < TRANSFORM_EPSILON &&
    Math.abs(transform.c) < TRANSFORM_EPSILON &&
    Math.abs(transform.d - 1) < TRANSFORM_EPSILON &&
    Math.abs(transform.tx) < TRANSFORM_EPSILON &&
    Math.abs(transform.ty) < TRANSFORM_EPSILON
  );
}

/**
 * Decodes a 64-byte buffer as a 4x4 matrix and extracts the 2D affine transform.
 *
 * The buffer layout is a 4x4 column-major matrix (16 float32 values):
 * [a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1]
 *
 * We extract: a (offset 0), b (offset 4), c (offset 16), d (offset 20), tx (offset 48), ty (offset 52)
 *
 * @param buffer - 64-byte Uint8Array containing the transform matrix
 * @returns Transform object, or undefined if buffer is invalid or transform is identity
 */
export function decodeTransformBuffer(buffer: Uint8Array): Transform | undefined {
  if (buffer.length !== 64) {
    return undefined;
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, 64);

  const transform: Transform = {
    a: view.getFloat32(0, true),    // [0] scale/rotate x
    b: view.getFloat32(4, true),    // [1] skew y
    c: view.getFloat32(16, true),   // [4] skew x
    d: view.getFloat32(20, true),   // [5] scale/rotate y
    tx: view.getFloat32(48, true),  // [12] translate x
    ty: view.getFloat32(52, true),  // [13] translate y
  };

  return isIdentityTransform(transform) ? undefined : transform;
}
