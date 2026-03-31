/**
 * aing Eval Touchfiles — Diff-based eval selection
 *
 * Determines which evals need to re-run based on git diff output.
 * Each eval declares file dependencies; when those files change, the
 * eval is marked as affected.
 *
 * @module scripts/eval/touchfiles
 */
export interface EvalRegistryEntry {
    /** Name of the eval (typically matches skill name). */
    name: string;
    /** File patterns that trigger this eval when changed. */
    touchfiles: string[];
}
/**
 * Default eval registry: each eval lists the file paths/prefixes that
 * should trigger a re-run when changed.
 */
export declare const DEFAULT_EVAL_REGISTRY: EvalRegistryEntry[];
/**
 * Global touchfiles that trigger ALL evals when changed.
 * These are core infrastructure files whose changes can affect any skill.
 */
export declare const GLOBAL_TOUCHFILES: string[];
/**
 * Get the list of changed files between the current HEAD and a base branch.
 * Uses `git diff --name-only` to find changed files.
 *
 * @param baseBranch Base branch to compare against (default: 'main')
 * @param cwd Working directory (default: process.cwd())
 * @returns Array of changed file paths relative to the repo root
 */
export declare function getChangedFiles(baseBranch?: string, cwd?: string): string[];
/**
 * Get unstaged/staged changed files (for pre-commit eval selection).
 */
export declare function getUncommittedChanges(cwd?: string): string[];
/**
 * Given a list of changed files and an eval registry, determine which evals
 * need to be re-run.
 *
 * @param changedFiles List of changed file paths (relative to repo root)
 * @param evalRegistry Eval registry mapping evals to their dependencies
 * @returns Sorted list of affected eval names
 */
export declare function getAffectedEvals(changedFiles: string[], evalRegistry?: EvalRegistryEntry[]): string[];
//# sourceMappingURL=touchfiles.d.ts.map