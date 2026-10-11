import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import "../helpers/web-ts-alias-loader.mjs";
import { buildPrompt, isShellSafeRootPath } from "../../src/lib/run-prompts.mjs";
import { spawnGeneratePdf } from "../../src/lib/pdf-render.mjs";

const skipTs = !process.features?.typescript && "Node cannot import TypeScript routes";
process.env.CAREER_OPS_CODE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const lib = skipTs ? null : await import("@/lib/career-ops");
const pipeline = skipTs ? null : await import("@/lib/core/pipeline");
const portals = skipTs ? null : await import("../../src/app/api/portals/route.ts");
const states = skipTs ? null : await import("@/lib/core/states");

test("German market mode, portal seed, states and pipeline writer work with a data-only root", { skip: skipTs }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "career-ops-german-web-"));
  const oldRoot = process.env.CAREER_OPS_ROOT;
  process.env.CAREER_OPS_ROOT = root;
  try {
    assert.equal(lib.readLanguageConfig().modesDir, "modes/de");
    assert.equal(lib.readLanguageConfig().evalModeFile, "modes/de/angebot.md");
    assert.ok(states.readCanonicalStates().some((s) => s.label === "Hired"));

    const response = await portals.POST(new Request("http://fixture.invalid/api/portals", {
      method: "POST",
      body: JSON.stringify({ roles: ["Robotics Engineer"], location: ["Germany"] }),
    }));
    assert.equal(response.status, 200);
    const seeded = fs.readFileSync(path.join(root, "portals.yml"), "utf8");
    assert.match(seeded, /Robotics Engineer/);
    assert.match(seeded, /Germany/);
    assert.match(seeded, /Bundesagentur - Software Germany/, "seeded from the German portals template");

    const result = await pipeline.addOffersToPipeline([{
      url: "https://example.invalid/jobs/robotics-123",
      company: "Fixture Robotics",
      title: "Robotics Engineer",
      location: "Munich",
      source: "fixture",
    }]);
    assert.equal(result.error, undefined);
    assert.equal(result.added, 1);
    assert.match(fs.readFileSync(path.join(root, "data", "pipeline.md"), "utf8"), /robotics-123/);
    assert.match(fs.readFileSync(path.join(root, "data", "scan-history.tsv"), "utf8"), /robotics-123/);
  } finally {
    if (oldRoot === undefined) delete process.env.CAREER_OPS_ROOT;
    else process.env.CAREER_OPS_ROOT = oldRoot;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("explicit multi-market profile retains its chosen primary mode", { skip: skipTs }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "career-ops-multimarket-web-"));
  const oldRoot = process.env.CAREER_OPS_ROOT;
  process.env.CAREER_OPS_ROOT = root;
  try {
    fs.mkdirSync(path.join(root, "config"));
    fs.writeFileSync(path.join(root, "config", "profile.yml"), "language:\n  output: de\n  modes_dir:\n    - modes/fr\n    - modes/de\n");
    const lang = lib.readLanguageConfig();
    assert.equal(lang.output, "de");
    assert.deepEqual(lang.modesDirs, ["modes/fr", "modes/de"]);
    assert.equal(lang.modesDir, "modes/fr");
  } finally {
    if (oldRoot === undefined) delete process.env.CAREER_OPS_ROOT;
    else process.env.CAREER_OPS_ROOT = oldRoot;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("evaluation and PDF prompts resolve system and user files across roots", () => {
  const args = {
    input: "https://example.invalid/job/123", memory: "", today: "2026-10-11",
    codeRoot: "C:/Career Ops Engine", dataRoot: "C:/Private Career Data",
    lang: { output: "en", modesDir: "modes/de", modesDirs: ["modes/de"], evalModeFile: "modes/de/angebot.md" },
  };
  const evaluate = buildPrompt({ ...args, kind: "evaluate" });
  assert.match(evaluate, /C:\/Career Ops Engine\/modes\/de\/angebot\.md/);
  assert.match(evaluate, /C:\/Private Career Data\/modes\/_profile\.md/);
  assert.match(evaluate, /C:\/Private Career Data\/modes\/_custom\.md/);
  assert.match(evaluate, /node 'C:\/Career Ops Engine\/merge-tracker\.mjs'/);
  const pdf = buildPrompt({ ...args, kind: "pdf", input: "12" });
  assert.match(pdf, /C:\/Career Ops Engine\/modes\/pdf\.md/);
  assert.match(pdf, /C:\/Private Career Data\/cv\.md/);
  assert.match(pdf, /C:\/Career Ops Engine\/modes\/de\/_shared\.md/);
  assert.match(pdf, /Write all human-facing output in "en"/);
  assert.equal(isShellSafeRootPath("C:/Career Ops Engine"), true);
  assert.equal(isShellSafeRootPath("C:/Engine'; rm -rf /"), false);
  assert.equal(isShellSafeRootPath("C:/Engine/$(whoami)"), false);
});

test("PDF backend launches code-root renderer while targeting data-root output", async () => {
  const calls = [];
  const spawnFn = (exec, args, options) => {
    calls.push({ exec, args, options });
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0));
    return child;
  };
  const result = await spawnGeneratePdf({ spawnFn, execPath: "node", root: "C:/Private Data", codeRoot: "C:/Engine", html: "C:/Private Data/output/cv.html", finalPdf: "C:/Private Data/output/cv.pdf", format: "a4", reportNum: "12" });
  assert.equal(result.ok, true);
  assert.equal(calls[0].args[0], path.join("C:/Engine", "generate-pdf.mjs"));
  assert.equal(calls[0].options.env.CAREER_OPS_ROOT, "C:/Private Data");
});
