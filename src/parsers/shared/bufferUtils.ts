/**
 * Ensures a Uint8Array is properly aligned for Float32Array/DataView access.
 * If the buffer's byteOffset is not 4-byte aligned, creates a copy.
 */
export function ensureAligned(buffer: Uint8Array): Uint8Array {
  if (buffer.byteOffset % 4 !== 0) {
    return new Uint8Array(buffer);
  }
  return buffer;
}
