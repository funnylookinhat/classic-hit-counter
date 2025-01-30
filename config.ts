import { initVariable } from "jsr:@wuespace/envar";
import { z } from "npm:zod";

// The configuration validation is a bit messy - mixed up between zod and a
// type guard.

await initVariable("PORT", z.string().regex(/^[0-9]{1,5}$/), "8000");
await initVariable(
  "COUNTER_STYLE",
  z.string(),
  "blue_digital_small",
);

export interface Config {
  PORT: number;
  COUNTER_STYLE: "blue_digital_small" | "blue_digital_large";
}

function isConfig(obj: unknown): obj is Config {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Config).PORT === "number" &&
    (obj as Config).PORT >= 0 &&
    (obj as Config).PORT <= 65535 &&
    typeof (obj as Config).COUNTER_STYLE === "string" &&
    ["blue_digital_small", "blue_digital_large"].includes(
      (obj as Config).COUNTER_STYLE,
    )
  );
}

export function getConfig(): Config {
  const c = {
    // The ?? is here just for TS - we know based on envar that this value
    // will be present and a numeric string.
    PORT: parseInt(Deno.env.get("PORT") ?? "8080", 10),
    COUNTER_STYLE: Deno.env.get("COUNTER_STYLE"),
  };

  if (!isConfig(c)) {
    throw new Error("Invalid configuration");
  }

  return c;
}
