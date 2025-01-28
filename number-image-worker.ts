import { packNumberToArrayBuffer } from "./array-buffer.ts";
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

function isNumberImageIncomingEvent(
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

(self as unknown as DedicatedWorkerGlobalScope).onmessage = async (e) => {
  if (!isNumberImageIncomingEvent(e)) {
    console.error(
      `NumberImageWorker.onmessage: received unexpected message format`,
    );
    return;
  }

  try {
    const arrayBuffer = (await createNumberImage(
      e.data.number,
      "blue_analog_small",
    )).buffer;
    (self as unknown as DedicatedWorkerGlobalScope).postMessage(
      packNumberToArrayBuffer(e.data.number, arrayBuffer),
    );
  } catch (error) {
    return console.error(`NumberImageWorkerOptimized Error: ${error}`);
  }
};
