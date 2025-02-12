import sharp from "sharp";
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
  // TODO - Turn into options
  minDigits: number = 10,
): Promise<Buffer> {
  if (!Number.isInteger(number)) {
    throw new Error(`Invalid number provided (${number} - must be an integer.`);
  }

  const counterStyle = await getCounterStyle(style);

  const { digitWidth, digitHeight, spacing, padding, backgroundColor } =
    counterStyle;

  const digits = String(number).padStart(minDigits, "0");
  const digitImages = digits
    .split("")
    .map((digit: string) => counterStyle.images[`${(digit as ImageKey)}`]);

  const totalWidth = padding * 2 + digits.length * digitWidth +
    (digits.length - 1) * spacing;
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
