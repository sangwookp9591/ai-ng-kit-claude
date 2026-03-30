/**
 * E2E test — /aing lsp skill
 *
 * Validates the dead code detection SKILL.md: frontmatter, LSP/AST methodology,
 * agent refs, tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/lsp-skill.e2e.test.ts
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
  assertNoPlaceholders,
  assertHasErrorHandling,
  assertMinScore,
  type ParsedSkill,
} from './_skill-test-helpers.js';

const SKILL_NAME = 'lsp';

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

  it('should describe LSP-based analysis', () => {
    const lspTerms = ['lsp', 'references', 'definition', 'symbol', 'unused', 'dead code'];
    const bodyLower = skill.body.toLowerCase();
    const found = lspTerms.filter(t => bodyLower.includes(t));
    assert.ok(found.length >= 3, `Should describe LSP analysis concepts, found: ${found.join(', ')}`);
  });

  it('should describe AST analysis', () => {
    assert.ok(/ast|ast.grep|structural/i.test(skill.body), 'Should describe AST-based analysis');
  });

  it('should describe multiple modes', () => {
    const modes = ['scan', 'fix', 'target'];
    const bodyLower = skill.body.toLowerCase();
    const found = modes.filter(m => bodyLower.includes(m));
    assert.ok(found.length >= 2, `Should describe multiple operation modes, found: ${found.join(', ')}`);
  });

  it('should reference Kain agent', () => {
    assert.ok(/kain/i.test(skill.content), 'LSP skill should reference Kain agent for analysis');
  });

  it('should reference valid agents', () => {
    assertReferencesAgents(skill.body);
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
