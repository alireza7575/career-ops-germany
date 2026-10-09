import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTemplates } from '../cv-templates.mjs';
import { chromium } from 'playwright';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), 'cv-shipped-templates-'));
const input = join(dir, 'payload.json');

writeFileSync(input, JSON.stringify({
  lang: 'en',
  page_format: 'a4',
  candidate: {
    name: 'Jane Smith',
    phone: '+1 555 0100',
    email: 'jane@example.com',
    linkedin: {
      url: 'https://linkedin.com/in/janesmith',
      display: 'linkedin.com/in/janesmith',
    },
    portfolio: {
      url: 'https://janesmith.dev',
      display: 'janesmith.dev',
    },
    location: 'Berlin, Germany',
  },
  summary: 'Platform engineer who ships verification tooling.',
  competencies: ['Platform engineering', 'Distributed systems'],
  experience: [{
    company: 'Example GmbH',
    role: 'Staff Engineer',
    location: 'Berlin',
    dates: '2023 - Present',
    bullets: ['Cut deploy time from 40 minutes to 4.'],
  }],
  projects: [{ name: 'Open Source Thing', description: 'A tool people use.' }],
  education: [{ title: 'BSc Computer Science', org: 'Example University', year: '2018' }],
  certifications: [],
  awards: [],
  skills: [{ category: 'Languages', items: ['Go', 'TypeScript'] }],
  languages: [
    { category: 'English', items: 'C1' },
    { category: 'German', items: 'B2' },
    { category: 'French', items: 'A2' },
  ],
}));

const templates = listTemplates('cv');

test('the shipped template list includes a pack', () => {
  assert.ok(templates.some((template) => template.pack));
});

for (const template of templates) {
  test(`${template.name}: renders the full contact row`, () => {
    const output = join(dir, `${template.name}.html`);
    execFileSync(process.execPath, ['build-cv-html.mjs', input, output, template.path], {
      cwd: ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    const html = readFileSync(output, 'utf-8');
    assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
    assert.match(html, /mailto:jane@example\.com/);
    assert.match(html, /linkedin\.com\/in\/janesmith/);
    assert.match(html, /janesmith\.dev/);
    assert.match(html, /Berlin, Germany/);
  });
}

test('timeline language entries occupy three columns', async () => {
  const output = join(dir, 'timeline.html');
  execFileSync(process.execPath, ['build-cv-html.mjs', input, output, join(ROOT, 'templates', 'cv-template.timeline.html')], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(readFileSync(output, 'utf-8'));
    const layout = await page.locator('.languages-grid > .skills-grid').evaluate((grid) => ({
      display: getComputedStyle(grid).display,
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      lefts: [...grid.querySelectorAll('.skill-item')].map(item => Math.round(item.getBoundingClientRect().left)),
    }));
    assert.equal(layout.display, 'grid');
    assert.equal(layout.columns, 3);
    assert.equal(new Set(layout.lefts).size, 3);
  } finally {
    await browser.close();
  }
});
