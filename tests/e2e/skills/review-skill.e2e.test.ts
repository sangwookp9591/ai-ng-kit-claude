/**
 * E2E test — /aing review-code skill
 *
 * Validates structural soundness: frontmatter, phases, agent refs,
 * tool refs, placeholders, error handling, and completeness score.
 * Also checks review-specific dimensions (security, quality, performance).
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/review-skill.e2e.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSkill,
  assertFrontmatterValid,
  assertHasName,
  assertHasDescription,
  assertHasTriggers,
  assertPhaseStructure,
  assertReferencesAgents,
  assertReferencesTools,
  assertNoPlaceholders,
  assertHasErrorHandling,
  assertMinScore,
  type ParsedSkill,
} from './_skill-test-helpers.js';

const SKILL_NAME = 'review-code';

describe(`E2E: ${SKILL_NAME} skill`, () => {
  let skill: ParsedSkill;

  it('should have a SKILL.md file', () => {
    skill = loadSkill(SKILL_NAME);
  });

  it('should have valid frontmatter', () => {
    assertFrontmatterValid(skill.frontmatter);
  });

  it('should have a name field in frontmatter', () => {
    assertHasName(skill.frontmatter!, SKILL_NAME);
  });

  it('should have a description field in frontmatter', () => {
    assertHasDescription(skill.frontmatter!);
  });

  it('should have triggers for auto-detection', () => {
    assertHasTriggers(skill.frontmatter!);
  });

  it('should have structured sections', () => {
    assertPhaseStructure(skill.body);
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

  it('should mention review dimensions', () => {
    const dimensions = ['security', 'quality', 'performance', 'bug', 'issue', 'review'];
    const bodyLower = skill.body.toLowerCase();
    const found = dimensions.filter(d => bodyLower.includes(d));
    assert.ok(
      found.length >= 2,
      `Expected at least 2 review dimensions, found: ${found.join(', ')}`,
    );
  });

  it('should reference Milla agent for security review', () => {
    const hasMilla = /milla/i.test(skill.body) || /milla/i.test(skill.content);
    assert.ok(hasMilla, 'Review skill should reference Milla for security review');
  });

  it('should score at least 70 on completeness', () => {
    assertMinScore(skill, 70);
  });
});
