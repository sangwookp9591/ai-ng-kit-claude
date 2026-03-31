/**
 * E2E test — /aing ship skill
 *
 * Validates the ship workflow SKILL.md: frontmatter, 7-step pipeline,
 * agent refs, tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/ship-skill.e2e.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSkill, assertFrontmatterValid, assertHasName, assertHasDescription, assertPhaseStructure, assertReferencesTools, assertNoPlaceholders, assertHasErrorHandling, assertMinScore, } from './_skill-test-helpers.js';
const SKILL_NAME = 'ship';
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
    it('should have structured steps', () => {
        assertPhaseStructure(skill.body);
    });
    it('should describe a multi-step pipeline', () => {
        const stepPattern = /^###?\s+Step\s+\d+/gim;
        const steps = skill.body.match(stepPattern);
        assert.ok(steps && steps.length >= 3, `Ship skill should have at least 3 steps (found ${steps?.length ?? 0})`);
    });
    it('should cover key ship stages', () => {
        const stages = ['pre-flight', 'test', 'review', 'version', 'changelog', 'commit', 'push', 'pr', 'merge'];
        const bodyLower = skill.body.toLowerCase();
        const found = stages.filter(s => bodyLower.includes(s));
        assert.ok(found.length >= 3, `Should cover at least 3 ship stages, found: ${found.join(', ')}`);
    });
    it('should reference tools', () => {
        assertReferencesTools(skill.body);
    });
    it('should not contain unresolved placeholders', () => {
        assertNoPlaceholders(skill.content);
    });
    it('should have error handling or fallback instructions', () => {
        assertHasErrorHandling(skill.body);
    });
    it('should mention dry-run capability', () => {
        assert.ok(/dry.?run/i.test(skill.body), 'Ship skill should support --dry-run mode');
    });
    it('should score at least 70 on completeness', () => {
        assertMinScore(skill, 70);
    });
});
//# sourceMappingURL=ship-skill.e2e.test.js.map