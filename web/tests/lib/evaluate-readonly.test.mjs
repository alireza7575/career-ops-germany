import test from "node:test";
import assert from "node:assert/strict";
import { capabilitiesFor } from "../../src/lib/worker-capabilities.mjs";
import { claudeCliArgs, argValue, toolNames, WRITE_CAPABLE_TOOLS } from "../../src/lib/claude-invocation.mjs";
import { fenceArgs, fencingReport } from "../../src/lib/cli-fencing.mjs";
import { createReportEnvelopeFilter } from "../../src/lib/report-envelope.mjs";
import { evaluateRunOutcome } from "../../src/lib/report-persist.mjs";

test("evaluate uses a read-only sandbox and denies every Claude write tool", () => {
  const capabilities = capabilitiesFor("evaluate");
  assert.equal(capabilities.writes, false);
  assert.equal(capabilities.network, "search");

  const claude = claudeCliArgs({ kind: "evaluate", prompt: "fixture" });
  const allowed = toolNames(argValue(claude, "--allowedTools"));
  const denied = toolNames(argValue(claude, "--disallowedTools"));
  for (const tool of WRITE_CAPABLE_TOOLS) {
    assert.ok(!allowed.includes(tool), `${tool} was allowed`);
    assert.ok(denied.includes(tool), `${tool} was not explicitly denied`);
  }
  assert.ok(allowed.includes("WebSearch"));
  assert.ok(!allowed.includes("WebFetch"));
  assert.ok(denied.includes("WebFetch"));
  assert.ok(claude.includes("--strict-mcp-config"));

  const codex = fenceArgs({ cliId: "codex", args: ["exec", "--json", "fixture"], capabilities }).args;
  assert.ok(codex.includes("sandbox_mode=read-only"));
  assert.ok(!codex.includes("sandbox_mode=workspace-write"));
  assert.equal(fencingReport({ cliId: "claude", cliName: "Claude Code", capabilities }).level, "full");
  assert.equal(fencingReport({ cliId: "codex", cliName: "Codex", capabilities }).level, "full");
  assert.equal(fencingReport({ cliId: "gemini", cliName: "Gemini", capabilities }).level, "none");
});

test("evaluate accepts one complete report envelope only after a clean exit", () => {
  const report = "# Evaluation: Acme — Engineer\n\n## Machine Summary\n```yaml\nscore: 4.0\n```";
  const filter = createReportEnvelopeFilter();
  const first = filter.push(`Working…\n<<report-md>>\n${report.slice(0, 20)}`);
  const second = filter.push(`${report.slice(20)}\n<</report-md>>\nVERDICT: 4/5 — strong fit\n`);
  assert.doesNotMatch(first + second, /Machine Summary/);
  const envelope = filter.result();
  assert.equal(envelope.ok, true);
  assert.equal(envelope.markdown, report);
  assert.equal(evaluateRunOutcome({ envelope, noOutputMessage: null, sawError: false, cleanExit: true, text: first + second }).ok, true);
  assert.equal(evaluateRunOutcome({ envelope, noOutputMessage: null, sawError: false, cleanExit: false, text: first + second }).ok, false);
  assert.equal(evaluateRunOutcome({ envelope: createReportEnvelopeFilter().result(), noOutputMessage: null, sawError: false, cleanExit: true, text: "" }).ok, false);
});
