import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { compress } from "hono/compress";
import { getNumberImage } from "./number-image.ts";
import { getConfig } from "./config.ts";

const config = getConfig();

const app = new Hono();

let i = 0;

app.use(compress());
app.use("/test.html", serveStatic({ path: "./test.html" }));
app.get("/count.png", async (c) => {
  console.log(`headers: `, c.req.header());
  return c.body(await getNumberImage(++i), 200, {
    "Content-Type": "image/png",
  });
});

Deno.serve({ port: config.PORT }, app.fetch);
