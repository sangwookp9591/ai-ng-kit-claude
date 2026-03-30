/**
 * E2E test — /aing debug skill
 *
 * Validates the scientific debugging SKILL.md: frontmatter, hypothesis-driven
 * workflow, agent refs, tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/debug-skill.e2e.test.ts
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

const SKILL_NAME = 'debug';

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

  it('should follow scientific debugging methodology', () => {
    const methodology = ['hypothesis', 'evidence', 'symptom', 'cause', 'conclusion', 'reproduce'];
    const bodyLower = skill.body.toLowerCase();
    const found = methodology.filter(m => bodyLower.includes(m));
    assert.ok(
      found.length >= 2,
      `Debug skill should reference scientific methodology terms, found: ${found.join(', ')}`,
    );
  });

  it('should describe multiple modes', () => {
    // Check full content (body may have code blocks with Korean terms)
    const full = skill.content;
    const hasNewSession = /new.*session|start|시작|mode.*a/i.test(full);
    const hasResume = /resume|reopen|continue|재개|미완/i.test(full);
    assert.ok(hasNewSession, 'Should describe new session mode');
    assert.ok(hasResume, 'Should describe resume mode');
  });

  it('should reference valid agents', () => {
    assertReferencesAgents(skill.body);
  });

  it('should reference Klay and Jay agents', () => {
    const hasKlay = /klay/i.test(skill.content);
    const hasJay = /jay/i.test(skill.content);
    assert.ok(hasKlay || hasJay, 'Debug skill should reference Klay (exploration) or Jay (fix)');
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
