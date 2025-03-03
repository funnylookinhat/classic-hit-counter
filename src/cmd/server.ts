import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { compress } from "hono/compress";
import { getConfig } from "@/util/config.ts";
import {
  getHitCountImage,
  getPageCountImage,
  getSiteCountImage,
  getVisitTotals,
} from "@/services/site-visit/mod.ts";
import { getPathToFile } from "@/util/path-root.ts";
import { logger } from "../util/logger.ts";

const config = getConfig();

const app = new Hono();

app.use(compress());

app.use(async (c, next) => {
  logger.debug(
    "cmd.server",
    "received request",
    {
      method: c.req.method,
      url: c.req.url,
      headers: c.req.header(),
    },
  );
  await next();
});

if (config.DEV_MODE) {
  app.use("/html/*", serveStatic({ root: getPathToFile("assets/") }));
}

app.get("/site-count.png", async (c) => {
  return c.body(await getSiteCountImage(c), 200, {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-cache",
  });
});

app.get("/page-count.png", async (c) => {
  return c.body(await getPageCountImage(c), 200, {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-cache",
  });
});

app.get("/hit-count.png", async (c) => {
  return c.body(await getHitCountImage(c), 200, {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-cache",
  });
});

app.get("/stats.json", (c) => {
  return c.json(getVisitTotals(), 200, {
    "Cache-Control": "private, no-cache",
  });
});

Deno.serve({ port: config.PORT }, app.fetch);
