/**
 * aing Eval Touchfiles — Diff-based eval selection
 *
 * Determines which evals need to re-run based on git diff output.
 * Each eval declares file dependencies; when those files change, the
 * eval is marked as affected.
 *
 * @module scripts/eval/touchfiles
 */
import { execFileSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
const log = createLogger('eval-touchfiles');
// ---------------------------------------------------------------------------
// Eval registry — maps eval names to their file dependencies
// ---------------------------------------------------------------------------
/**
 * Default eval registry: each eval lists the file paths/prefixes that
 * should trigger a re-run when changed.
 */
export const DEFAULT_EVAL_REGISTRY = [
    { name: 'auto', touchfiles: ['skills/auto/', 'agents/', 'scripts/pipeline/'] },
    { name: 'review-code', touchfiles: ['skills/review-code/', 'agents/milla.md', 'agents/sam.md', 'scripts/review/'] },
    { name: 'ship', touchfiles: ['skills/ship/', 'scripts/ship/', 'scripts/review/', 'scripts/evidence/'] },
    { name: 'debug', touchfiles: ['skills/debug/', 'agents/klay.md', 'agents/jay.md', 'scripts/guardrail/'] },
    { name: 'explore', touchfiles: ['skills/explore/', 'agents/klay.md'] },
    { name: 'tdd', touchfiles: ['skills/tdd/', 'agents/jay.md', 'agents/jerry.md'] },
    { name: 'team', touchfiles: ['skills/team/', 'agents/', 'scripts/pipeline/'] },
    { name: 'qa-loop', touchfiles: ['skills/qa-loop/', 'scripts/qa/', 'scripts/review/qa-health-score.ts'] },
    { name: 'browse', touchfiles: ['skills/browse/', 'scripts/qa/browse-qa.ts', 'scripts/review/browse-integration.ts'] },
    { name: 'lsp', touchfiles: ['skills/lsp/', 'agents/kain.md', 'agents/simon.md'] },
    { name: 'plan-task', touchfiles: ['skills/plan-task/', 'agents/able.md', 'agents/klay.md'] },
    { name: 'design', touchfiles: ['skills/design/', 'agents/willji.md', 'scripts/design/'] },
    { name: 'task', touchfiles: ['skills/task/', 'scripts/task/'] },
    { name: 'refactor', touchfiles: ['skills/refactor/', 'agents/rowan.md', 'agents/klay.md'] },
    { name: 'test', touchfiles: ['skills/test/', 'agents/jerry.md'] },
    { name: 'perf', touchfiles: ['skills/perf/', 'agents/jun.md'] },
    { name: 'verify-evidence', touchfiles: ['skills/verify-evidence/', 'agents/sam.md', 'scripts/evidence/'] },
    { name: 'rollback', touchfiles: ['skills/rollback/', 'scripts/recovery/'] },
    { name: 'init', touchfiles: ['skills/init/', 'scripts/setup/'] },
    { name: 'do', touchfiles: ['skills/do/', 'scripts/routing/'] },
    { name: 'ai-pipeline', touchfiles: ['skills/ai-pipeline/', 'agents/jo.md', 'agents/hugg.md'] },
];
/**
 * Global touchfiles that trigger ALL evals when changed.
 * These are core infrastructure files whose changes can affect any skill.
 */
export const GLOBAL_TOUCHFILES = [
    'scripts/core/',
    'scripts/eval/',
    'hooks-handlers/',
    'hooks/',
    'aing.config.json',
    'package.json',
];
// ---------------------------------------------------------------------------
// Path matching
// ---------------------------------------------------------------------------
/**
 * Check if a changed file path matches a touchfile pattern.
 * Uses prefix matching with path normalization.
 */
function matchesPattern(changedFile, pattern) {
    const normalized = changedFile.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');
    return (normalized === normalizedPattern ||
        normalized.startsWith(normalizedPattern) ||
        normalized.includes('/' + normalizedPattern));
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Get the list of changed files between the current HEAD and a base branch.
 * Uses `git diff --name-only` to find changed files.
 *
 * @param baseBranch Base branch to compare against (default: 'main')
 * @param cwd Working directory (default: process.cwd())
 * @returns Array of changed file paths relative to the repo root
 */
export function getChangedFiles(baseBranch = 'main', cwd) {
    const dir = cwd ?? process.cwd();
    try {
        // Get merge base to find the actual divergence point
        const mergeBase = execFileSync('git', ['merge-base', baseBranch, 'HEAD'], { cwd: dir, encoding: 'utf-8', timeout: 10_000 }).trim();
        // Get changed files since merge base
        const output = execFileSync('git', ['diff', '--name-only', mergeBase, 'HEAD'], { cwd: dir, encoding: 'utf-8', timeout: 10_000 }).trim();
        if (!output)
            return [];
        const files = output.split('\n').filter(f => f.trim().length > 0);
        log.info(`Found ${files.length} changed files vs ${baseBranch}`);
        return files;
    }
    catch (err) {
        // Fallback: diff against base branch directly (works even without merge-base)
        try {
            const output = execFileSync('git', ['diff', '--name-only', baseBranch], { cwd: dir, encoding: 'utf-8', timeout: 10_000 }).trim();
            if (!output)
                return [];
            return output.split('\n').filter(f => f.trim().length > 0);
        }
        catch {
            const message = err instanceof Error ? err.message : String(err);
            log.warn(`Failed to get changed files: ${message}`);
            return [];
        }
    }
}
/**
 * Get unstaged/staged changed files (for pre-commit eval selection).
 */
export function getUncommittedChanges(cwd) {
    const dir = cwd ?? process.cwd();
    try {
        const output = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: dir, encoding: 'utf-8', timeout: 10_000 }).trim();
        const staged = execFileSync('git', ['diff', '--name-only', '--cached'], { cwd: dir, encoding: 'utf-8', timeout: 10_000 }).trim();
        const allFiles = new Set();
        if (output)
            output.split('\n').forEach(f => { if (f.trim())
                allFiles.add(f.trim()); });
        if (staged)
            staged.split('\n').forEach(f => { if (f.trim())
                allFiles.add(f.trim()); });
        return [...allFiles];
    }
    catch {
        return [];
    }
}
/**
 * Given a list of changed files and an eval registry, determine which evals
 * need to be re-run.
 *
 * @param changedFiles List of changed file paths (relative to repo root)
 * @param evalRegistry Eval registry mapping evals to their dependencies
 * @returns Sorted list of affected eval names
 */
export function getAffectedEvals(changedFiles, evalRegistry = DEFAULT_EVAL_REGISTRY) {
    if (!changedFiles || changedFiles.length === 0)
        return [];
    // Check if any global touchfile was changed
    const globalChanged = changedFiles.some(f => GLOBAL_TOUCHFILES.some(pattern => matchesPattern(f, pattern)));
    if (globalChanged) {
        log.info('Global touchfile changed — all evals affected');
        return evalRegistry.map(e => e.name).sort();
    }
    const affected = new Set();
    for (const file of changedFiles) {
        for (const entry of evalRegistry) {
            if (entry.touchfiles.some(pattern => matchesPattern(file, pattern))) {
                affected.add(entry.name);
            }
        }
    }
    const result = [...affected].sort();
    log.info(`${result.length} evals affected by ${changedFiles.length} changed files: ${result.join(', ')}`);
    return result;
}
//# sourceMappingURL=touchfiles.js.map