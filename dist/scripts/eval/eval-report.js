/**
 * aing Eval Report Generator
 *
 * Formats eval results as markdown tables and persists
 * reports to .aing/evals/eval-{timestamp}.json.
 *
 * @module scripts/eval/eval-report
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('eval-report');
// ---------------------------------------------------------------------------
// Markdown formatting
// ---------------------------------------------------------------------------
function formatResultsTable(results) {
    const header = '| Skill | Tier | Score | Max | Pass | Findings | Duration | Cost |';
    const sep = '|-------|------|-------|-----|------|----------|----------|------|';
    const rows = results.map(r => {
        const passIcon = r.passed ? 'PASS' : 'FAIL';
        const errorCount = r.findings.filter(f => f.severity === 'error').length;
        const warnCount = r.findings.filter(f => f.severity === 'warning').length;
        const findingsSummary = `${errorCount}E ${warnCount}W`;
        const duration = r.duration_ms < 1000 ? `${r.duration_ms}ms` : `${(r.duration_ms / 1000).toFixed(1)}s`;
        const cost = r.cost_estimate > 0 ? `$${r.cost_estimate.toFixed(2)}` : 'free';
        return `| ${r.skill} | ${r.tier} | ${r.score} | ${r.maxScore} | ${passIcon} | ${findingsSummary} | ${duration} | ${cost} |`;
    });
    return [header, sep, ...rows].join('\n');
}
function formatFindingsDetail(results) {
    const failedResults = results.filter(r => !r.passed || r.findings.some(f => f.severity === 'error'));
    if (failedResults.length === 0)
        return '';
    const sections = ['## Findings Detail\n'];
    for (const r of failedResults) {
        if (r.findings.length === 0)
            continue;
        sections.push(`### ${r.skill} (${r.tier})\n`);
        for (const f of r.findings) {
            const icon = f.severity === 'error' ? 'ERR' : f.severity === 'warning' ? 'WARN' : 'INFO';
            const lineRef = f.line ? ` (line ${f.line})` : '';
            sections.push(`- **[${icon}]** \`${f.rule}\`${lineRef}: ${f.message}`);
        }
        sections.push('');
    }
    return sections.join('\n');
}
function formatRegressionAlerts(results) {
    const regressions = [];
    for (const r of results) {
        // Check for regression findings
        for (const f of r.findings) {
            if (f.rule === 'regression') {
                // Parse from the finding message
                const match = f.message.match(/Regression in (\w+): (\d+) -> (\d+) \(delta: (-?\d+)\)/);
                if (match) {
                    regressions.push({
                        skill: r.skill,
                        alert: {
                            criterion: match[1],
                            previousScore: parseInt(match[2], 10),
                            currentScore: parseInt(match[3], 10),
                            delta: parseInt(match[4], 10),
                        },
                    });
                }
            }
        }
    }
    if (regressions.length === 0)
        return '';
    const lines = ['## Regression Alerts\n'];
    for (const { skill, alert } of regressions) {
        lines.push(`- **${skill}**: ${alert.criterion} dropped from ${alert.previousScore} to ${alert.currentScore} (${alert.delta})`);
    }
    lines.push('');
    return lines.join('\n');
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Format an EvalRunSummary as a full markdown report.
 */
export function formatEvalReport(summary) {
    const totalResults = summary.results.length;
    const totalCost = summary.results.reduce((sum, r) => sum + r.cost_estimate, 0);
    const totalDuration = summary.results.reduce((sum, r) => sum + r.duration_ms, 0);
    const durationStr = totalDuration < 1000 ? `${totalDuration}ms` : `${(totalDuration / 1000).toFixed(1)}s`;
    const lines = [
        `# Eval Report`,
        '',
        `**Date**: ${summary.timestamp}`,
        `**Skills evaluated**: ${summary.totalSkills}`,
        `**Coverage**: ${summary.coveragePercent}%`,
        `**Results**: ${summary.totalPassed} passed, ${summary.totalFailed} failed (${totalResults} total evals)`,
        `**Duration**: ${durationStr}`,
        `**Estimated cost**: $${totalCost.toFixed(2)}`,
        '',
        '## Results\n',
        formatResultsTable(summary.results),
        '',
        formatRegressionAlerts(summary.results),
        formatFindingsDetail(summary.results),
    ];
    return lines.filter(l => l !== undefined).join('\n');
}
/**
 * Generate and save an eval report to disk.
 */
export function saveEvalReport(summary, projectDir) {
    const dir = projectDir || process.cwd();
    const markdown = formatEvalReport(summary);
    try {
        const evalsDir = join(dir, '.aing', 'evals');
        if (!existsSync(evalsDir)) {
            mkdirSync(evalsDir, { recursive: true });
        }
        const ts = summary.timestamp.replace(/[:.]/g, '-');
        const reportPath = join(evalsDir, `eval-${ts}.md`);
        writeFileSync(reportPath, markdown, 'utf-8');
        // Also save the raw JSON alongside
        const jsonPath = join(evalsDir, `eval-${ts}.json`);
        writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');
        log.info(`Eval report saved: ${reportPath}`);
        return { ok: true, data: { markdown, path: reportPath } };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error(`Failed to save eval report: ${message}`);
        return { ok: false, error: message };
    }
}
//# sourceMappingURL=eval-report.js.map