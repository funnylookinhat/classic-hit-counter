import { join } from "@std/path/join";

export function getPathRoot(): string {
  if (import.meta.dirname === undefined) {
    throw new Error(`Undefined import.meta.dirname`);
  }
  return join(import.meta.dirname, "/../../");
}

export function getPathToFile(pathFromRoot: string): string {
  return join(getPathRoot(), pathFromRoot);
}
