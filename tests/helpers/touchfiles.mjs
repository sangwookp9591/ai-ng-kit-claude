/**
 * Diff-based test selection.
 * Maps source files to test files that should run when those files change.
 */
import { execFileSync } from 'node:child_process';

export const FILE_TEST_MAP = {
  'scripts/routing/intent-router.mjs': ['tests/intent-router.test.mjs'],
  'scripts/routing/model-router.mjs': ['tests/model-router.test.mjs'],
  'scripts/routing/complexity-scorer.mjs': ['tests/model-router.test.mjs', 'tests/pdca-autoscale.test.mjs'],
  'scripts/core/state.mjs': ['tests/session-state.test.mjs'],
  'scripts/core/context-budget.mjs': ['tests/context-budget.test.mjs'],
  'scripts/evidence/evidence-chain.mjs': ['tests/goal-checker.test.mjs'],
  'scripts/evidence/cost-reporter.mjs': ['tests/cost-reporter.test.mjs'],
  'scripts/review/review-checklist.mjs': ['tests/review-checklist.test.mjs', 'tests/review-modules.test.mjs'],
  'scripts/review/outside-voice.mjs': ['tests/review-modules.test.mjs', 'tests/multi-ai-consensus.test.mjs'],
  'scripts/review/browser-evidence.mjs': ['tests/browse-qa-orchestrator.test.mjs', 'tests/browser-modules.test.mjs'],
  'scripts/multi-ai/': ['tests/multi-ai-consensus.test.mjs'],
  'scripts/pdca/': ['tests/session-state.test.mjs', 'tests/pdca-autoscale.test.mjs'],
  'scripts/memory/': ['tests/confidence-decay.test.mjs'],
  'scripts/security/': ['tests/security.test.mjs'],
  'scripts/cli/aing-learn.mjs': ['tests/cli-learn-bench.test.mjs'],
  'scripts/cli/aing-bench.mjs': ['tests/cli-learn-bench.test.mjs'],
  'scripts/guardrail/': ['tests/safety-e2e.test.mjs'],
  'skills/': ['tests/skill-validation.test.mjs'],
};

export function getChangedFiles(baseBranch = 'main') {
  try {
    const output = execFileSync('git', ['diff', '--name-only', `${baseBranch}...HEAD`], { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function selectTests(changedFiles) {
  const tests = new Set();
  for (const file of changedFiles) {
    for (const [pattern, testFiles] of Object.entries(FILE_TEST_MAP)) {
      if (file.startsWith(pattern) || file === pattern) {
        testFiles.forEach(t => tests.add(t));
      }
    }
  }
  return [...tests];
}

export function previewTestSelection(baseBranch = 'main') {
  const changed = getChangedFiles(baseBranch);
  const selected = selectTests(changed);
  return { changedFiles: changed.length, selectedTests: selected.length, tests: selected };
}
