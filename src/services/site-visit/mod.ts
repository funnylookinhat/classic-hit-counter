import { type Context } from "hono";
import { getConnInfo } from "hono/deno";
import { guess as guessUserAgent } from "@wundero/uap-ts";
import { getConfig } from "@/util/config.ts";
import TTLCache from "@isaacs/ttlcache";
import { join } from "@std/path/join";
import { getCounterImage } from "@/services/counter-image/mod.ts";

const config = getConfig();

export interface Visit {
  siteHit: number;
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

export interface VisitTotals {
  siteHits: number;
  siteVisits: number;
  pageVisits: Record<string, number>;
  userAgentVisits: {
    browserType: Record<string, number>;
    browser: Record<string, number>;
    deviceType: Record<string, number>;
    osDevice: Record<string, number>;
  };
}

export type PageIndexes = Record<string, number>;

let { DATA_DIR } = config;
if (DATA_DIR.length === 0) {
  DATA_DIR = await Deno.makeTempDir();
  console.warn(`Warning - no DATA_DIR provided.  Using a temporary directory.`);
  console.warn(`Storing site visit data in ${DATA_DIR}`);
}

/**
 * Load the visit totals from disk or init a new object.
 * @returns Visit totals
 */
async function loadVisitTotals(): Promise<VisitTotals> {
  try {
    const v: VisitTotals = JSON.parse(
      new TextDecoder().decode(
        await Deno.readFile(
          join(DATA_DIR, "site-visit-totals.json"),
        ),
      ),
    );
    return v;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      const v: VisitTotals = {
        siteHits: 0,
        siteVisits: 0,
        pageVisits: {},
        userAgentVisits: {
          browserType: {},
          browser: {},
          deviceType: {},
          osDevice: {},
        },
      };
      await saveVisitTotals(v);
      return v;
    }
    throw error;
  }
}

const visitTotals = await loadVisitTotals();

/**
 * Save the visit totals to file so that it can be referenced on restart.
 */
async function saveVisitTotals(v: VisitTotals): Promise<void> {
  try {
    await Deno.mkdir(DATA_DIR, { recursive: true });
    await Deno.writeTextFile(
      join(DATA_DIR, "site-visit-totals.json"),
      JSON.stringify(v),
    );
  } catch (error) {
    if (error instanceof Deno.errors.PermissionDenied) {
      console.error(
        `Cannot save file ${
          join(DATA_DIR, "site-visit-totals.json")
        }: PermissionDenied.  Check that the directory is writeable by the process.`,
      );
    }
    throw error;
  }
}

/**
 * Load the page index data from file, or init a new page index.
 * @returns Page index and next page index.
 */
async function loadPageIndexFromFile(): Promise<
  { pageIndexes: PageIndexes; nextPageIndex: number }
> {
  try {
    const pageIndexes: PageIndexes = JSON.parse(
      new TextDecoder().decode(
        await Deno.readFile(
          join(DATA_DIR, "page-indexes.json"),
        ),
      ),
    );
    const nextPageIndex = (Object.values(pageIndexes).sort().shift() ?? 0) + 1;
    return { pageIndexes, nextPageIndex };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      const p: PageIndexes = {
        "unknown": 0,
        "/": 1,
      };
      await savePageIndexes(p);
      return { pageIndexes: p, nextPageIndex: 2 };
    }
    throw error;
  }
}

/**
 * Save the page index data to a file so that it can be referenced on restart.
 */
async function savePageIndexes(p: PageIndexes): Promise<void> {
  try {
    await Deno.mkdir(DATA_DIR, { recursive: true });
    await Deno.writeTextFile(
      join(DATA_DIR, "page-indexes.json"),
      JSON.stringify(p),
    );
  } catch (error) {
    if (error instanceof Deno.errors.PermissionDenied) {
      console.error(
        `Cannot save file ${
          join(DATA_DIR, "page-indexes.json")
        }: PermissionDenied.  Check that the directory is writeable by the process.`,
      );
    }
    throw error;
  }
}

const pageIndexData = await loadPageIndexFromFile();
const pageIndexes = pageIndexData.pageIndexes;
let nextPageIndex = pageIndexData.nextPageIndex;

