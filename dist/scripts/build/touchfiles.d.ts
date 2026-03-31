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
export declare const SKILL_TOUCHFILES: Record<string, string[]>;
/**
 * Given a list of changed files, return which skills need re-testing.
 */
export declare function affectedSkills(changedFiles: string[]): string[];
//# sourceMappingURL=touchfiles.d.ts.map