/**
 * sw-kit Evidence Chain (Innovation #4)
 * Builds structured proof chains for PDCA completion verification.
 * @module scripts/evidence/evidence-chain
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('evidence-chain');

/**
 * Add evidence to a feature's chain.
 * @param {string} feature - Feature name
 * @param {object} evidence - { type, result, source, details? }
 * @param {string} [projectDir]
 */
export function addEvidence(feature, evidence, projectDir) {
  const dir = projectDir || process.cwd();
  const chainPath = join(dir, '.sw-kit', 'state', `evidence-${feature}.json`);
  const chain = readStateOrDefault(chainPath, { feature, entries: [], verdict: null });

  chain.entries.push({
    ...evidence,
    seq: chain.entries.length + 1,
    ts: new Date().toISOString()
  });

  return writeState(chainPath, chain);
}

/**
 * Evaluate the evidence chain and produce a verdict.
 * @param {string} feature
 * @param {string} [projectDir]
 * @returns {{ verdict: 'PASS'|'FAIL'|'INCOMPLETE', summary: string, entries: Array }}
 */
export function evaluateChain(feature, projectDir) {
  const dir = projectDir || process.cwd();
  const chainPath = join(dir, '.sw-kit', 'state', `evidence-${feature}.json`);
  const chain = readStateOrDefault(chainPath, { feature, entries: [] });

  if (chain.entries.length === 0) {
    return { verdict: 'INCOMPLETE', summary: 'No evidence collected', entries: [] };
  }

  const hasFail = chain.entries.some(e => e.result === 'fail');
  const allPass = chain.entries.every(e => e.result === 'pass' || e.result === 'not_available');

  const verdict = hasFail ? 'FAIL' : allPass ? 'PASS' : 'INCOMPLETE';

  const summary = chain.entries.map(e =>
    `[${e.type}] ${e.result.toUpperCase()} (${e.source})`
  ).join('\n');

  // Persist verdict
  chain.verdict = verdict;
  chain.evaluatedAt = new Date().toISOString();
  writeState(chainPath, chain);

  return { verdict, summary, entries: chain.entries };
}

/**
 * Format evidence chain for display.
 * @param {string} feature
 * @param {string} [projectDir]
 * @returns {string} Formatted evidence chain
 */
export function formatChain(feature, projectDir) {
  const { verdict, entries } = evaluateChain(feature, projectDir);

  const lines = [`Evidence Chain: ${feature}`];
  for (const entry of entries) {
    const icon = entry.result === 'pass' ? '✓' : entry.result === 'fail' ? '✗' : '○';
    lines.push(`├── [${entry.type}] ${icon} ${entry.result.toUpperCase()} — ${entry.source}`);
  }
  lines.push(`└── Verdict: ${verdict} ${verdict === 'PASS' ? '✓' : verdict === 'FAIL' ? '✗' : '...'}`);

  return lines.join('\n');
}
