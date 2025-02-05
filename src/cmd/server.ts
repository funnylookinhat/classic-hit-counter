import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { compress } from "hono/compress";
import { getCounterImage } from "@/services/counter-image/index.ts";
import { getConfig } from "@/util/config.ts";
import {
  getSiteVisit,
  getSiteVisitTotals,
} from "@/services/site-visit/index.ts";

const config = getConfig();

const app = new Hono();

app.use(compress());

if (config.DEV_MODE) {
  app.use("/html/*", serveStatic({ root: "./assets/" }));
}

app.get("/site-count.png", async (c) => {
  const siteVisit = getSiteVisit(c);

  return c.body(await getCounterImage(siteVisit.siteVisit), 200, {
    "Content-Type": "image/png",
  });
});

// TODO - Consider a /page-count.png

app.get("/stats.json", async (c) => {
  return c.json(getSiteVisitTotals(), 200);
});

Deno.serve({ port: config.PORT }, app.fetch);
