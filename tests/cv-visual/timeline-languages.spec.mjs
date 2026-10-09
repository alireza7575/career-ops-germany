import { test, expect } from 'playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures } from './fixtures.mjs';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

test('timeline language entries occupy three columns', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'cv-timeline-languages-'));
  try {
    const input = join(dir, 'payload.json');
    const output = join(dir, 'timeline.html');
    writeFileSync(input, JSON.stringify({
      ...fixtures[0].payload,
      languages: [
        { category: 'English', items: 'C1' },
        { category: 'German', items: 'B2' },
        { category: 'French', items: 'A2' },
      ],
    }));
    execFileSync(process.execPath, ['build-cv-html.mjs', input, output,
      join(ROOT, 'templates', 'cv-template.timeline.html')], {
      cwd: ROOT,
      env: { ...process.env, CAREER_OPS_ROOT: dir, CAREER_OPS_DATA_DIR: dir },
    });
    await page.setContent(readFileSync(output, 'utf8'));
    const layout = await page.locator('.languages-grid > .skills-grid').evaluate((grid) => ({
      display: getComputedStyle(grid).display,
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      lefts: [...grid.querySelectorAll('.skill-item')].map((item) =>
        Math.round(item.getBoundingClientRect().left)),
    }));
    expect(layout.display).toBe('grid');
    expect(layout.columns).toBe(3);
    expect(new Set(layout.lefts).size).toBe(3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
