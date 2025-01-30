import { packNumberToArrayBuffer } from "./array-buffer.ts";
import { createNumberImage } from "./create-number-image.ts";

interface DedicatedWorkerGlobalScope {
  onmessage: (e: MessageEvent) => void;
  postMessage: (message: any) => void;
}

interface NumberImageEvent {
  data: {
    event: string;
  };
}

export interface CreateNumberImageEvent extends NumberImageEvent {
  data: {
    event: "create-image";
    number: number;
  };
}

export interface ConfigureNumberImageEvent extends NumberImageEvent {
  data: {
    event: "configure";
    style: string;
  };
}

function isCreateNumberImageEvent(
  obj: unknown,
): obj is CreateNumberImageEvent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as CreateNumberImageEvent).data === "object" &&
    (obj as CreateNumberImageEvent).data !== null &&
    typeof (obj as CreateNumberImageEvent).data.event === "string" &&
    (obj as CreateNumberImageEvent).data.event === "create-image" &&
    typeof (obj as CreateNumberImageEvent).data.number === "number"
  );
}

function isConfigureNumberImageEvent(
  obj: unknown,
): obj is ConfigureNumberImageEvent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as ConfigureNumberImageEvent).data === "object" &&
    (obj as ConfigureNumberImageEvent).data !== null &&
    typeof (obj as ConfigureNumberImageEvent).data.event === "string" &&
    (obj as ConfigureNumberImageEvent).data.event === "configure" &&
    typeof (obj as ConfigureNumberImageEvent).data.style === "string"
  );
}

let counterStyle: string;

(self as unknown as DedicatedWorkerGlobalScope).onmessage = async (
  e: MessageEvent<NumberImageEvent>,
) => {
  if (isConfigureNumberImageEvent(e)) {
    counterStyle = e.data.style;
    return;
  }

  if (isCreateNumberImageEvent(e)) {
    try {
      if (counterStyle === undefined) {
        throw new Error(`Worker has not been configured with a counter style.`);
      }
      const arrayBuffer = (await createNumberImage(
        e.data.number,
        counterStyle,
      )).buffer;
      (self as unknown as DedicatedWorkerGlobalScope).postMessage(
        packNumberToArrayBuffer(e.data.number, arrayBuffer),
      );
      return;
    } catch (error) {
      return console.error(`NumberImageWorkerOptimized Error: ${error}`);
    }
  }

  console.error(
    `NumberImageWorker.onmessage: received unexpected message format`,
  );
  return;
};
