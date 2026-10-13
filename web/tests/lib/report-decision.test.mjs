import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReport } from '../../src/lib/report-meta.mjs';
import { splitSections, verdictReason } from '../../src/lib/report-sections.mjs';
import { postingUrl, reportDecision } from '../../src/lib/report-decision.mjs';

const report = '# Acme\n\n**Score:** 3.9/5\n**URL:** https://example.com/jobs/123\n\n## Machine Summary\n\n```yaml\nfinal_decision: Consider\nnext_action: Confirm the client before applying.\n```\n\n## A) Role Summary\n\nRole text.';

test('Windows reports retain their job URL and collapsed sections', () => {
  const meta = parseReport(report.replaceAll('\n', '\r\n'));
  assert.equal(meta.fields.find(f => f.label === 'URL')?.value, 'https://example.com/jobs/123');
  assert.equal(splitSections(meta.body).sections.length, 2);
  assert.equal(splitSections(report.replaceAll('\n', '\r\n')).sections.length, 2);
});

test('a report without a prose lede never promotes raw machine data to the verdict', () => {
  assert.equal(verdictReason({ report, intro: '' }), '');
});

test('decision brief uses saved evidence for LF and Windows reports', () => {
  const full = report.replace('next_action:', 'top_strengths:\n  - Strong .NET experience.\nsoft_gaps:\n  - Salary unknown.\nhard_stops:\n  - Client sector unconfirmed.\nconfidence: Medium\nnext_action:');
  const brief = reportDecision(full);
  assert.equal(brief.decision, 'Consider');
  assert.equal(brief.nextAction, 'Confirm the client before applying.');
  assert.deepEqual(brief.strengths, ['Strong .NET experience.']);
  assert.deepEqual(brief.concerns, ['Client sector unconfirmed.', 'Salary unknown.']);
  assert.deepEqual(reportDecision(full.replaceAll('\n', '\r\n')), brief);
});

test('missing, malformed and incorrectly typed summaries do not invent assessments', () => {
  for (const content of ['', '## Machine Summary\n```yaml\nbroken: [\n```', '## Machine Summary\n```yaml\nfinal_decision: [Apply]\nnext_action: true\ntop_strengths: [false, 42]\n```']) {
    assert.deepEqual(reportDecision(content), { decision: '', nextAction: '', strengths: [], concerns: [], confidence: '' });
  }
});

test('posting links support Markdown and tracker fallback, and reject unsafe schemes', () => {
  assert.equal(postingUrl(' [Job](https://example.com/jobs/123) '), 'https://example.com/jobs/123');
  assert.equal(postingUrl('—', 'https://example.com/jobs/123'), 'https://example.com/jobs/123');
  assert.equal(postingUrl('javascript:alert(1)', '[Job](javascript:alert(1))'), undefined);
  assert.equal(postingUrl('https://'), undefined);
});
