import { initVariable } from "jsr:@wuespace/envar";
import { z } from "npm:zod";

// The configuration validation is a bit messy - mixed up between zod and a
// type guard.

// TODO - DOCUMENT CONFIGURATION

await initVariable("DEV_MODE", z.string(), "DISABLED");
await initVariable("SITE_DOMAIN", z.string(), "");
await initVariable("REQUIRE_SITE_DOMAIN", z.string(), "DISABLED");
await initVariable("PORT", z.string().regex(/^[0-9]{1,5}$/), "8000");
await initVariable(
  "COUNTER_STYLE",
  z.string(),
  "blue_digital_small",
);
await initVariable("DATA_DIR", z.string(), "./data");
await initVariable("IP_HEADER", z.string(), "x-forwarded-for");
await initVariable("MAX_IP_TRACKING", z.string(), "10000");

export interface Config {
  PORT: number;
  COUNTER_STYLE: "blue_digital_small" | "blue_digital_large";
  DEV_MODE: boolean;
  SITE_DOMAIN: string;
  REQUIRE_SITE_DOMAIN: boolean;
  DATA_DIR: string;
  IP_HEADER: string;
  MAX_IP_TRACKING: number;
}

function isConfig(obj: unknown): obj is Config {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Config).DEV_MODE === "boolean" &&
    typeof (obj as Config).PORT === "number" &&
    (obj as Config).PORT >= 0 &&
    (obj as Config).PORT <= 65535 &&
    typeof (obj as Config).COUNTER_STYLE === "string" &&
    ["blue_digital_small", "blue_digital_large"].includes(
      (obj as Config).COUNTER_STYLE,
    ) &&
    typeof (obj as Config).DATA_DIR === "string" &&
    typeof (obj as Config).IP_HEADER === "string" &&
    typeof (obj as Config).MAX_IP_TRACKING === "number"
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
    REQUIRE_SITE_DOMAIN: Deno.env.get("SITE_DOMAIN") === "ENABLED",
    DATA_DIR: Deno.env.get("DATA_DIR") ?? "./data",
    IP_HEADER: Deno.env.get("IP_HEADER") ?? "x-forwarded-for",
    MAX_IP_TRACKING: parseInt(Deno.env.get("MAX_IP_TRACKING") ?? "10000", 10),
  };

  if (!isConfig(c)) {
    throw new Error("Invalid configuration");
  }

  return c;
}
