import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hermeticEnv, writeGitConfig } from '../upgrade-tests.mjs';

test('upgrade harness serves only the mirrored ref API', () => {
const work = mkdtempSync(join(tmpdir(), 'upgrade-ref-api-test-'));
try {
  const sha = 'a'.repeat(40);
  const cfg = writeGitConfig(work, join(work, 'mirror.git'));
  const probe = `import { execFile } from 'node:child_process';
const request = (url) => new Promise((resolve) => execFile('curl', [url],
  { encoding: 'utf-8' }, (error, stdout) => resolve({ error: Boolean(error), stdout })));
console.log(JSON.stringify(await Promise.all([
  request('https://api.github.com/repos/career-ops-hq/career-ops/git/ref/heads/main'),
  request('https://example.invalid/'),
])));`;
  const [ref, blocked] = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
    encoding: 'utf-8', env: hermeticEnv(cfg, sha),
  }));
  assert.equal(ref.error, false);
  assert.equal(JSON.parse(ref.stdout).object.sha, sha);
  assert.equal(blocked.error, true);
  assert.equal(blocked.stdout, '');
} finally {
  rmSync(work, { recursive: true, force: true });
}
});
