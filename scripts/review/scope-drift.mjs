/**
 * aing Scope Drift Detector
 * Absorbed from gstack's review scope drift detection.
 * Compares actual diff against stated plan/goals.
 * @module scripts/review/scope-drift
 */
import { createLogger } from '../core/logger.mjs';

const log = createLogger('scope-drift');

/**
 * Analyze scope drift between plan and actual changes.
 * @param {object} plan - { goals: string[], scope: string[] }
 * @param {object} diff - { files: string[], summary: string }
 * @returns {{ driftScore: number, inScope: string[], outOfScope: string[], missed: string[] }}
 */
export function analyzeDrift(plan, diff) {
  if (!plan || !diff) {
    return { driftScore: 0, inScope: [], outOfScope: [], missed: [] };
  }

  const inScope = [];
  const outOfScope = [];
  const missed = [];

  // Files matching plan scope
  for (const file of (diff.files || [])) {
    const matchesScope = (plan.scope || []).some(s =>
      file.includes(s) || matchGlob(file, s)
    );
    if (matchesScope) {
      inScope.push(file);
    } else {
      outOfScope.push(file);
    }
  }

  // Goals not addressed
  for (const goal of (plan.goals || [])) {
    const addressed = (diff.files || []).some(f =>
      f.toLowerCase().includes(goal.toLowerCase().split(' ')[0])
    );
    if (!addressed) {
      missed.push(goal);
    }
  }

  const totalFiles = (diff.files || []).length;
  const driftScore = totalFiles > 0
    ? Math.round((outOfScope.length / totalFiles) * 100)
    : 0;

  if (driftScore > 30) {
    log.warn(`High scope drift: ${driftScore}% of files outside plan scope`);
  }

  return { driftScore, inScope, outOfScope, missed };
}

/**
 * Format drift analysis for display.
 * @param {object} analysis - Output of analyzeDrift()
 * @returns {string}
 */
export function formatDrift(analysis) {
  const lines = [`Scope Drift: ${analysis.driftScore}%`];

  if (analysis.outOfScope.length > 0) {
    lines.push(`\nOut of Scope (${analysis.outOfScope.length} files):`);
    for (const f of analysis.outOfScope.slice(0, 10)) {
      lines.push(`  - ${f}`);
    }
  }

  if (analysis.missed.length > 0) {
    lines.push(`\nMissed Goals (${analysis.missed.length}):`);
    for (const g of analysis.missed) {
      lines.push(`  - ${g}`);
    }
  }

  if (analysis.driftScore === 0 && analysis.missed.length === 0) {
    lines.push('No drift detected. All changes align with plan.');
  }

  return lines.join('\n');
}

function matchGlob(str, pattern) {
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
  return regex.test(str);
}
