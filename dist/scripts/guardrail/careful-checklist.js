/**
 * aing Careful Checklist — Pre-deploy safety verification
 * Absorbed from gstack's /careful skill.
 * @module scripts/guardrail/careful-checklist
 */
export const DANGEROUS_PATTERNS = [
    { pattern: /rm\s+-rf\s+(?!node_modules|\.next|dist|__pycache__|\.cache|build|\.turbo|coverage)/g, name: 'rm -rf (non-safe target)', severity: 'CRITICAL' },
    { pattern: /DROP\s+(?:TABLE|DATABASE|SCHEMA)/gi, name: 'DROP TABLE/DATABASE', severity: 'CRITICAL' },
    { pattern: /TRUNCATE\s+/gi, name: 'TRUNCATE', severity: 'CRITICAL' },
    { pattern: /git\s+push\s+(?:--force|-f)\b/g, name: 'git push --force', severity: 'CRITICAL' },
    { pattern: /git\s+reset\s+--hard/g, name: 'git reset --hard', severity: 'CRITICAL' },
    { pattern: /git\s+checkout\s+\./g, name: 'git checkout .', severity: 'HIGH' },
    { pattern: /kubectl\s+delete/g, name: 'kubectl delete', severity: 'HIGH' },
    { pattern: /docker\s+(?:rm\s+-f|system\s+prune)/g, name: 'docker rm/prune', severity: 'HIGH' },
];
export const SAFE_EXCEPTIONS = [
    'rm -rf node_modules', 'rm -rf .next', 'rm -rf dist',
    'rm -rf __pycache__', 'rm -rf .cache', 'rm -rf build',
    'rm -rf .turbo', 'rm -rf coverage',
];
/**
 * Check a command for dangerous patterns.
 */
export function checkCommand(command) {
    if (!command)
        return { safe: true, findings: [] };
    // Check safe exceptions first
    for (const safe of SAFE_EXCEPTIONS) {
        if (command.trim() === safe)
            return { safe: true, findings: [] };
    }
    const findings = [];
    for (const dp of DANGEROUS_PATTERNS) {
        dp.pattern.lastIndex = 0;
        if (dp.pattern.test(command)) {
            findings.push({ name: dp.name, severity: dp.severity });
        }
    }
    return { safe: findings.length === 0, findings };
}
/**
 * Format safety check result.
 */
export function formatSafetyCheck(result) {
    if (result.safe)
        return 'Command is safe.';
    const lines = ['SAFETY WARNING:'];
    for (const f of result.findings) {
        lines.push(`  [${f.severity}] ${f.name}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=careful-checklist.js.map