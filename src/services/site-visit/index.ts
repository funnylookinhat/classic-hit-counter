import { type Context } from "hono";
import { guess as guessUserAgent } from "@wundero/uap-ts";
import { getConfig } from "@/util/config.ts";
import {
  decode as decodeBase62,
  encode as encodeBase62,
} from "@funnylookinhat/base62";
import { getCookie, setCookie } from "hono/cookie";

const config = getConfig();

export interface SiteVisitData {
  siteVisit: number;
  page: string;
  pageVisit: number;
  userAgent: {
    browserType: string;
    browserTypeVisit: number;
    browser: string;
    browserVisit: number;
    deviceType: string;
    deviceTypeVisit: number;
    osDevice: string;
    osDeviceVisit: number;
  };
}

export interface SiteVisitTotals {
  siteVisits: number;
  pageVisits: Record<string, number>;
  userAgentVisits: {
    browserType: Record<string, number>;
    browser: Record<string, number>;
    deviceType: Record<string, number>;
    osDevice: Record<string, number>;
  };
}

export type CookiePages = string[];

async function loadSiteVisitTotals(): Promise<SiteVisitTotals> {
  try {
    const siteVisitTotals: SiteVisitTotals = JSON.parse(
      new TextDecoder().decode(
        await Deno.readFile(
          await (`${config.DATA_DIR}/site-visit-totals.json`),
        ),
      ),
    );
    return siteVisitTotals;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      const siteVisitTotals: SiteVisitTotals = {
        siteVisits: 0,
        pageVisits: {},
        userAgentVisits: {
          browserType: {},
          browser: {},
          deviceType: {},
          osDevice: {},
        },
      };
      return siteVisitTotals;
    }
    throw error;
  }
}

async function saveSiteVisitTotals(
  siteVisitTotals: SiteVisitTotals,
): Promise<void> {
  await Deno.mkdir(config.DATA_DIR, { recursive: true });
  await Deno.writeTextFile(
    `${config.DATA_DIR}/site-visit-totals.json`,
    JSON.stringify(siteVisitTotals),
  );
}

async function loadCookiePages(): Promise<CookiePages> {
  try {
    const cookiePages: CookiePages = JSON.parse(
      new TextDecoder().decode(
        await Deno.readFile(
          await (`${config.DATA_DIR}/cookie-pages.json`),
        ),
      ),
    );
    return cookiePages;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      const cookiePages: CookiePages = ["unknown", "/"];
      return cookiePages;
    }
    throw error;
  }
}

async function saveCookiePages(
  cookiePages: CookiePages,
): Promise<void> {
  await Deno.mkdir(config.DATA_DIR, { recursive: true });
  await Deno.writeTextFile(
    `${config.DATA_DIR}/cookie-pages.json`,
    JSON.stringify(cookiePages),
  );
}

const siteVisitTotals = await loadSiteVisitTotals();
const cookiePages = await loadCookiePages();

setInterval(async function () {
  try {
    await saveSiteVisitTotals(siteVisitTotals);
  } catch (error) {
    console.error(`Could not write site visit totals: ${error}`);
  }
}, config.DEV_MODE ? 5 * 1000 : 60 * 1000);

/**
 * Given a URL, will return the path by stripping the domain.  If parsing fails,
 * will return "/"
 * @param url The URL to parse
 * @returns The path
 */
function getPath(url: string): string {
  try {
    // If url is relative, just return it.
    if (url.startsWith("/")) {
      return url;
    }

    const parsedUrl = new URL(url.includes("://") ? url : "http://" + url);
    return parsedUrl.pathname;
  } catch {
    return "/";
  }
}

/**
 * Returns the "page" from the provided referer by stripping out site.
 * If a referer is present, it will always return a value with a leading slash.
 * If no referer is present, will return "unknown"
 *
 * @param {string} [referer] Referer from request headers.
 * @param {string} [site] Configured site domain.
 * @returns {string} The parsed page.  "unknown" if no referer is present.
 */
function getPage(referer?: string, site?: string): string {
  if (!referer) {
    return "unknown";
  }
  if (!site || !site.length) {
    return getPath(referer);
  }
  const i = referer.indexOf(site);
  if (i === -1) {
    return referer.startsWith("/") ? referer : "/" + referer;
  }
  const page = referer.substring(i + site.length);

  return page.startsWith("/") ? page : `/${page}`;
}

/**
 * Hashes a given page so that it can be stored as a visited page in a cookie.
 * This depends on loadCookiePage() having been called already.
 * @param page The page to hash.
 * @returns {string} The hashed value to store in a cookie to represent a given
 * page.
 */
function getCookiePage(page: string): string {
  if (!cookiePages.includes(page)) {
    cookiePages.push(page);
    saveCookiePages(cookiePages);
  }
  return encodeBase62(cookiePages.indexOf(page));
}

