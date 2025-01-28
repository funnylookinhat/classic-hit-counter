import { createNumberImage } from "./create-number-image.ts";

// Consider moving to a separate file
interface DedicatedWorkerGlobalScope {
  onmessage: (e: MessageEvent) => void;
  postMessage: (message: any) => void;
}

export interface NumberImageIncomingEvent {
  data: {
    number: number;
  };
}

export interface NumberImageCallbackEvent {
  data: {
    number: number;
    buffer: ArrayBuffer | null;
    error: Error | null;
  };
}

export function isNumberImageIncomingEvent(
  obj: unknown,
): obj is NumberImageIncomingEvent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as NumberImageIncomingEvent).data === "object" &&
    (obj as NumberImageIncomingEvent).data !== null &&
    typeof (obj as NumberImageIncomingEvent).data.number === "number"
  );
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// Type guard for NumberImageCallbackEvent
export function isNumberImageCallbackEvent(
  value: unknown,
): value is NumberImageCallbackEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as NumberImageCallbackEvent).data === "object" &&
    (value as NumberImageCallbackEvent).data !== null &&
    typeof (value as NumberImageCallbackEvent).data.number === "number" &&
    ((value as NumberImageCallbackEvent).data.buffer === null ||
      isArrayBuffer((value as NumberImageCallbackEvent).data.buffer)) &&
    ((value as NumberImageCallbackEvent).data.error === null ||
      isError((value as NumberImageCallbackEvent).data.error))
  );
}

(self as unknown as DedicatedWorkerGlobalScope).onmessage = async (e) => {
  if (!isNumberImageIncomingEvent(e)) {
    console.error(
      `NumberImageWorker.onmessage: received unexpected message format`,
    );
    return;
  }

  const callbackEvent: NumberImageCallbackEvent = {
    data: {
      number: e.data.number,
      buffer: null,
      error: null,
    },
  };
  try {
    callbackEvent.data.buffer = (await createNumberImage(
      callbackEvent.data.number,
      "blue_analog_small",
    )).buffer;
  } catch (error) {
    if (!isError(error)) {
      console.error(
        `Catch received a non-error type.  Converting to an error.`,
      );
      callbackEvent.data.error = new Error(`${error}`);
    } else {
      callbackEvent.data.error = error;
    }
  }

  (self as unknown as DedicatedWorkerGlobalScope).postMessage(
    callbackEvent.data,
  );
};
