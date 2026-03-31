/**
 * aing Static Validator — Tier 1 Skill Quality Checks
 *
 * Validates SKILL.md files for structural correctness:
 * - Frontmatter required fields
 * - No broken placeholder references
 * - Tool allowlist vs actual usage
 * - Phase completeness
 * - Agent reference validity
 *
 * Zero cost, runs in <5s.
 *
 * @module scripts/eval/static-validator
 */
export type Severity = 'error' | 'warning' | 'info';
export interface ValidationFinding {
    rule: string;
    message: string;
    severity: Severity;
    line?: number;
}
/**
 * Run all static validation checks on a skill.
 * Returns an array of findings with severity levels.
 */
export declare function runStaticValidation(skill: string, projectDir?: string): ValidationFinding[];
/**
 * Validate a raw SKILL.md content string (for testing without filesystem).
 */
export declare function validateSkillContent(content: string, agentNames?: string[]): ValidationFinding[];
//# sourceMappingURL=static-validator.d.ts.map