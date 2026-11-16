import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

const workflow = load(readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'));

test('ordinary pushes cannot recreate release PRs or notes branches', () => {
  assert.deepEqual(Object.keys(workflow.on).sort(), ['release', 'workflow_dispatch']);
  const action = workflow.on.workflow_dispatch.inputs.action;
  assert.equal(action.default, 'prepare-release');
  assert.deepEqual(action.options, ['prepare-release', 'publish-npm']);
  assert.equal(workflow.jobs['release-please'].if,
    "${{ github.event_name == 'workflow_dispatch' && inputs.action == 'prepare-release' && github.ref == 'refs/heads/main' }}");
});

test('manual release preparation cannot publish npm; manual publish requires a release tag', () => {
  assert.equal(workflow.jobs['publish-npm'].if,
    "${{ (github.event_name == 'release' && startsWith(github.event.release.tag_name, 'career-ops-v')) || (github.event_name == 'workflow_dispatch' && inputs.action == 'publish-npm' && startsWith(github.ref, 'refs/tags/career-ops-v')) }}");
  assert.deepEqual(workflow.on.release.types, ['published']);
  const guard = workflow.jobs['publish-npm'].steps.find(step => step.env?.TAG);
  assert.equal(guard.if, undefined, 'tag/version validation must also run for manual publishing');
  assert.equal(guard.env.TAG, '${{ github.event.release.tag_name || github.ref_name }}');
});
