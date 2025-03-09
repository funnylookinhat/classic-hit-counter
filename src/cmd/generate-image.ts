import { parseArgs } from "@std/cli/parse-args";
import {
  configureWorkers,
  getCounterImage,
} from "@/services/counter-image/mod.ts";
import { COUNTER_STYLE_OPTIONS } from "@/util/config.ts";
import { getPathToFile } from "@/util/path-root.ts";

async function main() {
  const flags = parseArgs(Deno.args, {
    string: ["count", "style", "digits"],
  });

  const count = parseInt(flags.count ?? "0", 10);

  if (Number.isNaN(count) || count <= 0) {
    throw new Error(
      "Please provide a valid number with --count=N.  Must be greater than 0.",
    );
  }

  const style = flags.style;

  if (!style || !COUNTER_STYLE_OPTIONS.includes(style)) {
    throw new Error(
      `Please provide a valid style with --style=STYLE.  Allowed values are: ${
        COUNTER_STYLE_OPTIONS.join(", ")
      }`,
    );
  }

  if (!flags.digits) {
    console.log(`No --digits flag provided, using default of 10.`);
    flags.digits = "10";
  }

  const digits = parseInt(flags.digits, 10);

  if (Number.isNaN(digits) || digits <= 0) {
    throw new Error(
      "Please provide a valid number with --digits=N.  Must be greater than 0.  Will default to 10 if not provided.",
    );
  }

  configureWorkers(style, digits);

  // We have no way to know when the worker is configured... but it's safe to
  // assume 500ms is plenty of time.

  await new Promise((resolve) => setTimeout(resolve, 500));

  await Deno.mkdir(getPathToFile(`tmp/`), { recursive: true });

  const image = await getCounterImage(count);
  const fileName = `${count}_${style}.png`;

  await Deno.writeFile(getPathToFile(`tmp/${fileName}`), image);

  console.log(
    `Image generated and saved as ${getPathToFile(`tmp/${fileName}`)}`,
  );
}

try {
  await main();
  Deno.exit(0);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error(`Error: Unexpected error type: ${error}`);
  }
  Deno.exit(1);
}
