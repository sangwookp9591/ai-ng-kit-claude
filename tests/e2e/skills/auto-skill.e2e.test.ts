/**
 * E2E test — /aing auto skill
 *
 * Validates structural soundness: frontmatter, phases, agent refs,
 * tool refs, placeholders, error handling, and completeness score.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/auto-skill.e2e.test.ts
 */
import { describe, it } from 'node:test';
import {
  loadSkill,
  assertFrontmatterValid,
  assertHasName,
  assertHasDescription,
  assertHasTriggers,
  assertPhaseStructure,
  assertPhasesHaveContent,
  assertReferencesAgents,
  assertReferencesTools,
  assertNoPlaceholders,
  assertHasErrorHandling,
  assertMinScore,
  type ParsedSkill,
} from './_skill-test-helpers.js';

const SKILL_NAME = 'auto';

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

  it('should have structured phases/steps with content', () => {
    assertPhaseStructure(skill.body);
    assertPhasesHaveContent(skill.body);
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
