import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";
import * as yaml from "js-yaml";

// Same Node alias-loader convention as apply-cv-resolver.test.mjs. Import the
// real route handlers and safe writer, with only CAREER_OPS_ROOT redirected.
const webSrc = fileURLToPath(new URL("../../src/", import.meta.url));
process.env.CAREER_OPS_CODE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const loader = `
  import { existsSync } from "node:fs";
  import path from "node:path";
  import { pathToFileURL } from "node:url";
  export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = path.join(${JSON.stringify(webSrc)}, specifier.slice(2));
      for (const ext of [".ts", ".tsx", ".mjs", ".js", ""]) {
        if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  }
`;
register(`data:text/javascript,${encodeURIComponent(loader)}`, pathToFileURL(webSrc));

const { POST: updateProfile } = await import("../../src/app/api/profile/route.ts");
const { GET: getCadence, POST: updateCadence } = await import("../../src/app/api/followups/cadence/route.ts");

const routes = [
  { name: "profile", post: updateProfile, patch: { name: "Updated Fixture Candidate" } },
  { name: "followups/cadence", post: updateCadence, patch: { applied_first_days: 9 } },
];
const template = "candidate:\n  full_name: Template Candidate\n  location: Template City\ncompensation:\n  currency: USD\n";

async function withFixture(source, fn) {
  const root = mkdtempSync(path.join(tmpdir(), "career-ops-profile-shape-"));
  const config = path.join(root, "config");
  const file = path.join(config, "profile.yml");
  mkdirSync(config);
  writeFileSync(path.join(config, "profile.example.yml"), template);
  if (source !== undefined) writeFileSync(file, source);
  const previous = process.env.CAREER_OPS_ROOT;
  process.env.CAREER_OPS_ROOT = root;
  try {
    await fn({ config, file });
  } finally {
    if (previous === undefined) delete process.env.CAREER_OPS_ROOT;
    else process.env.CAREER_OPS_ROOT = previous;
    rmSync(root, { recursive: true, force: true });
  }
}

function request(route) {
  return new Request(`http://fixture.invalid/api/${route.name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(route.patch),
  });
}

for (const route of routes) {
  for (const [shape, source] of [
    ["list", "- candidate:\n    full_name: Fixture Candidate\n  compensation:\n    target_range: 100-120\n"],
    ["text scalar", "Fixture candidate notes that must survive\n"],
    ["number scalar", "42\n"],
    ["boolean scalar", "true\n"],
    ["timestamp scalar", "2026-09-12\n"],
    ["null", "null\n"],
    ["empty document", "# Existing profile to repair\n"],
    ["malformed YAML", "candidate: [broken\n"],
  ]) {
    test(`${route.name} rejects an existing ${shape} without writing or backing it up`, async () => {
      await withFixture(source, async ({ config, file }) => {
        const beforeFiles = readdirSync(config).sort();
        const response = await route.post(request(route));
        assert.equal(response.status, 409);
        assert.match((await response.json()).error, /refusing to overwrite/i);
        assert.equal(readFileSync(file, "utf8"), source);
        assert.deepEqual(readdirSync(config).sort(), beforeFiles, "no backup or temp files on rejection");
      });
    });
  }

  test(`${route.name} still merges a valid mapping and backs up the original bytes`, async () => {
    const source = "# Keep these original bytes in the backup\ncandidate:\n  full_name: Fixture Candidate\n  email: fixture@example.invalid\ncompensation:\n  target_range: 100-120\nfollowup_cadence:\n  applied_first_days: 7\n  applied_max_followups: 3\n";
    await withFixture(source, async ({ config, file }) => {
      const response = await route.post(request(route));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).ok, true);
      const expected = yaml.load(source);
      if (route.name === "profile") expected.candidate.full_name = route.patch.name;
      else expected.followup_cadence.applied_first_days = route.patch.applied_first_days;
      assert.deepEqual(yaml.load(readFileSync(file, "utf8")), expected);
      const backups = readdirSync(config).filter((name) => name.startsWith("profile.yml.bak-"));
      assert.equal(backups.length, 1);
      assert.equal(readFileSync(path.join(config, backups[0]), "utf8"), source);
    });
  });

  test(`${route.name} handles a missing profile without copying sample author facts`, async () => {
    await withFixture(undefined, async ({ config, file }) => {
      assert.equal(existsSync(file), false);
      const response = await route.post(request(route));
      if (route.name === "profile") {
        assert.equal(response.status, 200);
        assert.equal((await response.json()).ok, true);
        assert.deepEqual(yaml.load(readFileSync(file, "utf8")), {
          candidate: { full_name: route.patch.name },
          language: { output: "en", modes_dir: "modes/de" },
        });
        assert.deepEqual(readdirSync(config).sort(), ["profile.example.yml", "profile.yml"]);
      } else {
        assert.equal(response.status, 409);
        assert.equal(existsSync(file), false);
      }
    });
  });
}

test("cadence scope-only save preserves numeric settings and other profile fields", async () => {
  const source = "candidate:\n  full_name: Fixture Candidate\nfollowup_cadence:\n  applied_first_days: 11\n";
  await withFixture(source, async ({ file }) => {
    const response = await updateCadence(new Request("http://fixture.invalid/api/followups/cadence", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "interviews" }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(yaml.load(readFileSync(file, "utf8")), {
      candidate: { full_name: "Fixture Candidate" },
      followup_cadence: { applied_first_days: 11, scope: "interviews" },
    });
    const current = await getCadence();
    assert.equal((await current.json()).effective.scope, "interviews");
  });
});

test("cadence rejects invalid scope and fractional numbers without writing", async () => {
  const source = "candidate:\n  full_name: Fixture Candidate\n";
  await withFixture(source, async ({ config, file }) => {
    const before = readdirSync(config).sort();
    for (const patch of [{ scope: "everyone" }, { applied_first_days: 3.5 }]) {
      const response = await updateCadence(new Request("http://fixture.invalid/api/followups/cadence", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      }));
      assert.equal(response.status, 400);
      assert.equal(readFileSync(file, "utf8"), source);
      assert.deepEqual(readdirSync(config).sort(), before);
    }
  });
});

test("cadence GET returns canonical all scope when profile has no override", async () => {
  await withFixture("candidate:\n  full_name: Fixture Candidate\n", async () => {
    const response = await getCadence();
    const payload = await response.json();
    assert.equal(payload.defaults.scope, "all");
    assert.equal(payload.effective.scope, "all");
  });
});
