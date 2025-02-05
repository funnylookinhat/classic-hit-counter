import { initVariable } from "jsr:@wuespace/envar";
import { z } from "npm:zod";

// The configuration validation is a bit messy - mixed up between zod and a
// type guard.

// TODO - DOCUMENT CONFIGURATION

await initVariable("DEV_MODE", z.string(), "DISABLED");
await initVariable("SITE_DOMAIN", z.string(), "");
await initVariable("PORT", z.string().regex(/^[0-9]{1,5}$/), "8000");
await initVariable(
  "COUNTER_STYLE",
  z.string(),
  "blue_digital_small",
);
await initVariable("REQUIRE_REFERER", z.string(), "DISABLED");
await initVariable("DATA_DIR", z.string(), "./data");

export interface Config {
  PORT: number;
  COUNTER_STYLE: "blue_digital_small" | "blue_digital_large";
  DEV_MODE: boolean;
  SITE_DOMAIN: string;
  REQUIRE_REFERER: boolean;
  DATA_DIR: string;
}

function isConfig(obj: unknown): obj is Config {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Config).DEV_MODE === "boolean" &&
    typeof (obj as Config).REQUIRE_REFERER === "boolean" &&
    typeof (obj as Config).PORT === "number" &&
    (obj as Config).PORT >= 0 &&
    (obj as Config).PORT <= 65535 &&
    typeof (obj as Config).COUNTER_STYLE === "string" &&
    ["blue_digital_small", "blue_digital_large"].includes(
      (obj as Config).COUNTER_STYLE,
    ) &&
    typeof (obj as Config).DATA_DIR === "string"
  );
}

export function getConfig(): Config {
  const c = {
    // The ?? is here just for TS - we know based on envar that this value
    // will be present and a numeric string.
    PORT: parseInt(Deno.env.get("PORT") ?? "8080", 10),
    COUNTER_STYLE: Deno.env.get("COUNTER_STYLE"),
    DEV_MODE: Deno.env.get("DEV_MODE") === "ENABLED",
    SITE_DOMAIN: Deno.env.get("SITE_DOMAIN") ?? "",
    REQUIRE_REFERER: Deno.env.get("REQUIRE_REFERER") === "ENABLED",
    DATA_DIR: Deno.env.get("DATA_DIR") ?? "./data",
  };

  if (!isConfig(c)) {
    throw new Error("Invalid configuration");
  }

  return c;
}