export function getSiteVisit(c: Context): SiteVisitData {
  // TODO - Add cookie check for repeat visitors.
  // Temporarilly use IP to prevent duplicate requests from incrementing

  const page = getPage(c.req.header("referer"), config.SITE_DOMAIN);
  const userAgent = guessUserAgent(c.req.header("user-agent") ?? "");
  const browserType = userAgent.browser.type?.toLowerCase() ?? "unknown";
  const browser = userAgent.browser.name?.toLowerCase() ?? "unknown";
  const deviceType = userAgent.device.type?.toLowerCase() ?? "unknown";
  const osDevice = (userAgent.os.typeGuess?.toLowerCase() ?? "unknown") + "." +
    (userAgent.os.name?.toLowerCase() ?? "unknown");

  let pageCountCookie = getCookie(c, "pageCount");
  const cookiePage = getCookiePage(page);

  const recordSiteVisit = (!config.REQUIRE_REFERER ||
    (c.req.header("referer")?.length ?? 0) > 0) &&
    pageCountCookie === undefined;
  const recordPageVisit = (!config.REQUIRE_REFERER ||
    (c.req.header("referer")?.length ?? 0) > 0) &&
    (pageCountCookie === undefined ||
      !pageCountCookie.includes(`-${cookiePage}-`));

  if (recordPageVisit) {
    if (pageCountCookie === undefined) {
      pageCountCookie = "-";
    }
    pageCountCookie += `${cookiePage}-`;
    setCookie(c, "pageCount", pageCountCookie, {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      sameSite: "Lax",
    });
  }

  // This may seem long-winded... but it's easier to read than putting a bunch
  // of nested ternarnies into the object.  The ternaries feel easier to
  // maintain than a long set of if/else statement.
  // A generic helper method would be a neat idea to refactor with.

  const siteVisit = recordSiteVisit
    ? ++siteVisitTotals.siteVisits
    : siteVisitTotals.siteVisits;
  const pageVisit = recordPageVisit
    // If recording page visit, either increment page or set to 1 in memory
    ? (siteVisitTotals.pageVisits[page]
      ? ++siteVisitTotals.pageVisits[page]
      : (siteVisitTotals.pageVisits[page] = 1))
    // Otherwise, read page from memory or return 0 (not setting in memory)
    : (siteVisitTotals.pageVisits[page] ? siteVisitTotals.pageVisits[page] : 0);
  const browserTypeVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (siteVisitTotals.userAgentVisits.browserType[browserType]
      ? ++siteVisitTotals.userAgentVisits.browserType[browserType]
      : (siteVisitTotals.userAgentVisits.browserType[browserType] = 1))
    // Otherwise, read from memory or return 0
    : (siteVisitTotals.userAgentVisits.browserType[browserType]
      ? siteVisitTotals.userAgentVisits.browserType[browserType]
      : 0);
  const browserVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (siteVisitTotals.userAgentVisits.browser[browser]
      ? ++siteVisitTotals.userAgentVisits.browser[browser]
      : (siteVisitTotals.userAgentVisits.browser[browser] = 1))
    // Otherwise, read from memory or return 0
    : (siteVisitTotals.userAgentVisits.browser[browser]
      ? siteVisitTotals.userAgentVisits.browser[browser]
      : 0);
  const deviceTypeVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (siteVisitTotals.userAgentVisits.deviceType[deviceType]
      ? ++siteVisitTotals.userAgentVisits.deviceType[deviceType]
      : (siteVisitTotals.userAgentVisits.deviceType[deviceType] = 1))
    // Otherwise, read from memory or return 0
    : (siteVisitTotals.userAgentVisits.deviceType[deviceType]
      ? siteVisitTotals.userAgentVisits.deviceType[deviceType]
      : 0);
  const osDeviceVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (siteVisitTotals.userAgentVisits.osDevice[osDevice]
      ? ++siteVisitTotals.userAgentVisits.osDevice[osDevice]
      : (siteVisitTotals.userAgentVisits.osDevice[osDevice] = 1))
    // Otherwise, read from memory or return 0
    : (siteVisitTotals.userAgentVisits.osDevice[osDevice]
      ? siteVisitTotals.userAgentVisits.osDevice[osDevice]
      : 0);

  const siteVisitData: SiteVisitData = {
    siteVisit,
    page,
    pageVisit,
    userAgent: {
      browserType,
      browserTypeVisit,
      browser,
      browserVisit,
      deviceType,
      deviceTypeVisit,
      osDevice,
      osDeviceVisit,
    },
  };

  return siteVisitData;
}

export function getSiteVisitTotals(): SiteVisitTotals {
  return siteVisitTotals;
}
