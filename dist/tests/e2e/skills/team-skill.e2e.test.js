/**
 * E2E test — /aing team skill
 *
 * Validates the staged team pipeline SKILL.md: frontmatter, pipeline stages,
 * agent refs, tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/team-skill.e2e.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSkill, assertFrontmatterValid, assertHasName, assertHasDescription, assertHasTriggers, assertPhaseStructure, assertReferencesAgents, assertReferencesTools, assertNoPlaceholders, assertHasErrorHandling, assertMinScore, } from './_skill-test-helpers.js';
const SKILL_NAME = 'team';
describe(`E2E: ${SKILL_NAME} skill`, () => {
    let skill;
    it('should have a SKILL.md file', () => {
        skill = loadSkill(SKILL_NAME);
    });
    it('should have valid frontmatter', () => {
        assertFrontmatterValid(skill.frontmatter);
    });
    it('should have a name field in frontmatter', () => {
        assertHasName(skill.frontmatter, SKILL_NAME);
    });
    it('should have a description field in frontmatter', () => {
        assertHasDescription(skill.frontmatter);
    });
    it('should have triggers for auto-detection', () => {
        assertHasTriggers(skill.frontmatter);
    });
    it('should have structured sections', () => {
        assertPhaseStructure(skill.body);
    });
    it('should describe pipeline stages', () => {
        const stages = ['plan', 'exec', 'verify', 'fix'];
        const bodyLower = skill.body.toLowerCase();
        const found = stages.filter(s => bodyLower.includes(s));
        assert.ok(found.length >= 3, `Should describe pipeline stages, found: ${found.join(', ')}`);
    });
    it('should describe resume detection', () => {
        assert.ok(/resume/i.test(skill.body), 'Team skill should support session resume');
    });
    it('should describe verify-fix loop', () => {
        const hasVerify = /verify/i.test(skill.body);
        const hasFix = /fix/i.test(skill.body);
        const hasLoop = /loop|cycle|retry|repeat/i.test(skill.body);
        assert.ok(hasVerify && hasFix, 'Should describe verify and fix stages');
        assert.ok(hasLoop, 'Should describe the verify-fix loop mechanism');
    });
    it('should reference valid agents', () => {
        assertReferencesAgents(skill.body);
    });
    it('should reference valid tools', () => {
        assertReferencesTools(skill.body);
    });
    it('should not contain unresolved placeholders', () => {
        assertNoPlaceholders(skill.content);
    });
    it('should have error handling or fallback instructions', () => {
        assertHasErrorHandling(skill.body);
    });
    it('should score at least 70 on completeness', () => {
        assertMinScore(skill, 70);
    });
});
//# sourceMappingURL=team-skill.e2e.test.js.map