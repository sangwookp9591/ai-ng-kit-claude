/**
 * E2E test — /aing tdd skill
 *
 * Validates the TDD cycle SKILL.md: frontmatter, Red/Green/Refactor phases,
 * agent refs, tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/tdd-skill.e2e.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSkill, assertFrontmatterValid, assertHasName, assertHasDescription, assertHasTriggers, assertPhaseStructure, assertNoPlaceholders, assertHasErrorHandling, assertMinScore, } from './_skill-test-helpers.js';
const SKILL_NAME = 'tdd';
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
    it('should describe Red-Green-Refactor cycle', () => {
        const hasRed = /red/i.test(skill.body);
        const hasGreen = /green/i.test(skill.body);
        const hasRefactor = /refactor/i.test(skill.body);
        assert.ok(hasRed, 'TDD skill should describe RED phase');
        assert.ok(hasGreen, 'TDD skill should describe GREEN phase');
        assert.ok(hasRefactor, 'TDD skill should describe REFACTOR phase');
    });
    it('should describe TDD actions', () => {
        const actions = ['start', 'check', 'status'];
        const bodyLower = skill.body.toLowerCase();
        const found = actions.filter(a => bodyLower.includes(a));
        assert.ok(found.length >= 2, `Should describe TDD actions, found: ${found.join(', ')}`);
    });
    it('should describe phase transitions', () => {
        const hasTransition = /transition|phase|cycle|next|switch|→|->|flow/i.test(skill.body);
        assert.ok(hasTransition, 'Should describe how phases transition');
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
//# sourceMappingURL=tdd-skill.e2e.test.js.map