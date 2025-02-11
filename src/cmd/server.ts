import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { compress } from "hono/compress";
import { getCounterImage } from "../services/counter-image/mod.ts";
import { getConfig } from "@/util/config.ts";
import { getVisitTotals, handleRequest } from "../services/site-visit/mod.ts";
import { getPathToFile } from "@/util/path-root.ts";

const config = getConfig();

const app = new Hono();

app.use(compress());

if (config.DEV_MODE) {
  app.use("/html/*", serveStatic({ root: getPathToFile("assets/") }));
}

app.get("/site-count.png", async (c) => {
  const siteVisit = handleRequest(c);

  return c.body(await getCounterImage(siteVisit.siteVisit), 200, {
    "Content-Type": "image/png",
  });
});

app.get("/hit-count.png", async (c) => {
  const siteVisit = handleRequest(c);

  return c.body(await getCounterImage(siteVisit.siteHit), 200, {
    "Content-Type": "image/png",
  });
});

app.get("/page-count.png", async (c) => {
  const siteVisit = handleRequest(c);

  return c.body(await getCounterImage(siteVisit.pageVisit), 200, {
    "Content-Type": "image/png",
  });
});

// TODO - Consider a /page-count.png

app.get("/stats.json", async (c) => {
  return c.json(getVisitTotals(), 200);
});

Deno.serve({ port: config.PORT }, app.fetch);
