import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { compress } from "hono/compress";
import { getCounterImage } from "@/services/counter-image/index.ts";
import { getConfig } from "@/util/config.ts";

const config = getConfig();

const app = new Hono();

let i = 0;

app.use(compress());
if (config.DEV_MODE) {
  app.use("/test.html", serveStatic({ path: "./assets/html/test.html" }));
}
app.get("/count.png", async (c) => {
  if (config.DEV_MODE) {
    console.log(`Request Headers: `, c.req.header());
  }
  return c.body(await getCounterImage(++i), 200, {
    "Content-Type": "image/png",
  });
});

Deno.serve({ port: config.PORT }, app.fetch);
