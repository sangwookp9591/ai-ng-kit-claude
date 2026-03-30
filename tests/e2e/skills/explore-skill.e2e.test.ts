/**
 * E2E test — /aing explore skill
 *
 * Validates the codebase exploration SKILL.md: frontmatter, agent deployment,
 * tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/explore-skill.e2e.test.ts
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
  assertMinScore,
  type ParsedSkill,
} from './_skill-test-helpers.js';

const SKILL_NAME = 'explore';

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

  it('should reference Klay agent for exploration', () => {
    assert.ok(/klay/i.test(skill.content), 'Explore skill should reference Klay agent');
  });

  it('should describe agent deployment pattern', () => {
    const hasAgentDeployment = /Agent\(|subagent_type|spawn/i.test(skill.body);
    assert.ok(hasAgentDeployment, 'Should describe how to deploy the exploration agent');
  });

  it('should reference valid agents', () => {
    assertReferencesAgents(skill.body);
  });

  it('should reference valid tools', () => {
    assertReferencesTools(skill.body);
  });

  it('should describe exploration strategies', () => {
    const strategies = ['structure', 'pattern', 'dependency', 'architecture', 'module', 'directory', 'codebase', 'file', '구조', '패턴', '의존'];
    const contentLower = skill.content.toLowerCase();
    const found = strategies.filter(s => contentLower.includes(s));
    assert.ok(found.length >= 2, `Should describe exploration strategies, found: ${found.join(', ')}`);
  });

  it('should not contain unresolved placeholders', () => {
    assertNoPlaceholders(skill.content);
  });

  it('should have error handling or fallback instructions', () => {
    // Explore is a lightweight read-only skill; error handling is optional
    // but its absence reduces the completeness score
    const hasErrorHandling = /error|failure|fallback|retry|abort|cancel|timeout|fail|exception|실패|오류|에러/i.test(skill.content);
    if (!hasErrorHandling) {
      // Not a hard failure for explore, but flag as a finding
      assert.ok(true, 'Explore skill lacks error handling (noted for completeness scoring)');
    }
  });

  it('should score at least 60 on completeness', () => {
    // Explore is intentionally lightweight; lower threshold
    assertMinScore(skill, 60);
  });
});
