/**
 * aing Evidence Report Generator
 * Creates completion reports from evidence chains.
 * @module scripts/evidence/evidence-report
 */

import { evaluateChain } from './evidence-chain.js';
import { readState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const log = createLogger('evidence-report');

export interface ReportOptions {
  lessons?: string[];
}

export interface ReportResult {
  ok: boolean;
  path?: string;
}

interface PdcaFeatureState {
  iteration?: number;
}

interface PdcaState {
  features?: Record<string, PdcaFeatureState>;
}

/**
 * Generate a completion report for a feature.
 */
export function generateReport(feature: string, options: ReportOptions = {}, projectDir?: string): ReportResult {
  const dir = projectDir || process.cwd();
  const { verdict, summary, entries } = evaluateChain(feature, dir);

  // Load PDCA state for iteration count
  const pdcaState = readState(join(dir, '.aing', 'state', 'pdca-status.json')) as { ok: boolean; data?: PdcaState };
  const featureState = pdcaState.ok && pdcaState.data ? pdcaState.data.features?.[feature] : null;
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

  const reportPath = join(dir, '.aing', 'reports', `${date}-${feature}.md`);

  try {
    mkdirSync(join(dir, '.aing', 'reports'), { recursive: true });
    writeFileSync(reportPath, report, 'utf-8');
    log.info(`Report generated: ${reportPath}`);
    return { ok: true, path: reportPath };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('Failed to write report', { error: message });
    return { ok: false };
  }
}
