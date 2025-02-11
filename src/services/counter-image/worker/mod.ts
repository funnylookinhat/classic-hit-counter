import { packNumbersToArrayBuffer } from "@/util/array-buffer.ts";
import { createCounterImage } from "./image.ts";
import { Buffer } from "node:buffer";

interface DedicatedWorkerGlobalScope {
  onmessage: (e: MessageEvent) => void;
  postMessage: (message: any) => void;
}

interface CounterImageEvent {
  data: {
    event: string;
  };
}

export interface CreateCounterImageEvent extends CounterImageEvent {
  data: {
    event: "create-image";
    number: number;
    id: number;
  };
}

export interface ConfigureCounterImageEvent extends CounterImageEvent {
  data: {
    event: "configure";
    style: string;
  };
}

function isCreateCounterImageEvent(
  obj: unknown,
): obj is CreateCounterImageEvent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as CreateCounterImageEvent).data === "object" &&
    (obj as CreateCounterImageEvent).data !== null &&
    typeof (obj as CreateCounterImageEvent).data.event === "string" &&
    (obj as CreateCounterImageEvent).data.event === "create-image" &&
    typeof (obj as CreateCounterImageEvent).data.number === "number" &&
    typeof (obj as CreateCounterImageEvent).data.id === "number"
  );
}

function isConfigureCounterImageEvent(
  obj: unknown,
): obj is ConfigureCounterImageEvent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as ConfigureCounterImageEvent).data === "object" &&
    (obj as ConfigureCounterImageEvent).data !== null &&
    typeof (obj as ConfigureCounterImageEvent).data.event === "string" &&
    (obj as ConfigureCounterImageEvent).data.event === "configure" &&
    typeof (obj as ConfigureCounterImageEvent).data.style === "string"
  );
}

let counterStyle: string;
let fallbackImageArrayBuffer: ArrayBufferLike;

(self as unknown as DedicatedWorkerGlobalScope).onmessage = async (
  e: MessageEvent<CounterImageEvent>,
) => {
  if (isConfigureCounterImageEvent(e)) {
    counterStyle = e.data.style;
    try {
      fallbackImageArrayBuffer =
        (await createCounterImage(0, counterStyle)).buffer;
    } catch (error) {
      console.error(
        `CounterImageWorker - Failed to generate fallback image: ${error}`,
      );
    }
    return;
  }

  if (isCreateCounterImageEvent(e)) {
    try {
      if (counterStyle === undefined) {
        throw new Error(`Worker has not been configured with a counter style.`);
      }
      const arrayBuffer = (await createCounterImage(
        e.data.number,
        counterStyle,
      )).buffer;
      (self as unknown as DedicatedWorkerGlobalScope).postMessage(
        packNumbersToArrayBuffer(e.data.id, e.data.number, arrayBuffer),
      );
      return;
    } catch (error) {
      console.error(
        `CounterImageWorker - Failed to generate image: ${error}`,
      );
      if (fallbackImageArrayBuffer !== undefined) {
        (self as unknown as DedicatedWorkerGlobalScope).postMessage(
          packNumbersToArrayBuffer(
            e.data.id,
            e.data.number,
            fallbackImageArrayBuffer,
          ),
        );
      }
      return;
    }
  }

  console.error(
    `CounterImageWorker.onmessage: received unexpected message format`,
  );
  return;
};
