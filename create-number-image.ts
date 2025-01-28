import sharp from "sharp";
import { Buffer } from "node:buffer";

interface CounterFormatConfig {
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

interface CounterFormat {
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

type ImageKey = keyof CounterFormat["images"];

const COUNTERS: Record<string, CounterFormat> = {};

// Purposefully made synchronous for now - can async later... avoids potential
// race conditions if a lot of images are requested at once forcing this to load
// from memory multiple times.
function getCounterFormat(format: string): CounterFormat {
  if (COUNTERS[format] !== undefined) {
    return COUNTERS[format];
  }

  const config: CounterFormatConfig = JSON.parse(
    new TextDecoder().decode(
      Deno.readFileSync(`source_images/${format}/config.json`),
    ),
  );

  return COUNTERS[format] = {
    digitWidth: config.digitWidth,
    digitHeight: config.digitHeight,
    spacing: config.spacing,
    padding: config.padding,
    backgroundColor: config.backgroundColor,
    images: {
      0: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[0]}`),
      ),
      1: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[1]}`),
      ),
      2: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[2]}`),
      ),
      3: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[3]}`),
      ),
      4: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[4]}`),
      ),
      5: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[5]}`),
      ),
      6: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[6]}`),
      ),
      7: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[7]}`),
      ),
      8: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[8]}`),
      ),
      9: Buffer.from(
        Deno.readFileSync(`source_images/${format}/${config.images[9]}`),
      ),
    },
  };
}

export function createNumberImage(
  number: number,
  format: string,
  // TODO - Turn into options
  minDigits: number = 10,
): Promise<Buffer> {
  if (!Number.isInteger(number)) {
    throw new Error(`Invalid number provided (${number} - must be an integer.`);
  }

  const counterFormat = getCounterFormat(format);

  const { digitWidth, digitHeight, spacing, padding, backgroundColor } =
    counterFormat;

  const digits = String(number).padStart(minDigits, "0");
  const digitImages = digits
    .split("")
    .map((digit: string) => counterFormat.images[`${(digit as ImageKey)}`]);

  const totalWidth = padding * 2 + minDigits * digitWidth +
    (minDigits - 1) * spacing;
  const totalHeight = padding * 2 + digitHeight;

  // Load and position each digit image
  const compositeOptions = [];
  for (let i = 0; i < digitImages.length; i++) {
    const x = padding + i * (digitWidth + spacing);
    const y = padding;
    compositeOptions.push({
      input: digitImages[i],
      top: y,
      left: x,
    });
  }

  // Create the output image
  return sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: backgroundColor,
    },
  })
    .composite(compositeOptions)
    .toFormat("png")
    .toBuffer();
}
