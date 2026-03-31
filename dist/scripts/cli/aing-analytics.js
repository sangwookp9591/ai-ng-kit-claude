/**
 * aing Analytics — Usage statistics dashboard
 * @module scripts/cli/aing-analytics
 */
import { readUsageLog } from '../telemetry/telemetry-engine.js';
/**
 * Generate analytics report for a time window.
 */
export function generateAnalyticsReport(window = '7d', projectDir) {
    const days = parseInt(window) || 7;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const allLogs = readUsageLog(projectDir, 1000);
    const filtered = allLogs.filter((l) => new Date(l.ts) >= cutoff);
    if (filtered.length === 0)
        return `No activity in the last ${days} days.`;
    // Aggregate by skill
    const skills = {};
    let totalDuration = 0;
    let successCount = 0;
    for (const entry of filtered) {
        const skill = entry.skill || 'unknown';
        if (!skills[skill])
            skills[skill] = { count: 0, duration: 0, success: 0, error: 0 };
        skills[skill].count++;
        skills[skill].duration += entry.duration_s || 0;
        totalDuration += entry.duration_s || 0;
        if (entry.outcome === 'success') {
            successCount++;
            skills[skill].success++;
        }
        else {
            skills[skill].error++;
        }
    }
    const sorted = Object.entries(skills).sort((a, b) => b[1].count - a[1].count);
    const maxCount = sorted[0]?.[1].count || 1;
    const lines = [
        `aing analytics (last ${days} days)`,
        '\u2501'.repeat(50),
    ];
    for (const [name, data] of sorted.slice(0, 15)) {
        const barLen = Math.round((data.count / maxCount) * 20);
        const bar = '\u2588'.repeat(barLen).padEnd(20);
        const avg = data.count > 0 ? Math.round(data.duration / data.count) : 0;
        lines.push(`  ${name.padEnd(20)} ${bar} ${data.count}x (avg ${avg}s)`);
    }
    const successRate = filtered.length > 0 ? Math.round((successCount / filtered.length) * 100) : 0;
    lines.push('\u2501'.repeat(50));
    lines.push(`Success: ${successRate}% | Total: ${filtered.length} runs | Duration: ${Math.round(totalDuration / 60)}m`);
    return lines.join('\n');
}
//# sourceMappingURL=aing-analytics.js.map