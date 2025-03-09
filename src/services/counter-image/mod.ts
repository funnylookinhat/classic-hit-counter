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
import { logger } from "../../util/logger.ts";

const config = getConfig();

const workerUrl = new URL("./worker/mod.ts", import.meta.url).href;

const WORKER_POOL_SIZE = config.IMAGE_WORKERS;

const workerPool: Worker[] = [];

const pendingWorkerPromises: Record<number, HoistedPromise<Uint8Array>> = {};

export function configureWorkers(style: string, minDigits: number): void {
  const configureCounterImageEvent: ConfigureCounterImageEvent = {
    data: {
      event: "configure",
      style,
      minDigits,
    },
  };

  workerPool.map((worker) => {
    worker.postMessage(configureCounterImageEvent.data);
  });
}

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

  const worker = workerPool[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % WORKER_POOL_SIZE;

  worker.postMessage(createCounterImageEvent.data);

  return pendingWorkerPromises[id].promise;
}

function onWorkerMessage(e) {
  if (!isArrayBuffer(e.data)) {
    logger.error(
      "service.counter-image",
      `Unexpected callback from worker`,
      {
        event: JSON.stringify(e).substring(0, 100),
      },
    );
    return;
  }

  const [id, , remainingBuffer] = unpackNumbersFromArrayBuffer(
    e.data,
  );

  if (pendingWorkerPromises[id] === undefined) {
    logger.error("service.counter-error", `No pending worker promise found`, {
      promiseId: id,
    });
    return;
  }

  pendingWorkerPromises[id].resolve(
    new Uint8Array(remainingBuffer),
  );

  delete pendingWorkerPromises[id];
}

logger.info("service.counter-image", `Loading image workers.`, {
  workerCount: WORKER_POOL_SIZE,
});

for (let i = 0; i < WORKER_POOL_SIZE; i++) {
  const w = new Worker(workerUrl, { type: "module" });
  w.onmessage = onWorkerMessage;
  workerPool.push(w);
}

configureWorkers(config.COUNTER_STYLE, config.MINIMUM_IMAGE_DIGITS);

let nextWorkerIndex = 0;

export function getCounterImage(number: number): Promise<Uint8Array> {
  if (!Number.isInteger(number)) {
    throw new Error(
      `Invalid number provided (${number} - must be an integer.`,
    );
  }

  return generateCounterImage(number);
}
