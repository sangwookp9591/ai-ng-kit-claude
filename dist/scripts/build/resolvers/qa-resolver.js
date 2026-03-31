/**
 * aing QA Resolver — generates QA-related content for SKILL.md templates.
 * @module scripts/build/resolvers/qa-resolver
 */
import { HEALTH_CATEGORIES } from '../../review/qa-health-score.js';
/**
 * Generate health score category table.
 */
export function resolveHealthCategories() {
    const lines = [
        '| Category | Weight | Description |',
        '|----------|--------|-------------|',
    ];
    for (const [key, config] of Object.entries(HEALTH_CATEGORIES)) {
        lines.push(`| ${config.label} | ${Math.round(config.weight * 100)}% | ${key} |`);
    }
    return lines.join('\n');
}
/**
 * Generate benchmark thresholds table.
 */
export function resolveBenchmarkThresholds() {
    return `| Metric | Regression | Warning |
|--------|-----------|---------|
| Timing | >50% OR >500ms | >20% |
| Bundle | >25% | >10% |
| Requests | — | >30% |`;
}
//# sourceMappingURL=qa-resolver.js.map