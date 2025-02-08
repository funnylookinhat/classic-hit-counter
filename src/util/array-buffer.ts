/**
 * Packs two numbers into the front of an ArrayBuffer.
 * @param num1 - The first number to pack.
 * @param num2 - The second number to pack.
 * @param buffer - The existing ArrayBuffer to append data to.
 * @returns A new ArrayBuffer with the two numbers packed at the front.
 */
export function packNumbersToArrayBuffer(
  num1: number,
  num2: number,
  buffer: ArrayBuffer,
): ArrayBuffer {
  // Create a new 16-byte buffer for two 64-bit floats
  const numbersBuffer = new ArrayBuffer(16);
  const numbersView = new DataView(numbersBuffer);

  // Store first float (num1) at byte offset 0 (8 bytes)
  numbersView.setFloat64(0, num1, true); // little-endian
  // Store second float (num2) at byte offset 8 (8 bytes)
  numbersView.setFloat64(8, num2, true); // little-endian

  // Create a combined buffer with enough space for the two floats + original buffer
  const combinedBuffer = new ArrayBuffer(
    numbersBuffer.byteLength + buffer.byteLength,
  );
  const combinedView = new Uint8Array(combinedBuffer);

  // Copy the two floats (16 bytes) to the front
  combinedView.set(new Uint8Array(numbersBuffer), 0);
  // Append the original buffer data
  combinedView.set(new Uint8Array(buffer), numbersBuffer.byteLength);

  return combinedBuffer;
}

/**
 * Unpacks two numbers from the front of an ArrayBuffer.
 * @param buffer - The ArrayBuffer to unpack the numbers from.
 * @returns An object containing both unpacked numbers and the remaining ArrayBuffer.
 */
export function unpackNumbersFromArrayBuffer(
  buffer: ArrayBuffer,
): [number, number, ArrayBuffer] {
  // Read the first 16 bytes for the two 64-bit floats
  const numbersView = new DataView(buffer, 0, 16);

  // First float is at offset 0
  const num1 = numbersView.getFloat64(0, true);
  // Second float is at offset 8
  const num2 = numbersView.getFloat64(8, true);

  // The remaining buffer excludes the first 16 bytes
  const remainingBuffer = buffer.slice(16);

  return [num1, num2, remainingBuffer];
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}
