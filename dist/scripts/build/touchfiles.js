/**
 * Touchfiles — Diff-based Test Selection
 *
 * Maps which source files affect which skills.
 * Given a list of changed files, returns which skills need re-testing.
 *
 * @module scripts/build/touchfiles
 */
/**
 * Mapping of skill name to glob-like path patterns that affect it.
 * When any file matching these patterns changes, the skill needs re-testing.
 */
export const SKILL_TOUCHFILES = {
    'auto': ['skills/auto/', 'agents/', 'scripts/pipeline/'],
    'plan-task': ['skills/plan-task/', 'agents/able.md', 'agents/klay.md'],
    'review-code': ['skills/review-code/', 'agents/milla.md', 'agents/sam.md'],
    'team': ['skills/team/', 'agents/', 'scripts/pipeline/'],
    'debug': ['skills/debug/', 'scripts/guardrail/'],
    'explore': ['skills/explore/', 'agents/klay.md'],
    'tdd': ['skills/tdd/', 'agents/jay.md'],
    'design': ['skills/design/', 'agents/willji.md', 'agents/derek.md'],
    'qa-loop': ['skills/qa-loop/', 'scripts/review/qa-health-score.mjs', 'scripts/review/browser-evidence.mjs', 'scripts/review/aria-refs.mjs', 'scripts/guardrail/'],
    'rollback': ['skills/rollback/', 'scripts/recovery/'],
    'task': ['skills/task/', 'scripts/task/'],
    'verify-evidence': ['skills/verify-evidence/', 'agents/sam.md', 'scripts/evidence/'],
    'init': ['skills/init/', 'scripts/setup/'],
    'start': ['skills/start/', 'scripts/setup/'],
    'do': ['skills/do/', 'scripts/routing/'],
    'test': ['skills/test/', 'agents/jay.md'],
    'perf': ['skills/perf/', 'agents/jun.md', 'agents/klay.md'],
    'refactor': ['skills/refactor/', 'agents/klay.md', 'agents/jay.md', 'agents/derek.md'],
    'lsp': ['skills/lsp/', 'agents/kain.md', 'agents/milla.md'],
    'figma-read': ['skills/figma-read/', 'agents/figma-reader.md'],
    'flutter-architecture': ['skills/flutter-architecture/'],
    'flutter-animation': ['skills/flutter-animation/'],
    'agent-ui': ['skills/agent-ui/', 'scripts/agent-ui/'],
    'progress-check': ['skills/progress-check/', 'agents/progress-checker.md'],
    'review-pipeline': ['skills/review-pipeline/', 'scripts/review/', 'agents/milla.md', 'agents/klay.md', 'agents/sam.md', 'agents/simon.md', 'agents/able.md', 'agents/willji.md', 'agents/iron.md'],
    'ship': ['skills/ship/', 'scripts/ship/', 'scripts/review/', 'scripts/evidence/', 'scripts/qa/'],
    'ai-pipeline': ['skills/ai-pipeline/', 'agents/jo.md', 'agents/hugg.md'],
};
/**
 * Shared infrastructure patterns that affect ALL skills when changed.
 */
const GLOBAL_TOUCHFILES = [
    'scripts/core/',
    'hooks-handlers/',
    'aing.config.json',
];
/**
 * Check if a changed file path matches a touchfile pattern.
 * Uses simple prefix/contains matching (no full glob).
 */
function matchesPattern(changedFile, pattern) {
    // Normalize separators
    const normalized = changedFile.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');
    // Direct file match or directory prefix match
    return normalized === normalizedPattern
        || normalized.startsWith(normalizedPattern)
        || normalized.includes('/' + normalizedPattern);
}
/**
 * Given a list of changed files, return which skills need re-testing.
 */
export function affectedSkills(changedFiles) {
    if (!changedFiles || changedFiles.length === 0)
        return [];
    // Check if any global touchfile was changed — if so, ALL skills affected
    const globalChanged = changedFiles.some((f) => GLOBAL_TOUCHFILES.some((pattern) => matchesPattern(f, pattern)));
    if (globalChanged) {
        return Object.keys(SKILL_TOUCHFILES).sort();
    }
    const affected = new Set();
    for (const file of changedFiles) {
        for (const [skill, patterns] of Object.entries(SKILL_TOUCHFILES)) {
            if (patterns.some((pattern) => matchesPattern(file, pattern))) {
                affected.add(skill);
            }
        }
    }
    return [...affected].sort();
}
//# sourceMappingURL=touchfiles.js.map