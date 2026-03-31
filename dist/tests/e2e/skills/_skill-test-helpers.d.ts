/**
 * Shared helpers for skill E2E tests.
 *
 * Provides frontmatter parsing, agent discovery, scoring,
 * and reusable assertion helpers.
 *
 * @module tests/e2e/skills/_skill-test-helpers
 */
export interface Frontmatter {
    name?: string;
    description?: string;
    triggers?: string[];
    tools?: string[];
    agents?: string[];
    [key: string]: unknown;
}
export interface ParsedSkill {
    content: string;
    frontmatter: Frontmatter | null;
    body: string;
    agents: string[];
    skillPath: string;
}
export declare const PROJECT_DIR: string;
export declare const AGENTS_DIR: string;
export declare const SKILLS_DIR: string;
export declare function parseFrontmatter(content: string): {
    frontmatter: Frontmatter | null;
    body: string;
};
export declare function getAgentNames(): string[];
export declare function loadSkill(skillName: string): ParsedSkill;
export declare function scoreSkill(parsed: ParsedSkill): number;
export declare function assertFrontmatterValid(fm: Frontmatter | null): void;
export declare function assertHasName(fm: Frontmatter, expectedName: string): void;
export declare function assertHasDescription(fm: Frontmatter, minLength?: number): void;
export declare function assertHasTriggers(fm: Frontmatter): void;
export declare function assertNoPlaceholders(content: string): void;
export declare function assertHasErrorHandling(body: string): void;
export declare function assertPhaseStructure(body: string): void;
export declare function assertPhasesHaveContent(body: string): void;
export declare function assertReferencesAgents(body: string): void;
export declare function assertReferencesTools(body: string): void;
export declare function assertMinScore(parsed: ParsedSkill, threshold?: number): void;
//# sourceMappingURL=_skill-test-helpers.d.ts.map