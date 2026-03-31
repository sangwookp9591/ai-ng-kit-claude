/**
 * aing Careful Guard (Phase 4 — 200% Differentiator)
 *
 * Enhanced destructive command detection beyond the base guardrail-engine.
 *
 * @module scripts/guardrail/careful-guard
 */
/**
 * Enhanced destructive command patterns.
 * More comprehensive than the base guardrail-engine patterns.
 * Patterns are checked in order; 'allow' matches short-circuit.
 */
export const CAREFUL_PATTERNS = [
    // ── Safe exceptions (build artifacts — always allowed) ──
    {
        pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)?(node_modules|\.next|dist|\.cache|__pycache__|\.pytest_cache|build|\.turbo)/,
        level: 'allow',
    },
    // ── File destruction ──
    {
        pattern: /rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|--force\s+)(?!.*\b(node_modules|\.next|dist|\.cache|__pycache__|\.pytest_cache|build|\.turbo)\b)/,
        level: 'block',
        message: 'Destructive rm detected (not a build artifact)',
    },
    // ── Git destruction ──
    {
        pattern: /git\s+push\s+.*--force(?!-with-lease)/,
        level: 'block',
        message: 'Force push without --force-with-lease',
    },
    {
        pattern: /git\s+reset\s+--hard/,
        level: 'warn',
        message: 'Hard reset — uncommitted changes will be lost',
    },
    {
        pattern: /git\s+clean\s+-[a-zA-Z]*f/,
        level: 'warn',
        message: 'Git clean — untracked files will be deleted',
    },
    {
        pattern: /git\s+checkout\s+--?\s+\./,
        level: 'warn',
        message: 'Checkout — discards all unstaged changes',
    },
    // ── Database destruction ──
    {
        pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i,
        level: 'block',
        message: 'DROP statement detected',
    },
    {
        pattern: /TRUNCATE\s+TABLE/i,
        level: 'block',
        message: 'TRUNCATE detected',
    },
    {
        pattern: /DELETE\s+FROM\s+\w+\s*(?:;|$)/i,
        level: 'warn',
        message: 'DELETE without WHERE clause',
    },
    // ── Infrastructure destruction ──
    {
        pattern: /kubectl\s+delete\s+(?!pod\/test)/,
        level: 'block',
        message: 'kubectl delete detected',
    },
    {
        pattern: /docker\s+rm\s+-f/,
        level: 'warn',
        message: 'Force docker container removal',
    },
    {
        pattern: /terraform\s+destroy/,
        level: 'block',
        message: 'Terraform destroy detected',
    },
];
/**
 * Check a bash command against careful patterns.
 * Allow patterns are checked first (safe exceptions).
 */
export function checkCareful(command) {
    // Check allow patterns first (safe exceptions)
    for (const p of CAREFUL_PATTERNS) {
        if (p.level === 'allow' && p.pattern.test(command)) {
            return { level: 'allow' };
        }
    }
    // Then check block/warn patterns
    for (const p of CAREFUL_PATTERNS) {
        if (p.level !== 'allow' && p.pattern.test(command)) {
            return { level: p.level, message: p.message };
        }
    }
    return { level: 'allow' };
}
/**
 * Check a file path against freeze boundaries.
 * Check a file path against freeze boundaries using aing's config system.
 */
export function checkFreeze(filePath, config) {
    const freezeDirs = config?.guardrail?.freezeDirs || [];
    if (freezeDirs.length === 0)
        return { level: 'allow' };
    // Normalize path: collapse slashes and remove traversals
    const normalizedPath = filePath.replace(/\/+/g, '/').replace(/\.\.\//g, '');
    for (const dir of freezeDirs) {
        if (normalizedPath.startsWith(dir)) {
            return { level: 'block', message: `File is in frozen directory: ${dir}` };
        }
    }
    return { level: 'allow' };
}
/**
 * Format careful guard result for display.
 */
export function formatCarefulResult(result) {
    if (result.level === 'allow')
        return '';
    const icon = result.level === 'block' ? '[BLOCK]' : '[WARN]';
    return `[aing Careful Guard] ${icon} ${result.message}`;
}
//# sourceMappingURL=careful-guard.js.map