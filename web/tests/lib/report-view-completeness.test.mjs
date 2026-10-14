import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { splitSections, isVerdictHeading } from "../../src/lib/report-sections.mjs";

const view = readFileSync(fileURLToPath(new URL("../../src/components/report-view.tsx", import.meta.url)), "utf8");

test("the full assessment retains the intro and complete verdict section", () => {
  const intro = "Decision context before the first heading.";
  const evidence = "First paragraph.\n\nSecond paragraph with the supporting evidence.";
  const parsed = splitSections(`${intro}\n\n## Verdict (lead)\n\n${evidence}\n\n## A) Role Summary\n\nRole facts.`);
  assert.equal(parsed.intro.trim(), intro);
  assert.equal(parsed.sections.find((s) => isVerdictHeading(s.heading))?.content.trim(), evidence);

  // The decision brief may condense this material, but the expandable report
  // must still render every original non-machine section and its intro.
  assert.match(view, /mainSections\s*=\s*sections\.filter\(\(s\)\s*=>\s*!isMachine\(s\.heading\)\)/);
  assert.match(view, /<ReportMarkdown>\{intro\}<\/ReportMarkdown>/);
  assert.match(view, /mainSections\.map\(/);
});
