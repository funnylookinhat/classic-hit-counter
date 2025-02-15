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
  MINIMUM_IMAGE_DIGITS: number;
  IMAGE_WORKERS: number;
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
    typeof (obj as Config).MINIMUM_IMAGE_DIGITS === "number" &&
    typeof (obj as Config).IMAGE_WORKERS === "number" &&
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
  if (Number.isNaN(c.PORT) || c.PORT < 1 || c.PORT > 65535) {
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
  if (Number.isNaN(c.MINIMUM_IMAGE_DIGITS) || c.MINIMUM_IMAGE_DIGITS < 1) {
    throw new Error(
      `Invalid MINIMUM_IMAGE_DIGITS - Must be greater than 0.  Got ${c.MINIMUM_IMAGE_DIGITS}`,
    );
  }
  if (Number.isNaN(c.IMAGE_WORKERS) || c.IMAGE_WORKERS < 1) {
    throw new Error(
      `Invalid IMAGE_WORKERS - Must be greater than 0.  Got ${c.IMAGE_WORKERS}`,
    );
  }
}

function loadConfig(): Config {
  const c = {
    PORT: parseInt(Deno.env.get("PORT") ?? "8000", 10),
    COUNTER_STYLE: Deno.env.get("COUNTER_STYLE") ?? "blue_digital_small",
    DEV_MODE: Deno.env.get("DEV_MODE") === "ENABLED",
    SITE_DOMAIN: Deno.env.get("SITE_DOMAIN") ?? "localhost",
    REQUIRE_SITE_DOMAIN: Deno.env.get("REQUIRE_SITE_DOMAIN") === "ENABLED",
    // We explicitly check for a blank DATA_DIR wherever it is used and will
    // create a temporary directory if necessary.
    DATA_DIR: Deno.env.get("DATA_DIR") ?? "",
    IP_HEADER: Deno.env.get("IP_HEADER") ?? "x-forwarded-for",
    MAX_IP_TRACKING: parseInt(Deno.env.get("MAX_IP_TRACKING") ?? "10000", 10),
    MINIMUM_IMAGE_DIGITS: parseInt(
      Deno.env.get("MINIMUM_IMAGE_DIGITS") ?? "10",
      10,
    ),
    IMAGE_WORKERS: parseInt(Deno.env.get("IMAGE_WORKERS") ?? "1", 10),
  };

  if (!isConfig(c)) {
    throw new Error("Invalid configuration.");
  }

  validateConfig(c);

  return c;
}

const config = loadConfig();

export function getConfig(): Config {
  if (config === undefined) {
    throw new Error("Config was never initialized.");
  }

  return config;
}
