/**
 * E2E test — /aing browse skill
 *
 * Validates the browser QA SKILL.md: frontmatter, MCP Playwright integration,
 * tool refs, placeholders, error handling, and completeness.
 *
 * Run:
 *   npx tsx --test tests/e2e/skills/browse-skill.e2e.test.ts
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
  assertNoPlaceholders,
  assertHasErrorHandling,
  assertMinScore,
  type ParsedSkill,
} from './_skill-test-helpers.js';

const SKILL_NAME = 'browse';

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

  it('should reference MCP Playwright tools', () => {
    const mcpTools = [
      'browser_navigate',
      'browser_snapshot',
      'browser_click',
      'browser_fill',
      'browser_take_screenshot',
      'browser_console',
    ];
    const found = mcpTools.filter(t => skill.body.includes(t));
    assert.ok(found.length >= 3, `Should reference MCP Playwright tools, found: ${found.join(', ')}`);
  });

  it('should describe a QA workflow', () => {
    const steps = ['navigate', 'snapshot', 'interact', 'verify', 'screenshot', 'evidence'];
    const bodyLower = skill.body.toLowerCase();
    const found = steps.filter(s => bodyLower.includes(s));
    assert.ok(found.length >= 3, `Should describe QA workflow steps, found: ${found.join(', ')}`);
  });

  it('should mention ARIA for accessibility', () => {
    assert.ok(/aria/i.test(skill.body), 'Browse skill should mention ARIA tree/refs');
  });

  it('should describe console error checking', () => {
    assert.ok(/console/i.test(skill.body), 'Should describe checking browser console for errors');
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
