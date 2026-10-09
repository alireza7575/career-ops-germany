import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import * as nodeModule from "node:module";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { ATS_SOURCES, DEFAULT_FILTERS, FREE_SOURCES, WEB_SEARCH_SOURCES, filtersToParams, paramsToFilters } from "../../src/lib/explore.ts";
import { buildWebBoardQuery, searchWebBoard, validBoardUrl } from "../../src/lib/core/web-boards.mjs";
import { buildTitleFilter } from "../../../title-keywords.mjs";
import { runDiscoveryGroups } from "../../src/lib/core/discovery-groups.mjs";
import "../helpers/web-ts-alias-loader.mjs";
nodeModule.registerHooks?.({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !extname(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});
const runDiscovery = nodeModule.registerHooks
  ? (await import("../../src/lib/core/scan.ts")).runDiscovery
  : null;

const filters = { ...DEFAULT_FILTERS, positive: ["Data Engineer"], negative: ["Senior"], allow: ["Berlin"], alwaysAllow: [], sinceDays: 7, limitPerAts: 50 };
const titlePasses = buildTitleFilter({ positive: filters.positive, negative: filters.negative });

test("German providers are free defaults; paid web-index sources are opt-in and survive URL round-trip", () => {
  assert.deepEqual(DEFAULT_FILTERS.ats, FREE_SOURCES);
  assert.ok(FREE_SOURCES.includes("arbeitsagentur"));
  assert.ok(FREE_SOURCES.includes("arbeitnow"));
  assert.ok(ATS_SOURCES.includes("indeed"));
  assert.ok(ATS_SOURCES.includes("linkedin"));
  assert.ok(WEB_SEARCH_SOURCES.every((source) => !DEFAULT_FILTERS.ats.includes(source)));
  const selected = { ...filters, ats: [...FREE_SOURCES, "indeed"] };
  assert.deepEqual(paramsToFilters(new URLSearchParams(filtersToParams(selected))).ats, selected.ats);
});

test("Serper query is scoped to German listings, title, place, and recency", () => {
  const q = buildWebBoardQuery("indeed", filters);
  assert.match(q, /site:de\.indeed\.com\/viewjob/);
  assert.match(q, /"Data Engineer"/);
  assert.match(q, /"Berlin"/);
  assert.match(q, /-"Senior"/);
  assert.match(q, /after:\d{4}-\d{2}-\d{2}/);
});

test("matcher prefixes are removed from API query terms, not from core result matching", () => {
  const q = buildWebBoardQuery("indeed", { ...filters, positive: ["word:intern", "stem:engineer"], negative: ["word:senior"] });
  assert.match(q, /"intern" OR "engineer"/);
  assert.match(q, /-"senior"/);
  assert.doesNotMatch(q, /word:|stem:/);
});

test("missing Serper key is incomplete and makes no network request", async () => {
  const result = await searchWebBoard("indeed", filters, "", titlePasses, () => { throw new Error("network used"); });
  assert.equal(result.missingKey, true);
  assert.equal(result.unreachable, 1);
  assert.deepEqual(result.offers, []);
});

test("Serper results accept only matching board URLs and remain unverified", async () => {
  let requests = 0;
  const fetchMock = async (_url, options) => {
    requests++;
    assert.equal(options.headers["X-API-KEY"], "test-key");
    return { ok: true, json: async () => ({ organic: [
      { title: "Data Engineer - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=123", snippet: "Example" },
      { title: "Data Engineer - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=123" },
      { title: "Senior Data Engineer - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=456" },
      { title: "Data Engineer - Fake | Indeed", link: "https://de.indeed.com.evil.test/viewjob" },
    ] }) };
  };
  const result = await searchWebBoard("indeed", filters, "test-key", titlePasses, fetchMock);
  assert.equal(requests, 1);
  assert.equal(result.searched, 1);
  assert.equal(result.offers.length, 1);
  assert.equal(result.offers[0].company, "Acme");
  assert.equal(result.offers[0].verification, "unconfirmed");
  assert.equal(validBoardUrl("linkedin", "https://linkedin.com/jobs/view/123"), "https://linkedin.com/jobs/view/123");
  assert.equal(validBoardUrl("linkedin", "http://linkedin.com/jobs/view/123"), null);
});

test("web discovery labels matches with core word and stem semantics without live search", { skip: !runDiscovery && "requires synchronous Node module hooks" }, async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.SERPER_API_KEY;
  const originalCodeRoot = process.env.CAREER_OPS_CODE_ROOT;
  const events = [];
  let requests = 0;
  try {
    process.env.SERPER_API_KEY = "test-key";
    process.env.CAREER_OPS_CODE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
    globalThis.fetch = async () => {
      requests++;
      return { ok: true, json: async () => ({ organic: [
        { title: "Intern - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=1" },
        { title: "Internship - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=2" },
        { title: "Engineering Lead - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=3" },
        { title: "AI Researcher - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=4" },
        { title: "Nail Technician - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=5" },
      ] }) };
    };
    const offers = await runDiscovery({ ...filters, positive: ["word:intern", "stem:engineer", "AI"], negative: [], ats: ["indeed"] }, (event) => events.push(event));
    assert.equal(requests, 1);
    assert.deepEqual(offers.map(({ matchedKeyword }) => matchedKeyword), ["word:intern", "stem:engineer", "AI"]);
    assert.deepEqual(events.filter((event) => event.kind === "offer").map(({ offer }) => offer.matchedKeyword), ["word:intern", "stem:engineer", "AI"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SERPER_API_KEY;
    else process.env.SERPER_API_KEY = originalKey;
    if (originalCodeRoot === undefined) delete process.env.CAREER_OPS_CODE_ROOT;
    else process.env.CAREER_OPS_CODE_ROOT = originalCodeRoot;
  }
});

test("Serper source failure is isolated in result metadata", async () => {
  const result = await searchWebBoard("linkedin", filters, "test-key", titlePasses, async () => ({ ok: false, status: 429 }));
  assert.equal(result.unreachable, 1);
  assert.equal(result.searched, 0);
  assert.match(result.error, /429/);
});

test("indexed titles use core word and short-token matching", async () => {
  const exact = { ...filters, positive: ["word:intern", "AI"], negative: [] };
  const fetchMock = async () => ({ ok: true, json: async () => ({ organic: [
    { title: "Intern - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=1" },
    { title: "Internship - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=2" },
    { title: "AI Engineer - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=3" },
    { title: "Nail Technician - Acme | Indeed", link: "https://de.indeed.com/viewjob?jk=4" },
  ] }) });
  const result = await searchWebBoard("indeed", exact, "test-key", buildTitleFilter({ positive: exact.positive, negative: [] }), fetchMock);
  assert.deepEqual(result.offers.map((offer) => offer.url), [
    "https://de.indeed.com/viewjob?jk=1",
    "https://de.indeed.com/viewjob?jk=3",
  ]);
});

test("all ATS directories failing still marks them incomplete and keeps German results", async () => {
  const events = [];
  const offer = { url: "https://www.arbeitnow.com/view/1", title: "Data Engineer", company: "Acme", ats: "arbeitnow" };
  const offers = await runDiscoveryGroups({
    directories: ["greenhouse", "lever"], german: ["arbeitnow"], web: [], onEvent: (event) => events.push(event),
    runDirectory: async (emit) => { emit({ kind: "error", message: "all datasets failed" }); return []; },
    runGerman: async (emit) => {
      emit({ kind: "offer", offer });
      return { offers: [offer], companiesScanned: 1, unreachable: 0, incomplete: [], datasetStatus: { arbeitnow: "ok" } };
    },
    runWeb: async () => { throw new Error("unexpected web search"); },
  });
  assert.deepEqual(offers, [offer]);
  assert.ok(events.some((event) => event.kind === "error" && /datasets failed/.test(event.message)));
  const summary = events.find((event) => event.kind === "summary");
  assert.deepEqual(summary.incomplete, ["greenhouse", "lever"]);
  assert.equal(summary.datasetStatus.arbeitnow, "ok");
  assert.equal(summary.matches, 1);
  assert.equal(summary.unreachable, 2);
  assert.equal(events.filter((event) => event.kind === "offer").length, 1);
});

test("missing search key marks only selected web-index source incomplete", async () => {
  const events = [];
  await runDiscoveryGroups({
    directories: [], german: [], web: ["indeed"], onEvent: (event) => events.push(event),
    runDirectory: async () => { throw new Error("unexpected directory run"); },
    runGerman: async () => { throw new Error("unexpected German run"); },
    runWeb: () => searchWebBoard("indeed", filters, "", titlePasses, () => { throw new Error("network used"); }),
  });
  const summary = events.find((event) => event.kind === "summary");
  assert.deepEqual(summary.incomplete, ["indeed"]);
  assert.equal(summary.unreachable, 1);
  assert.equal(summary.datasetStatus.indeed, "empty");
});
