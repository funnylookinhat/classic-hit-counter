import { Buffer } from "node:buffer";
import { type NumberImageIncomingEvent } from "./number-image-worker.ts";
import { isArrayBuffer, unpackNumberFromArrayBuffer } from "./array-buffer.ts";
import {
  generateHoistedPromise,
  type HoistedPromise,
} from "./hoisted-promise.ts";

const workerUrl = new URL("./number-image-worker.ts", import.meta.url).href;
const numberImageWorker = new Worker(workerUrl, {
  type: "module",
});

const pendingWorkerPromises: Record<number, HoistedPromise<Uint8Array>> = {};

async function generateNumberImage(number: number): Promise<Uint8Array> {
  pendingWorkerPromises[number] = generateHoistedPromise<Uint8Array>();

  const numberImageIncomingEvent: NumberImageIncomingEvent = {
    data: {
      number,
    },
  };

  numberImageWorker.postMessage(numberImageIncomingEvent.data);

  return pendingWorkerPromises[number].promise;
}

numberImageWorker.onmessage = (e) => {
  if (!isArrayBuffer(e.data)) {
    console.error(
      `Unexpected callback from worker: ${JSON.stringify(e).substring(0, 100)}`,
    );
    return;
  }

  const { number, remainingBuffer } = unpackNumberFromArrayBuffer(e.data);

  if (pendingWorkerPromises[number] === undefined) {
    console.error(`No pending worker promise found for ${number}`);
    return;
  }

  pendingWorkerPromises[number].resolve(
    new Uint8Array(remainingBuffer),
  );

  delete pendingWorkerPromises[number];
};

// This is a cheap mechanism to manage a pre-generated set of images to stay
// just in front of whatever is requested.  It makes quite a few assumptions -
// e.g. that numbers will always be requested incrementally... and it doesn't
// clean up after itself at all.
// Ideally this whole thing moves to the worker - it manages the pressure
// and just holds the data in memory until the message comes through asking
// for it.
const numberImagePromises: Record<number, Promise<Uint8Array>> = {};
let currentNumberIndex = 0;

const DEFAULT_COUNT = 5;

function fillNumberImages(
  startIndex: number,
  count: number,
): Promise<Uint8Array> {
  if (!Number.isInteger(count)) {
    throw new Error(
      `Invalid count provided (${count}) - must be an integer.`,
    );
  }

  // remove?
  currentNumberIndex = startIndex;

  for (let i = currentNumberIndex; i < currentNumberIndex + count; i++) {
    if (numberImagePromises[i] !== undefined) {
      // console.log(`fillNumberImages: Skipping ${i}`);
    } else {
      // console.log(`fillNumberImages: Generating ${i}`);
      numberImagePromises[i] = generateNumberImage(i);
    }
  }

  return numberImagePromises[startIndex];
}

fillNumberImages(1, DEFAULT_COUNT);

export function getNumberImage(number: number): Promise<Uint8Array> {
  if (!Number.isInteger(number)) {
    throw new Error(
      `Invalid number provided (${number} - must be an integer.`,
    );
  }

  // Could maybe rewrite this to be managed in fillNumberImages now
  // e.g. have that just check if it is undefined and return.
  if (numberImagePromises[number] === undefined) {
    return fillNumberImages(number, DEFAULT_COUNT);
  }

  if (
    numberImagePromises[number + Math.floor(DEFAULT_COUNT / 2) + 1] ===
      undefined
  ) {
    return fillNumberImages(number, DEFAULT_COUNT);
  }

  return numberImagePromises[number];
}
