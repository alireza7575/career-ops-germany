// Isolated child: use the core's provider and filtering implementations without
// bundling the code checkout's scanner into Next's server output.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as yaml from "js-yaml";
import { searchPhrase } from "./search-keywords.mjs";

const [codeRoot, source, portalsPath, sinceArg, limitArg] = process.argv.slice(2);
if (!codeRoot || !["arbeitsagentur", "arbeitnow"].includes(source) || !portalsPath) {
  process.stderr.write("Invalid German board request\n");
  process.exitCode = 1;
} else {
  try {
    const config = yaml.load(fs.readFileSync(portalsPath, "utf8")) || {};
    const sinceDays = Math.max(1, Number(sinceArg) || 7);
    const limit = Math.max(1, Number(limitArg) || 150);
    const core = (relative) => import(pathToFileURL(path.join(codeRoot, relative)).href);
    const [{ default: provider }, { makeHttpCtx }, { buildTitleFilter }, { buildLocationFilter, buildPostedDateFilter }] = await Promise.all([
      core(`providers/${source}.mjs`),
      core("providers/_http.mjs"),
      core("title-keywords.mjs"),
      core("scan.mjs"),
    ]);
    const positives = (config.title_filter?.positive || []).map(searchPhrase).filter(Boolean);
    if (source === "arbeitsagentur" && positives.length === 0) {
      throw new Error("Bundesagentur needs at least one role keyword.");
    }
    const entry = source === "arbeitsagentur"
      ? { name: "Bundesagentur", arbeitsagentur: { keywords: positives.slice(0, 12), days: sinceDays, size: Math.min(100, limit) } }
      : { name: "Arbeitnow", max_pages: Math.min(5, Math.ceil(limit / 100)) };
    const titlePasses = buildTitleFilter(config.title_filter);
    const locationPasses = buildLocationFilter(config.location_filter);
    const cutoff = new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10);
    const datePasses = buildPostedDateFilter(cutoff);
    const rows = await provider.fetch(entry, makeHttpCtx());
    const seen = new Set();
    let count = 0;
    for (const row of rows) {
      if (count >= limit) break;
      if (!row?.url || !row.title || seen.has(row.url)) continue;
      if (!titlePasses(row.title) || !locationPasses(row.location, row.url, row.title) || !datePasses(row.postedAt)) continue;
      seen.add(row.url);
      count++;
      process.stdout.write(JSON.stringify({ kind: "offer", offer: {
        url: row.url,
        company: row.company || entry.name,
        title: row.title,
        location: row.location || "",
        postedAt: Number.isFinite(row.postedAt) ? new Date(row.postedAt).toISOString().slice(0, 10) : "",
        source: `${source}-provider`,
      } }) + "\n");
    }
    process.stdout.write(JSON.stringify({ kind: "summary", scanned: 1, matches: count }) + "\n");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "German provider failed"}\n`);
    process.exitCode = 1;
  }
}
