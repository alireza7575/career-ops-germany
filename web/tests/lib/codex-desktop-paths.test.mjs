import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { codexDesktopDirs } from "../../src/lib/codex-desktop-paths.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "career-ops-codex-desktop-"));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function bundle(root, name, files) {
  const dir = path.join(root, "OpenAI", "Codex", "bin", name);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) fs.writeFileSync(path.join(dir, file), "fixture");
  return dir;
}

const required = ["codex.exe", "codex-command-runner.exe", "codex-windows-sandbox-setup.exe"];

test("missing Desktop install returns no candidates", (t) => {
  assert.deepEqual(codexDesktopDirs(fixture(t)), []);
});

test("only complete bundles are offered, newest first", (t) => {
  const root = fixture(t);
  const old = bundle(root, "old", required);
  const newest = bundle(root, "new", required);
  bundle(root, "partial", ["codex.exe"]);
  fs.writeFileSync(path.join(root, "OpenAI", "Codex", "bin", "not-a-directory"), "fixture");
  fs.utimesSync(old, new Date(1000), new Date(1000));
  fs.utimesSync(newest, new Date(2000), new Date(2000));
  assert.deepEqual(codexDesktopDirs(root), [newest, old]);
});
