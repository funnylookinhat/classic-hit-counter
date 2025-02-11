import {
  createCanvas,
  EmulatedCanvas2D,
  loadImage,
} from "@josefabio/deno-canvas";
import { Buffer } from "node:buffer";
import { getPathToFile } from "@/util/path-root.ts";

interface CounterStyleConfig {
  digitWidth: number;
  digitHeight: number;
  spacing: number;
  padding: number;
  backgroundColor: string;
  images: {
    "0": string;
    "1": string;
    "2": string;
    "3": string;
    "4": string;
    "5": string;
    "6": string;
    "7": string;
    "8": string;
    "9": string;
  };
}

interface CounterStyle {
  digitWidth: number;
  digitHeight: number;
  spacing: number;
  padding: number;
  backgroundColor: string;
  images: {
    "0": Buffer;
    "1": Buffer;
    "2": Buffer;
    "3": Buffer;
    "4": Buffer;
    "5": Buffer;
    "6": Buffer;
    "7": Buffer;
    "8": Buffer;
    "9": Buffer;
  };
}

type ImageKey = keyof CounterStyle["images"];

const COUNTERS: Record<string, CounterStyle> = {};

// Load a style from disk (digit images, config, etc.) only once.
// Results are cached in `COUNTERS`.
async function getCounterStyle(style: string): Promise<CounterStyle> {
  if (COUNTERS[style] !== undefined) {
    return COUNTERS[style];
  }

  const config: CounterStyleConfig = JSON.parse(
    new TextDecoder().decode(
      await Deno.readFile(
        getPathToFile(`/assets/images/${style}/config.json`),
      ),
    ),
  );

  return COUNTERS[style] = {
    digitWidth: config.digitWidth,
    digitHeight: config.digitHeight,
    spacing: config.spacing,
    padding: config.padding,
    backgroundColor: config.backgroundColor,
    images: {
      0: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[0]}`),
        ),
      ),
      1: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[1]}`),
        ),
      ),
      2: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[2]}`),
        ),
      ),
      3: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[3]}`),
        ),
      ),
      4: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[4]}`),
        ),
      ),
      5: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[5]}`),
        ),
      ),
      6: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[6]}`),
        ),
      ),
      7: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[7]}`),
        ),
      ),
      8: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[8]}`),
        ),
      ),
      9: Buffer.from(
        await Deno.readFile(
          getPathToFile(`/assets/images/${style}/${config.images[9]}`),
        ),
      ),
    },
  };
}

export async function createCounterImage(
  number: number,
  style: string,
  minDigits = 10,
): Promise<Buffer> {
  if (!Number.isInteger(number)) {
    throw new Error(
      `Invalid number provided (${number}) - must be an integer.`,
    );
  }

  const counterStyle = await getCounterStyle(style);
  const { digitWidth, digitHeight, spacing, padding, backgroundColor } =
    counterStyle;

  // Convert the number to the string padded to the minimum digits:
  const digits = String(number).padStart(minDigits, "0");

  // Gather the buffers for each digit
  const digitBuffers = digits.split("").map((digit) =>
    counterStyle.images[digit as ImageKey]
  );

  const totalWidth = padding * 2 + minDigits * digitWidth +
    (minDigits - 1) * spacing;
  const totalHeight = padding * 2 + digitHeight;

  // Create a canvas and its 2D context
  const canvas = createCanvas(totalWidth, totalHeight);
  const ctx = canvas.getContext("2d");

  // Fill the background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Draw each digit
  for (let i = 0; i < digitBuffers.length; i++) {
    const x = padding + i * (digitWidth + spacing);
    const y = padding;

    // loadImage can load from a Blob, URL, or Uint8Array. We convert the Buffer to Uint8Array.
    const image = await loadImage(new Uint8Array(digitBuffers[i]));
    ctx.drawImage(image, x, y, digitWidth, digitHeight);
  }

  // Export to PNG bytes
  const pngBytes = canvas.toBuffer("image/png");
  // Return as a Node.js Buffer if desired
  return Buffer.from(pngBytes);
}
