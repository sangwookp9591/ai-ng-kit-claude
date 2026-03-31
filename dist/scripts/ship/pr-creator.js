/**
 * aing PR Creator — Automated Pull Request Generation
 * Generates PR title and body from commit history and review data.
 * @module scripts/ship/pr-creator
 */
import { execSync } from 'node:child_process';
/**
 * Generate PR title from feature name and version.
 */
export function generateTitle(feature, version, bumpType) {
    const prefix = bumpType === 'major' ? 'feat' : bumpType === 'minor' ? 'feat' : 'fix';
    const title = `${prefix}: ${feature} (v${version})`;
    return title.length > 70 ? title.slice(0, 67) + '...' : title;
}
/**
 * Generate PR body from changelog and review data.
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
 */
export function buildPRCommand(title, body, baseBranch) {
    const base = baseBranch ? `--base ${baseBranch}` : '';
    // Use heredoc pattern for body to preserve formatting
    return `gh pr create --title "${title.replace(/"/g, '\\"')}" ${base} --body "$(cat <<'EOF'\n${body}\nEOF\n)"`;
}
/**
 * Check if gh CLI is available.
 * Note: Uses execSync with a fixed command string (no user input), safe from injection.
 */
export function isGhAvailable() {
    try {
        execSync('which gh', { encoding: 'utf-8' });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=pr-creator.js.map