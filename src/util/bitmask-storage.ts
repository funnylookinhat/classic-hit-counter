// quick idea - needs fleshing out.

// TODO - Create a formal type for the Uint32Array

// Create a bitset that can hold 10,000 bits
export function createBitSet(size: number): Uint32Array {
  // Round up to the nearest integer
  const length = Math.ceil(size / 32);
  return new Uint32Array(length);
}

// Mark a value as "present" in the set
export function addToSet(bitset: Uint32Array, v: number) {
  // Validate number is integer
  // Validate v can exist in bitset given size

  // Convert 1-based 'v' to 0-based index
  const index = v - 1;
  const bucket = index >>> 5; // index / 32 (integer division)
  const offset = index & 31; // index % 32
  bitset[bucket] |= 1 << offset;
}

// Mark a v as "absent" in the set
export function removeFromSet(bitset: Uint32Array, v: number) {
  // Validate number is integer
  // Validate v can exist in bitset given size

  const index = v - 1;
  const bucket = index >>> 5;
  const offset = index & 31;
  bitset[bucket] &= ~(1 << offset);
}

// Check if a v is present in the set
export function hasValue(bitset: Uint32Array, v: number) {
  // Validate number is integer
  // Validate v can exist in bitset given size

  const index = v - 1;
  const bucket = index >>> 5;
  const offset = index & 31;
  return (bitset[bucket] & (1 << offset)) !== 0;
}
