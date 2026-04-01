/**
 * aing Complexity Scorer (Innovation #3 — Adaptive Routing)
 * Estimates task complexity to route to optimal model tier.
 * @module scripts/routing/complexity-scorer
 */
/**
 * Score task complexity based on observable signals.
 */
export function scoreComplexity(signals = {}) {
    let score = 0;
    const breakdown = {};
    // File count contribution (0-3)
    const files = signals.fileCount || 1;
    const fileScore = files <= 2 ? 0 : files <= 5 ? 1 : files <= 15 ? 2 : 3;
    score += fileScore;
    breakdown.files = fileScore;
    // Line count contribution (0-3)
    const lines = signals.lineCount || 10;
    const lineScore = lines <= 30 ? 0 : lines <= 100 ? 1 : lines <= 500 ? 2 : 3;
    score += lineScore;
    breakdown.lines = lineScore;
    // Domain spread (0-4)
    const domains = signals.domainCount || 1;
    const domainScore = domains <= 1 ? 0 : domains === 2 ? 2 : domains === 3 ? 3 : 4;
    score += domainScore;
    breakdown.domains = domainScore;
    // Boolean modifiers
    if (signals.hasTests) {
        score += 1;
        breakdown.tests = 1;
    }
    if (signals.hasArchChange) {
        score += 2;
        breakdown.arch = 2;
    }
    if (signals.hasSecurity) {
        score += 2;
        breakdown.security = 2;
    }
    // Normalize to level
    const level = score <= 3 ? 'low' : score <= 7 ? 'mid' : 'high';
    return { score, level, breakdown };
}
/**
 * Determine DR depth based on complexity level.
 */
export function getDRDepth(level) {
    switch (level) {
        case 'low': return 'lite';
        case 'mid': return 'standard';
        case 'high': return 'deep';
    }
}
/**
 * Determine if --deliberate mode should be auto-triggered.
 * Triggers on: (hasSecurity OR hasArchChange) AND score > 5
 */
export function shouldForceDeliberate(signals, score) {
    const hasRisk = (signals.hasSecurity === true) || (signals.hasArchChange === true);
    return hasRisk && score > 5;
}
/**
 * Get max consensus iterations based on complexity level.
 */
export function getMaxIterations(level) {
    return level === 'low' ? 3 : 5;
}
//# sourceMappingURL=complexity-scorer.js.map