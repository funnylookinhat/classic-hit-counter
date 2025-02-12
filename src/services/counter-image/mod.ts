import {
  type ConfigureCounterImageEvent,
  type CreateCounterImageEvent,
} from "./worker/mod.ts";
import {
  isArrayBuffer,
  unpackNumbersFromArrayBuffer,
} from "@/util/array-buffer.ts";
import {
  generateHoistedPromise,
  type HoistedPromise,
} from "@/util/hoisted-promise.ts";
import { getConfig } from "@/util/config.ts";

const config = getConfig();

const workerUrl = new URL("./worker/mod.ts", import.meta.url).href;
const numberImageWorker = new Worker(workerUrl, {
  type: "module",
});

const pendingWorkerPromises: Record<number, HoistedPromise<Uint8Array>> = {};

function configureWorker(style: string): void {
  const configureCounterImageEvent: ConfigureCounterImageEvent = {
    data: {
      event: "configure",
      style,
      minDigits: config.MINIMUM_IMAGE_DIGITS,
    },
  };

  numberImageWorker.postMessage(configureCounterImageEvent.data);
}

configureWorker(config.COUNTER_STYLE);

function getRandomNumber(max: number = Number.MAX_SAFE_INTEGER): number {
  return Math.floor(Math.random() * max) + 1;
}

function generateCounterImage(number: number): Promise<Uint8Array> {
  const id = getRandomNumber();
  pendingWorkerPromises[id] = generateHoistedPromise<Uint8Array>();

  const createCounterImageEvent: CreateCounterImageEvent = {
    data: {
      event: "create-image",
      number,
      id,
    },
  };

  numberImageWorker.postMessage(createCounterImageEvent.data);

  return pendingWorkerPromises[id].promise;
}

numberImageWorker.onmessage = (e) => {
  if (!isArrayBuffer(e.data)) {
    console.error(
      `Unexpected callback from worker: ${JSON.stringify(e).substring(0, 100)}`,
    );
    return;
  }

  const [id, , remainingBuffer] = unpackNumbersFromArrayBuffer(
    e.data,
  );

  if (pendingWorkerPromises[id] === undefined) {
    console.error(`No pending worker promise found for ${id}`);
    return;
  }

  pendingWorkerPromises[id].resolve(
    new Uint8Array(remainingBuffer),
  );

  delete pendingWorkerPromises[id];
};

export function getCounterImage(number: number): Promise<Uint8Array> {
  if (!Number.isInteger(number)) {
    throw new Error(
      `Invalid number provided (${number} - must be an integer.`,
    );
  }

  return generateCounterImage(number);
}
