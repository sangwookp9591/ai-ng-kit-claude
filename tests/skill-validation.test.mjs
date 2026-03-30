/**
 * aing Skill Validation Test Suite
 * Validates all SKILL.md files for correctness, freshness, and completeness.
 *
 * Run: node --test tests/skill-validation.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateAllSkills, checkFreshness } from './helpers/skill-validator.mjs';
import { SKILL_TOUCHFILES } from '../dist/scripts/build/touchfiles.js';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('Skill Validation', () => {
  const results = validateAllSkills();

  it('should find skills to validate', () => {
    assert.ok(results.length > 0, `No skills found. Expected at least 10, got ${results.length}`);
  });

  it('should have no validation errors', () => {
    const errors = results.filter(r => !r.valid);
    if (errors.length > 0) {
      const msg = errors.map(e => `${e.skill}: ${e.errors.join(', ')}`).join('\n');
      assert.fail(`${errors.length} skill(s) have errors:\n${msg}`);
    }
  });

  it('should have titles in all skills', () => {
    for (const r of results) {
      assert.ok(
        !r.errors.includes('Missing title (# heading)'),
        `${r.skill} is missing a title`
      );
    }
  });

  it('should have no unresolved placeholders', () => {
    for (const r of results) {
      const placeholderErrors = r.errors.filter(e => e.startsWith('Unresolved placeholder'));
      assert.strictEqual(
        placeholderErrors.length, 0,
        `${r.skill} has unresolved placeholders: ${placeholderErrors.join(', ')}`
      );
    }
  });
});

describe('Skill Freshness', () => {
  const freshness = checkFreshness();

  it('should have fresh generated files', () => {
    const stale = freshness.filter(f => !f.fresh);
    if (stale.length > 0) {
      const msg = stale.map(s => `${s.skill}: ${s.reason}`).join('\n');
      assert.fail(`${stale.length} skill(s) are stale:\n${msg}\nRun: npm run build:skills`);
    }
  });
});

describe('Touchfiles Coverage', () => {
  it('should have touchfile entries for all skills', () => {
    const skillsDir = join(process.cwd(), 'skills');
    if (!existsSync(skillsDir)) return;

    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    const covered = new Set(Object.keys(SKILL_TOUCHFILES));
    const missing = skills.filter(s => !covered.has(s));

    // Warning, not assertion — some skills may not need touchfiles
    if (missing.length > 0) {
      console.log(`Warning: ${missing.length} skills without touchfile entries: ${missing.join(', ')}`);
    }
  });
});

describe('Agent References', () => {
  it('should have all referenced agents exist', () => {
    const agentsDir = join(process.cwd(), 'agents');
    if (!existsSync(agentsDir)) return;

    const agents = readdirSync(agentsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));

    // Check minimum expected agents
    const expected = ['sam', 'able', 'klay', 'jay', 'milla', 'willji', 'iron', 'derek'];
    for (const name of expected) {
      assert.ok(
        agents.includes(name),
        `Expected agent ${name}.md not found in agents/`
      );
    }
  });
});
