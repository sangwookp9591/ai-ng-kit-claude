/**
 * aing PR Creator — Automated Pull Request Generation
 * Absorbed from gstack's /ship Step 7.
 * Generates PR title and body from commit history and review data.
 * @module scripts/ship/pr-creator
 */
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.mjs';

const log = createLogger('pr-creator');

/**
 * Generate PR title from feature name and version.
 * @param {string} feature
 * @param {string} version
 * @param {string} bumpType
 * @returns {string} PR title (under 70 chars)
 */
export function generateTitle(feature, version, bumpType) {
  const prefix = bumpType === 'major' ? 'feat' : bumpType === 'minor' ? 'feat' : 'fix';
  const title = `${prefix}: ${feature} (v${version})`;
  return title.length > 70 ? title.slice(0, 67) + '...' : title;
}

/**
 * Generate PR body from changelog and review data.
 * @param {object} context
 * @param {string} context.changelog - Changelog section content
 * @param {object} context.reviewDashboard - Review dashboard data
 * @param {object} context.evidence - Evidence chain summary
 * @param {string} context.feature
 * @returns {string} PR body in markdown
 */
export function generateBody(context) {
  const lines = [
    '## Summary',
    '',
  ];

  // Changelog section
  if (context.changelog) {
    lines.push(context.changelog, '');
  }

  // Review status
  if (context.reviewDashboard) {
    lines.push('## Review Status', '');
    const dash = context.reviewDashboard;
    lines.push(`Verdict: **${dash.verdict}** — ${dash.verdictReason}`, '');
    for (const row of (dash.rows || [])) {
      const status = row.status || '—';
      lines.push(`- ${row.label}: ${status} (${row.runs} runs)`);
    }
    lines.push('');
  }

  // Evidence
  if (context.evidence) {
    lines.push('## Evidence', '');
    lines.push(context.evidence, '');
  }

  // Test plan
  lines.push('## Test Plan', '');
  lines.push('- [ ] All existing tests pass');
  lines.push('- [ ] New functionality tested');
  lines.push('- [ ] Review dashboard CLEARED');
  lines.push('');

  return lines.join('\n');
}

/**
 * Build the gh pr create command (does not execute).
 * @param {string} title
 * @param {string} body
 * @param {string} [baseBranch]
 * @returns {string} Shell command
 */
export function buildPRCommand(title, body, baseBranch) {
  const base = baseBranch ? `--base ${baseBranch}` : '';
  // Use heredoc pattern for body to preserve formatting
  return `gh pr create --title "${title.replace(/"/g, '\\"')}" ${base} --body "$(cat <<'EOF'\n${body}\nEOF\n)"`;
}

/**
 * Check if gh CLI is available.
 * @returns {boolean}
 */
export function isGhAvailable() {
  try {
    execSync('which gh', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}
