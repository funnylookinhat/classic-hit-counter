import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { getNumberImage } from "./number-image.ts";

const app = new Hono();

let i = 0;

app.use("/test.html", serveStatic({ path: "./test.html" }));
app.get("/count.png", async (c) => {
  console.log(`headers: `, c.req.header());
  return c.body(await getNumberImage(++i), 200, {
    "Content-Type": "image/png",
  });
});

Deno.serve(app.fetch);
