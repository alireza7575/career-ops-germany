import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const runner = fileURLToPath(new URL("../../src/lib/core/german-board-runner.mjs", import.meta.url));

test("German runner calls an existing provider and streams filtered, dated offers", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "career-ops-german-runner-"));
  try {
    fs.mkdirSync(path.join(dir, "providers"));
    fs.writeFileSync(path.join(dir, "providers", "arbeitsagentur.mjs"), `export default { fetch: async (entry, ctx) => {
      if (entry.arbeitsagentur.keywords[0] !== "Data") throw new Error("keywords missing");
      if (!ctx.fetchJson) throw new Error("HTTP context missing");
      return [
        { title: "Data Engineer", url: "https://example.test/1", company: "Acme", location: "Berlin", postedAt: Date.now() },
        { title: "Data Engineer", url: "https://example.test/1", company: "Acme", location: "Berlin", postedAt: Date.now() },
        { title: "Data Engineer", url: "https://example.test/2", company: "Acme", location: "Munich", postedAt: Date.now() },
        { title: "Senior Data Engineer", url: "https://example.test/3", company: "Acme", location: "Berlin", postedAt: Date.now() },
      ];
    } };`);
    fs.writeFileSync(path.join(dir, "providers", "_http.mjs"), "export const makeHttpCtx = () => ({ fetchJson: async () => ({}) });\n");
    fs.writeFileSync(path.join(dir, "title-keywords.mjs"), "export const buildTitleFilter = (f) => (title) => f.positive.some((s) => title.includes(s.replace(/^word:/, ''))) && !f.negative.some((s) => title.includes(s));\n");
    fs.writeFileSync(path.join(dir, "scan.mjs"), "export const buildLocationFilter = (f) => (loc) => f.allow.includes(loc); export const buildPostedDateFilter = () => () => true;\n");
    const portals = path.join(dir, "portals.yml");
    fs.writeFileSync(portals, "title_filter:\n  positive: ['word:Data']\n  negative: [Senior]\nlocation_filter:\n  allow: [Berlin]\n");
    const result = spawnSync(process.execPath, [runner, dir, "arbeitsagentur", portals, "7", "50"], {
      encoding: "utf8", env: { ...process.env, CAREER_OPS_ROOT: dir }, timeout: 10_000,
    });
    assert.equal(result.status, 0, result.stderr);
    const events = result.stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.kind), ["offer", "summary"]);
    assert.equal(events[0].offer.url, "https://example.test/1");
    assert.match(events[0].offer.postedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(events[1].scanned, 1);
  } finally {
    const rel = path.relative(os.tmpdir(), dir);
    if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) fs.rmSync(dir, { recursive: true, force: true });
  }
});
