// The configuration validation is a bit messy - mixed up between zod and a
// type guard.  We're using envar to ensure that the shape of a value

export interface Config {
  PORT: number;
  COUNTER_STYLE: string;
  DEV_MODE: boolean;
  SITE_DOMAIN: string;
  REQUIRE_SITE_DOMAIN: boolean;
  DATA_DIR: string;
  IP_HEADER: string;
  MAX_IP_TRACKING: number;
}

const COUNTER_STYLE_OPTIONS = ["blue_digital_small", "blue_digital_large"];

function isConfig(obj: unknown): obj is Config {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Config).DEV_MODE === "boolean" &&
    typeof (obj as Config).REQUIRE_SITE_DOMAIN === "boolean" &&
    typeof (obj as Config).PORT === "number" &&
    (obj as Config).PORT >= 0 &&
    (obj as Config).PORT <= 65535 &&
    typeof (obj as Config).MAX_IP_TRACKING === "number" &&
    typeof (obj as Config).COUNTER_STYLE === "string" &&
    typeof (obj as Config).DATA_DIR === "string" &&
    typeof (obj as Config).SITE_DOMAIN === "string" &&
    typeof (obj as Config).IP_HEADER === "string"
  );
}

/**
 * Strictly validate a config, throwing a detailed error for the first invalid
 * value found.
 * @param c The Config to validate.
 */
function validateConfig(c: Config): void {
  if (c.PORT < 1 || c.PORT > 65535) {
    throw new Error(
      `Invalid PORT - Must be between 1 and 65535. Got ${c.PORT}`,
    );
  }
  if (!COUNTER_STYLE_OPTIONS.includes(c.COUNTER_STYLE)) {
    throw new Error(
      `Invalid COUNTER_STYLE - Allowed values are ${
        COUNTER_STYLE_OPTIONS.join(", ")
      }. Got ${c.COUNTER_STYLE}`,
    );
  }
}

export function getConfig(): Config {
  const c = {
    PORT: parseInt(Deno.env.get("PORT") ?? "8080", 10),
    COUNTER_STYLE: Deno.env.get("COUNTER_STYLE") ?? "blue_digital_small",
    DEV_MODE: Deno.env.get("DEV_MODE") === "ENABLED",
    SITE_DOMAIN: Deno.env.get("SITE_DOMAIN") ?? "",
    REQUIRE_SITE_DOMAIN: Deno.env.get("SITE_DOMAIN") === "ENABLED",
    DATA_DIR: Deno.env.get("DATA_DIR") ?? "./data",
    IP_HEADER: Deno.env.get("IP_HEADER") ?? "x-forwarded-for",
    MAX_IP_TRACKING: parseInt(Deno.env.get("MAX_IP_TRACKING") ?? "10000", 10),
  };

  if (!isConfig(c)) {
    throw new Error("Invalid configuration.");
  }

  return c;
}
