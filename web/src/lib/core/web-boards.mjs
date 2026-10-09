// Optional search-index discovery. The caller supplies the server-side key;
// this module never opens a data-root .env or exposes credentials to the client.
import { searchPhrase } from "./search-keywords.mjs";
const SITES = {
  indeed: "site:de.indeed.com/viewjob",
  linkedin: "(site:de.linkedin.com/jobs/view OR site:linkedin.com/jobs/view)",
};

function quotedOr(items, fallback) {
  const clean = items.map(searchPhrase).filter(Boolean).slice(0, 12);
  return `(${(clean.length ? clean : [fallback]).map((item) => JSON.stringify(item)).join(" OR ")})`;
}

export function buildWebBoardQuery(source, filters) {
  const roles = quotedOr(filters.positive, "Jobs");
  const locations = quotedOr([...filters.allow, ...filters.alwaysAllow], "Germany");
  const negatives = filters.negative.slice(0, 8).map(searchPhrase).filter(Boolean).map((term) => `-${JSON.stringify(term)}`).join(" ");
  const cutoff = new Date(Date.now() - Math.max(1, filters.sinceDays) * 86_400_000).toISOString().slice(0, 10);
  return `${SITES[source]} ${roles} ${locations} ${negatives} after:${cutoff}`.replace(/\s+/g, " ").trim();
}

export function validBoardUrl(source, raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (source === "indeed") {
      if (!(host === "indeed.com" || host.endsWith(".indeed.com")) || !/\/viewjob/i.test(url.pathname)) return null;
    } else if (!(host === "linkedin.com" || host.endsWith(".linkedin.com")) || !/\/jobs\/view/i.test(url.pathname)) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function parseBoardTitle(source, raw) {
  const value = raw.replace(/\s+/g, " ").trim();
  const hiring = value.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+?)?\s*[|–—-]\s*LinkedIn\s*$/i);
  if (source === "linkedin" && hiring) return { company: hiring[1].trim(), title: hiring[2].trim() };
  const withoutBrand = value.replace(/\s*[|–—-]\s*(?:LinkedIn|Indeed)(?:\s+Deutschland)?\s*$/i, "").trim();
  for (const separator of [" | ", " – ", " — ", " - "]) {
    const parts = withoutBrand.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return { title: parts.slice(0, -1).join(separator), company: parts.at(-1) };
  }
  return { title: withoutBrand, company: source === "indeed" ? "Indeed listing" : "LinkedIn listing" };
}

export async function searchWebBoard(source, filters, key, titlePasses, fetchImpl = fetch) {
  if (!key) return { offers: [], searched: 0, unreachable: 1, missingKey: true, datasetStatus: { [source]: "empty" }, error: "SERPER_API_KEY is not configured" };
  try {
    const response = await fetchImpl("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: buildWebBoardQuery(source, filters), gl: "de", hl: "de", num: Math.min(100, Math.max(10, filters.limitPerAts)) }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Serper returned HTTP ${response.status}`);
    const data = await response.json();
    const rows = Array.isArray(data.organic) ? data.organic : [];
    const seen = new Set();
    const offers = [];
    for (const row of rows) {
      const url = validBoardUrl(source, String(row.link || ""));
      if (!url || seen.has(url)) continue;
      const parsed = parseBoardTitle(source, String(row.title || ""));
      if (!parsed.title) continue;
      if (!titlePasses(parsed.title)) continue;
      seen.add(url);
      offers.push({ url, company: parsed.company, title: parsed.title, location: "", postedAt: "", ats: source,
        source: `${source}-serper`, note: row.snippet?.trim() || undefined, verification: "unconfirmed" });
    }
    return { offers, searched: 1, unreachable: 0, missingKey: false, datasetStatus: { [source]: "ok" } };
  } catch (error) {
    return { offers: [], searched: 0, unreachable: 1, missingKey: false, datasetStatus: { [source]: "empty" }, error: error instanceof Error ? error.message : "search failed" };
  }
}
