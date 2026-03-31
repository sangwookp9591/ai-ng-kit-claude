/**
 * E2E test — /aing qa-loop skill
 *
 * Validates the automated QA loop SKILL.md: frontmatter, test-fix-retest cycle,
 * agent refs, tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/qa-loop-skill.e2e.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSkill, assertFrontmatterValid, assertHasName, assertHasDescription, assertHasTriggers, assertPhaseStructure, assertReferencesTools, assertNoPlaceholders, assertHasErrorHandling, assertMinScore, } from './_skill-test-helpers.js';
const SKILL_NAME = 'qa-loop';
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
    it('should describe test-fix-retest cycle', () => {
        const hasTest = /test|run.*test/i.test(skill.body);
        const hasFix = /fix|repair|patch/i.test(skill.body);
        const hasRetest = /retest|re-test|re-run|verify/i.test(skill.body);
        assert.ok(hasTest, 'QA loop should describe test execution');
        assert.ok(hasFix, 'QA loop should describe fix step');
        assert.ok(hasRetest, 'QA loop should describe retest/verification');
    });
    it('should define max cycle limit', () => {
        const hasMaxCycle = /max.*cycle|cycle.*limit|max.*5|maximum.*iteration/i.test(skill.body);
        assert.ok(hasMaxCycle, 'QA loop should define a maximum cycle count to prevent infinite loops');
    });
    it('should detect repeated errors', () => {
        const hasErrorDetection = /same.*error|repeated|duplicate.*error|error.*threshold/i.test(skill.body);
        assert.ok(hasErrorDetection, 'QA loop should detect and stop on repeated identical errors');
    });
    it('should describe test command detection', () => {
        const hasDetection = /detect|auto.*detect|package\.json|test.*command/i.test(skill.body);
        assert.ok(hasDetection, 'Should describe how test commands are detected');
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
    it('should score at least 70 on completeness', () => {
        assertMinScore(skill, 70);
    });
});
//# sourceMappingURL=qa-loop-skill.e2e.test.js.map