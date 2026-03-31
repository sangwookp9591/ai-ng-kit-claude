/**
 * aing Review Readiness Dashboard
 * Absorbed from gstack's review readiness dashboard pattern.
 * Shows review status across all tiers.
 * @module scripts/review/review-dashboard
 */
import { readReviewLog, getLatestReview, checkStaleness } from './review-log.js';
import { execSync } from 'node:child_process';
const REVIEW_TIERS = [
    { key: 'eng-review', label: 'Eng Review', required: true, trigger: '/aing review eng' },
    { key: 'ceo-review', label: 'CEO Review', required: false, trigger: '/aing review ceo' },
    { key: 'design-review', label: 'Design Review', required: false, trigger: '/aing review design' },
    { key: 'outside-voice', label: 'Outside Voice', required: false, trigger: '/aing review outside' },
];
/**
 * Build the dashboard data.
 */
export function buildDashboard(projectDir) {
    let currentCommit = 'unknown';
    try {
        currentCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    }
    catch { }
    const rows = REVIEW_TIERS.map(tier => {
        const latest = getLatestReview(tier.key, projectDir);
        const { stale, reason } = checkStaleness(latest, currentCommit);
        const runs = readReviewLog(projectDir).filter(e => e.skill === tier.key).length;
        return {
            ...tier,
            runs,
            lastRun: latest?.ts || null,
            status: latest ? (latest.status === 'clean' ? 'CLEAR' : 'ISSUES') : null,
            stale,
            staleReason: reason,
            findings: latest?.issues_found || 0,
            criticalGaps: latest?.critical_gaps || 0,
        };
    });
    const engReview = rows.find(r => r.key === 'eng-review');
    const cleared = engReview && engReview.status === 'CLEAR' && !engReview.stale;
    return {
        rows,
        currentCommit,
        verdict: cleared ? 'CLEARED' : 'NOT CLEARED',
        verdictReason: cleared
            ? 'Eng Review passed'
            : engReview?.status === 'ISSUES'
                ? `Eng Review has ${engReview.findings} open issues`
                : 'Eng Review required',
    };
}
/**
 * Format dashboard for terminal display.
 */
export function formatDashboard(dashboard) {
    const lines = [
        '+====================================================================+',
        '|                    REVIEW READINESS DASHBOARD                       |',
        '+====================================================================+',
        '| Review          | Runs | Last Run            | Status    | Required |',
        '|-----------------|------|---------------------|-----------|----------|',
    ];
    for (const row of dashboard.rows) {
        const name = row.label.padEnd(15);
        const runs = String(row.runs).padStart(4);
        const lastRun = row.lastRun ? row.lastRun.slice(0, 16).replace('T', ' ') : '—'.padEnd(19);
        const status = (row.status || '—').padEnd(9);
        const required = row.required ? 'YES' : 'no';
        lines.push(`| ${name} | ${runs} | ${lastRun} | ${status} | ${required.padEnd(8)} |`);
    }
    lines.push('+--------------------------------------------------------------------+');
    lines.push(`| VERDICT: ${dashboard.verdict} — ${dashboard.verdictReason}`.padEnd(69) + '|');
    lines.push('+====================================================================+');
    // Staleness notes
    for (const row of dashboard.rows) {
        if (row.stale && row.runs > 0) {
            lines.push(`Note: ${row.label} may be stale — ${row.staleReason}`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=review-dashboard.js.map