setInterval(async function () {
  try {
    await saveVisitTotals(visitTotals);
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
function getUrlPath(url: string): string {
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
 * Determine if a hit should be recorded.  This checks if REQUIRE_SITE_DOMAIN
 * and SITE_DOMAIN are configured, and if so will require that the referer
 * header include the site domain.
 * @param c Request context
 * @returns boolean
 */
function getShouldRecordHit(c: Context): boolean {
  const headerReferer = c.req.header("referer");

  const REQUIRE_SITE_DOMAIN = config.SITE_DOMAIN?.length > 0 &&
    config.REQUIRE_SITE_DOMAIN;

  if (REQUIRE_SITE_DOMAIN) {
    // Referer header MUST include site - or else we return unknown.
    if (
      headerReferer === undefined || !headerReferer.includes(config.SITE_DOMAIN)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Returns the "page" from the provided referer by stripping out site.
 * If a referer is present, it will always return a value with a leading slash.
 * If no referer is present, will return "unknown"
 *
 * @param c Request context
 * @returns The parsed page.  "unknown" if no referer is present, undefined if
 * no valid referer was present and was required.
 */
function getRequestPage(c: Context): string {
  const headerReferer = c.req.header("referer");
  // If we determine that a referer should be returned, and this one is defined,
  // we will return it instead.
  const queryReferer = c.req.query("page");

  const referer = queryReferer ?? headerReferer;

  if (!referer) {
    return "unknown";
  }

  return getUrlPath(referer);
}

/**
 * Hashes a given page so that it can be stored as a visited page in a cookie.
 * This depends on loadCookiePage() having been called already.
 * @param page The page to hash.
 * @returns {string} The hashed value to store in a cookie to represent a given
 * page.
 */
function getPageIndex(page: string): number {
  if (pageIndexes[page] === undefined) {
    pageIndexes[page] = nextPageIndex++;
    savePageIndexes(pageIndexes);
  }
  return pageIndexes[page];
}

/**
 * Get the IP making the request.
 * @param c Request context
 * @returns IP Address
 */
function getRequestIp(c: Context): string {
  const info = getConnInfo(c);
  let ip = info.remote.address;
  if (c.req.header(config.IP_HEADER)) {
    ip = c.req.header(config.IP_HEADER);
  }
  if (ip === undefined) {
    ip = "unknown";
  }
  return ip;
}

const pageVisitIpCache = new TTLCache<string, number[]>({
  max: config.MAX_IP_TRACKING,
  ttl: 1000 * 60 * 60 * 24,
});

export function handleRequest(c: Context): Visit {
  const ip = getRequestIp(c);

  const shouldRecordHit = getShouldRecordHit(c);
  const page = getRequestPage(c);
  const pageIndex = getPageIndex(page);

  const userAgent = guessUserAgent(c.req.header("user-agent") ?? "");
  const browserType = userAgent.browser.type?.toLowerCase() ?? "unknown";
  const browser = userAgent.browser.name?.toLowerCase() ?? "unknown";
  const deviceType = userAgent.device.type?.toLowerCase() ?? "unknown";
  const osDevice = (userAgent.os.typeGuess?.toLowerCase() ?? "unknown") + "." +
    (userAgent.os.name?.toLowerCase() ?? "unknown");

  let ipPageVisit = pageVisitIpCache.get(ip);

  if (config.DEV_MODE) {
    console.log(
      `
      SiteVisit.handleRequest: page=${page}
      shouldRecordHit=${shouldRecordHit}
      pageIndex=${pageIndex}
      browserType=${browserType}
      browser=${browser}
      deviceType=${deviceType}
      osDevice=${osDevice}
      ipPagevisit=${JSON.stringify(ipPageVisit)}
    `.replace(/\s+/g, " ").trimStart(),
    );
  }

  // We only want to record site and page visits if there is a referer - e.g.
  // the image was loaded from a page.  Otherwise, we'll only increment hit
  // counter.
  const recordSiteVisit = shouldRecordHit && page !== "unknown" &&
    ipPageVisit === undefined;
  const recordPageVisit = shouldRecordHit && page !== "unknown" &&
    (ipPageVisit === undefined || !ipPageVisit.includes(pageIndex));

  if (recordPageVisit) {
    if (ipPageVisit === undefined) {
      ipPageVisit = [];
    }
    ipPageVisit.push(pageIndex);

    pageVisitIpCache.set(ip, ipPageVisit);
  }

  // This may seem long-winded... but it's easier to read than putting a bunch
  // of nested ternarnies into the object.  The ternaries feel easier to
  // maintain than a long set of if/else statement.
  // A generic helper method would be a neat idea to refactor with.

  const siteHit = shouldRecordHit
    ? ++visitTotals.siteHits
    : visitTotals.siteHits;
  // Site visits will increment once per IP per 24 hours
  const siteVisit = recordSiteVisit
    ? ++visitTotals.siteVisits
    : visitTotals.siteVisits;
  // Page visits will increment once per IP per Page per 24 hours
  const pageVisit = recordPageVisit
    // If recording page visit, either increment page or set to 1 in memory
    ? (visitTotals.pageVisits[page]
      ? ++visitTotals.pageVisits[page]
      : (visitTotals.pageVisits[page] = 1))
    // Otherwise, read page from memory or return 0 (not setting in memory)
    : (visitTotals.pageVisits[page] ? visitTotals.pageVisits[page] : 0);

  // All user agent visits follow site visit logic.  Once per IP per 24 hours
  const browserTypeVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (visitTotals.userAgentVisits.browserType[browserType]
      ? ++visitTotals.userAgentVisits.browserType[browserType]
      : (visitTotals.userAgentVisits.browserType[browserType] = 1))
    // Otherwise, read from memory or return 0
    : (visitTotals.userAgentVisits.browserType[browserType]
      ? visitTotals.userAgentVisits.browserType[browserType]
      : 0);
  const browserVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (visitTotals.userAgentVisits.browser[browser]
      ? ++visitTotals.userAgentVisits.browser[browser]
      : (visitTotals.userAgentVisits.browser[browser] = 1))
    // Otherwise, read from memory or return 0
    : (visitTotals.userAgentVisits.browser[browser]
      ? visitTotals.userAgentVisits.browser[browser]
      : 0);
  const deviceTypeVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (visitTotals.userAgentVisits.deviceType[deviceType]
      ? ++visitTotals.userAgentVisits.deviceType[deviceType]
      : (visitTotals.userAgentVisits.deviceType[deviceType] = 1))
    // Otherwise, read from memory or return 0
    : (visitTotals.userAgentVisits.deviceType[deviceType]
      ? visitTotals.userAgentVisits.deviceType[deviceType]
      : 0);
  const osDeviceVisit = recordSiteVisit
    // If recording, increment or set to 1 in memory
    ? (visitTotals.userAgentVisits.osDevice[osDevice]
      ? ++visitTotals.userAgentVisits.osDevice[osDevice]
      : (visitTotals.userAgentVisits.osDevice[osDevice] = 1))
    // Otherwise, read from memory or return 0
    : (visitTotals.userAgentVisits.osDevice[osDevice]
      ? visitTotals.userAgentVisits.osDevice[osDevice]
      : 0);

  const visit: Visit = {
    siteHit,
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

  return visit;
}

export function getVisitTotals(): VisitTotals {
  return visitTotals;
}

interface CachedImage {
  n: number;
  image: Uint8Array;
}

let siteCountCachedImage: CachedImage;
let pageCountCachedImage: CachedImage;
let hitCountCachedImage: CachedImage;

const errorImage = await getCounterImage(0);

export async function getSiteCountImage(c: Context): Promise<Uint8Array> {
  try {
    const visit = handleRequest(c);

    if (
      siteCountCachedImage !== undefined &&
      visit.siteVisit === siteCountCachedImage.n
    ) {
      return siteCountCachedImage.image;
    }

    const imageData = await getCounterImage(visit.siteVisit);

    siteCountCachedImage = {
      n: visit.siteVisit,
      image: imageData,
    };

    return imageData;
  } catch (error) {
    console.error(`getSiteCountImage errored`, error);
  }

  return errorImage;
}

export async function getPageCountImage(c: Context): Promise<Uint8Array> {
  try {
    const visit = handleRequest(c);

    if (
      pageCountCachedImage !== undefined &&
      visit.pageVisit === pageCountCachedImage.n
    ) {
      return pageCountCachedImage.image;
    }

    const imageData = await getCounterImage(visit.pageVisit);

    pageCountCachedImage = {
      n: visit.pageVisit,
      image: imageData,
    };

    return imageData;
  } catch (error) {
    console.error(`getPageCountImage errored`, error);
  }

  return errorImage;
}

export async function getHitCountImage(c: Context): Promise<Uint8Array> {
  try {
    const visit = handleRequest(c);

    if (
      hitCountCachedImage !== undefined &&
      visit.siteHit === hitCountCachedImage.n
    ) {
      return hitCountCachedImage.image;
    }

    const imageData = await getCounterImage(visit.siteHit);

    hitCountCachedImage = {
      n: visit.pageVisit,
      image: imageData,
    };

    return imageData;
  } catch (error) {
    console.error(`getHitCountImage errored`, error);
  }

  return errorImage;
}
