import {
  isArrayBuffer,
  packNumbersToArrayBuffer,
  unpackNumbersFromArrayBuffer,
} from "./array-buffer.ts"; // Replace with your actual module path
import { assert, assertEquals, assertFalse } from "@std/assert";

// A helper to quickly create a small ArrayBuffer filled with some pattern.
function createTestArrayBuffer(size: number): ArrayBuffer {
  const arr = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = i % 256; // fill with a simple pattern
  }
  return arr.buffer;
}

Deno.test("packNumbersToArrayBuffer - basic usage", () => {
  const originalBuffer = createTestArrayBuffer(4); // 4 bytes
  const num1 = 42.5;
  const num2 = -13.75;

  const packed = packNumbersToArrayBuffer(num1, num2, originalBuffer);
  // The new buffer should have 16 (for two floats) + 4 = 20 bytes
  assertEquals(packed.byteLength, 20);

  // Verify the original 4 bytes are at the end
  const packedView = new Uint8Array(packed);
  const originalView = new Uint8Array(originalBuffer);
  for (let i = 0; i < originalView.length; i++) {
    assertEquals(packedView[16 + i], originalView[i]);
  }
});

Deno.test("unpackNumbersFromArrayBuffer - basic usage", () => {
  // We can create a buffer that we know starts with 2 floats + some leftover
  const buffer = new ArrayBuffer(24); // 16 for floats + 8 leftover
  const view = new DataView(buffer);

  // Write two test floats in little-endian
  const num1 = 3.14;
  const num2 = 2.71828;
  view.setFloat64(0, num1, true);
  view.setFloat64(8, num2, true);

  // Write some leftover data
  const leftoverBytes = [10, 20, 30, 40, 50, 60, 70, 80];
  leftoverBytes.forEach((val, i) => view.setUint8(16 + i, val));

  const [unpacked1, unpacked2, leftover] = unpackNumbersFromArrayBuffer(buffer);

  assertEquals(unpacked1, num1);
  assertEquals(unpacked2, num2);
  assertEquals(leftover.byteLength, 8);

  // Check leftover contents
  const leftoverView = new Uint8Array(leftover);
  leftoverBytes.forEach((val, i) => {
    assertEquals(leftoverView[i], val);
  });
});

Deno.test("pack/unpack round-trip test", () => {
  const originalBuffer = createTestArrayBuffer(10);
  const num1 = 12345.6789;
  const num2 = -98765.4321;

  // Pack
  const packed = packNumbersToArrayBuffer(num1, num2, originalBuffer);
  // Unpack
  const [res1, res2, remainder] = unpackNumbersFromArrayBuffer(packed);

  // Verify
  assertEquals(res1, num1);
  assertEquals(res2, num2);
  assertEquals(remainder.byteLength, originalBuffer.byteLength);

  // Check leftover bytes are unchanged
  const remainderView = new Uint8Array(remainder);
  const originalView = new Uint8Array(originalBuffer);
  for (let i = 0; i < remainderView.length; i++) {
    assertEquals(remainderView[i], originalView[i]);
  }
});

Deno.test("pack/unpack - handle 0-length original buffer", () => {
  const empty = new ArrayBuffer(0);
  const packed = packNumbersToArrayBuffer(999.99, -0.001, empty);

  // Should now have exactly 16 bytes (only floats)
  assertEquals(packed.byteLength, 16);

  // Unpack
  const [n1, n2, leftover] = unpackNumbersFromArrayBuffer(packed);
  assertEquals(n1, 999.99);
  assertEquals(n2, -0.001);
  assertEquals(leftover.byteLength, 0);
});

Deno.test("isArrayBuffer - checks various inputs", () => {
  assert(isArrayBuffer(new ArrayBuffer(8)));
  assertFalse(isArrayBuffer(new Uint8Array(8)));
  assertFalse(isArrayBuffer(null));
  assertFalse(isArrayBuffer(undefined));
  assertFalse(isArrayBuffer({}));
  assertFalse(isArrayBuffer("string"));
  assertFalse(isArrayBuffer(123));
});
