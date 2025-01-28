/**
 * Packs a number into the front of an ArrayBuffer.
 * @param num - The number to pack.
 * @param buffer - The existing ArrayBuffer to append data to.
 * @returns A new ArrayBuffer with the number packed at the front.
 */
export function packNumberToArrayBuffer(
  num: number,
  buffer: ArrayBuffer,
): ArrayBuffer {
  const numberBuffer = new ArrayBuffer(8); // JavaScript numbers are 64-bit floating-point
  const numberView = new DataView(numberBuffer);
  numberView.setFloat64(0, num, true); // Use little-endian byte order

  const combinedBuffer = new ArrayBuffer(
    numberBuffer.byteLength + buffer.byteLength,
  );
  const combinedView = new Uint8Array(combinedBuffer);

  combinedView.set(new Uint8Array(numberBuffer), 0); // Copy the number to the front
  combinedView.set(new Uint8Array(buffer), numberBuffer.byteLength); // Append the original buffer

  return combinedBuffer;
}

/**
 * Unpacks a number from the front of an ArrayBuffer.
 * @param buffer - The ArrayBuffer to unpack the number from.
 * @returns An object containing the unpacked number and the remaining ArrayBuffer.
 */
export function unpackNumberFromArrayBuffer(
  buffer: ArrayBuffer,
): { number: number; remainingBuffer: ArrayBuffer } {
  const numberView = new DataView(buffer, 0, 8); // Read the first 8 bytes for the number
  const num = numberView.getFloat64(0, true); // Use little-endian byte order

  const remainingBuffer = buffer.slice(8); // Slice the buffer to exclude the first 8 bytes

  return { number: num, remainingBuffer };
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}
