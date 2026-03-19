/**
 * sw-kit Evidence Report Generator
 * Creates completion reports from evidence chains.
 * @module scripts/evidence/evidence-report
 */

import { evaluateChain } from './evidence-chain.mjs';
import { readState } from '../core/state.mjs';
import { writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const log = createLogger('evidence-report');

/**
 * Generate a completion report for a feature.
 * @param {string} feature
 * @param {object} [options]
 * @param {string[]} [options.lessons] - Lessons learned
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, path?: string }}
 */
export function generateReport(feature, options = {}, projectDir) {
  const dir = projectDir || process.cwd();
  const { verdict, summary, entries } = evaluateChain(feature, dir);

  // Load PDCA state for iteration count
  const pdcaState = readState(join(dir, '.sw-kit', 'state', 'pdca-status.json'));
  const featureState = pdcaState.ok ? pdcaState.data.features?.[feature] : null;
  const iterations = featureState?.iteration || 0;

  const date = new Date().toISOString().slice(0, 10);
  const report = `# Completion Report: ${feature}

**Date**: ${date}
**PDCA Iterations**: ${iterations}
**Verdict**: ${verdict} ${verdict === 'PASS' ? '✓' : '✗'}

## Evidence Chain
\`\`\`
${summary || 'No evidence collected'}
\`\`\`

## Details
${entries.map(e => `- **${e.type}** (${e.source}): ${e.result}${e.details ? ' — ' + JSON.stringify(e.details) : ''}`).join('\n')}

## Lessons Learned
${(options.lessons || ['No lessons recorded']).map(l => `- ${l}`).join('\n')}
`;

  const reportPath = join(dir, '.sw-kit', 'reports', `${date}-${feature}.md`);
  const result = writeState(reportPath, report);

  if (result.ok) {
    log.info(`Report generated: ${reportPath}`);
    return { ok: true, path: reportPath };
  }

  // writeState expects JSON — use raw file write for markdown
  try {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(join(dir, '.sw-kit', 'reports'), { recursive: true });
    writeFileSync(reportPath, report, 'utf-8');
    return { ok: true, path: reportPath };
  } catch (err) {
    log.error('Failed to write report', { error: err.message });
    return { ok: false };
  }
}
