import { getCounterImage } from "../services/counter-image/mod.ts";

async function generateImages(n: number, id: string): Promise<void> {
  for (let i = 0; i < n; i++) {
    await getCounterImage(i);
    if (i % 50 === 0) {
      console.log(`${id}: Generated Image ${i}`);
    }
  }
  console.log(`${id}: Done (${n} Images Generated)`);
}

(async function () {
  const count = parseInt(Deno.args[0]);
  const split = parseInt(Deno.args[1]);

  if (count === undefined || count === 0 || Number.isNaN(count)) {
    throw new Error("Please provide an image count.");
  }
  if (split === undefined || split === 0 || Number.isNaN(split)) {
    throw new Error("Please provide an image count.");
  }

  const start = Date.now();

  const promises = [];

  for (let i = 0; i < split; i++) {
    promises.push(generateImages(Math.floor(count / split), `${i}`));
  }

  await Promise.all(promises);

  const end = Date.now();

  console.log(`Timing: ${Math.floor((end - start) / 1000)} seconds`);

  Deno.exit(0);
})();
