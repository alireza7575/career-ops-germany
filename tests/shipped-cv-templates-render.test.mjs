import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTemplates, DEFAULT_TEMPLATES_DIR } from '../cv-templates.mjs';

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
}));

const templates = listTemplates('cv', { dir: DEFAULT_TEMPLATES_DIR });

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

test('timeline renders language levels in HTML and Markdown', () => {
  const timeline = templates.find((template) => template.name === 'timeline');
  assert.ok(timeline);
  const payload = JSON.parse(readFileSync(input, 'utf8'));
  payload.languages = [
    { category: 'English', items: 'C1' },
    { category: 'German', items: 'B2' },
    { category: 'French', items: 'A2' },
  ];
  const languageInput = join(dir, 'language-payload.json');
  const htmlOutput = join(dir, 'timeline-languages.html');
  const markdownOutput = join(dir, 'timeline-languages.md');
  writeFileSync(languageInput, JSON.stringify(payload));
  execFileSync(process.execPath, ['build-cv-html.mjs', languageInput, htmlOutput, timeline.path], { cwd: ROOT });
  execFileSync(process.execPath, ['build-cv-html.mjs', languageInput, '--markdown', markdownOutput, timeline.path], { cwd: ROOT });
  const html = readFileSync(htmlOutput, 'utf8');
  const markdown = readFileSync(markdownOutput, 'utf8');
  assert.match(html, /<div class="languages-grid"><div class="skills-grid">/);
  assert.equal((html.match(/class="skill-item"/g) || []).length, 4); // Three languages plus the Skills section.
  assert.match(html, /English:<\/span> C1/);
  assert.match(markdown, /## Languages\n\n- \*\*English:\*\* C1\n- \*\*German:\*\* B2\n- \*\*French:\*\* A2/);
});
