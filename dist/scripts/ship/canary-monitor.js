/**
 * aing Canary Monitor — Post-deploy health monitoring loop
 * Absorbed from gstack's /canary skill.
 * Note: Uses execSync with curl for health checks (fixed command template), safe from injection.
 * @module scripts/ship/canary-monitor
 */
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
import { addEvidence } from '../evidence/evidence-chain.js';
const log = createLogger('canary');
/**
 * Alert thresholds.
 */
export const ALERT_THRESHOLDS = {
    CRITICAL: { name: 'Page load failure', consecutiveChecks: 2 },
    HIGH: { name: 'New console errors', consecutiveChecks: 2 },
    MEDIUM: { name: 'Performance 2x degradation', consecutiveChecks: 3 },
    LOW: { name: 'New 404 links', consecutiveChecks: 3 },
};
/**
 * Run a single health check against a URL.
 */
export function healthCheck(url) {
    if (!url)
        return { healthy: false, statusCode: null, responseTimeMs: 0, error: 'No URL' };
    const start = Date.now();
    try {
        const result = execSync(`curl -sf "${url}" -o /dev/null -w "%{http_code}" 2>/dev/null`, { encoding: 'utf-8', timeout: 15000 }).trim();
        const code = parseInt(result);
        const responseTimeMs = Date.now() - start;
        return {
            healthy: code >= 200 && code < 400,
            statusCode: code,
            responseTimeMs,
        };
    }
    catch {
        return { healthy: false, statusCode: null, responseTimeMs: Date.now() - start, error: 'Unreachable' };
    }
}
/**
 * Run canary monitoring loop.
 */
export function runCanaryLoop(options) {
    const { url, feature, checks = 5, projectDir } = options;
    const results = [];
    const alerts = [];
    let consecutiveFails = 0;
    for (let i = 0; i < checks; i++) {
        const check = healthCheck(url);
        results.push({ check: i + 1, ...check, ts: new Date().toISOString() });
        if (!check.healthy) {
            consecutiveFails++;
            if (consecutiveFails >= ALERT_THRESHOLDS.CRITICAL.consecutiveChecks) {
                alerts.push({
                    type: 'CRITICAL',
                    check: i + 1,
                    message: `Page unreachable for ${consecutiveFails} consecutive checks`,
                    statusCode: check.statusCode,
                });
            }
        }
        else {
            consecutiveFails = 0;
        }
        log.info(`Canary check ${i + 1}/${checks}: ${check.healthy ? 'OK' : 'FAIL'} (${check.responseTimeMs}ms)`);
    }
    const passed = alerts.filter(a => a.type === 'CRITICAL').length === 0;
    // Record evidence
    addEvidence(feature, {
        type: 'canary',
        result: passed ? 'pass' : 'fail',
        source: 'canary-monitor',
        details: { url, checks: results.length, alerts: alerts.length },
    }, projectDir);
    return { passed, checks: results, alerts };
}
/**
 * Format canary results.
 */
export function formatCanaryResult(result) {
    const lines = [`Canary: ${result.passed ? 'HEALTHY' : 'ALERT'} (${result.checks.length} checks)`];
    for (const c of result.checks) {
        const icon = c.healthy ? '✓' : '✗';
        lines.push(`  ${icon} Check ${c.check}: ${c.statusCode || 'N/A'} (${c.responseTimeMs}ms)`);
    }
    if (result.alerts.length > 0) {
        lines.push('', 'Alerts:');
        for (const a of result.alerts) {
            lines.push(`  [${a.type}] Check ${a.check}: ${a.message}`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=canary-monitor.js.map