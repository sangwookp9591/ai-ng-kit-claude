import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const SKILLS_DIR = join(ROOT, 'skills');

/**
 * Validate that a skill SKILL.md meets quality standards.
 */
function validateSkill(skillDir, skillName) {
  const skillPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillPath)) return { valid: false, errors: ['SKILL.md not found'] };

  const content = readFileSync(skillPath, 'utf-8');
  const errors = [];
  const warnings = [];

  // Must have frontmatter
  if (!content.startsWith('---')) errors.push('Missing YAML frontmatter');

  // Must have name field
  if (!content.includes('name:')) errors.push('Missing name field');

  // Must have description
  if (!content.includes('description:')) errors.push('Missing description field');

  // Content quality checks
  const lines = content.split('\n');
  const contentLines = lines.filter(l => l.trim().length > 0 && !l.startsWith('---'));

  if (contentLines.length < 10) warnings.push('Very short skill (<10 non-empty lines)');
  if (contentLines.length < 5) errors.push('Skill too short (<5 non-empty lines)');

  // Check for AI slop in skill content
  const slopPatterns = [
    /\bdelve\b/i,
    /\bcrucial\b/i,
    /\brobust\b/i,
    /\bcomprehensive\b/i,
    /\bnuanced\b/i,
    /\beverything you need\b/i,
  ];
  for (const pattern of slopPatterns) {
    if (pattern.test(content)) {
      warnings.push(`AI slop detected: ${pattern.source}`);
    }
  }

  // Check for actionable content (commands, code blocks, steps)
  const hasCodeBlocks = content.includes('```');
  const hasSteps = /^\d+\.\s/m.test(content) || /^-\s\[/m.test(content);
  const hasHeadings = /^##\s/m.test(content);

  if (!hasHeadings) warnings.push('No subheadings (## sections)');
  if (!hasCodeBlocks && !hasSteps) warnings.push('No code blocks or numbered steps');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      lines: lines.length,
      contentLines: contentLines.length,
      hasCodeBlocks,
      hasSteps,
      hasHeadings,
    },
  };
}

describe('Skill Quality Eval', () => {
  const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  it('should have at least 25 skills', () => {
    assert.ok(skillDirs.length >= 25, `Expected at least 25 skills, got ${skillDirs.length}`);
  });

  for (const skill of skillDirs) {
    describe(`Skill: ${skill}`, () => {
      const skillDir = join(SKILLS_DIR, skill);
      const result = validateSkill(skillDir, skill);

      it('should have valid SKILL.md', () => {
        if (!result.valid) {
          assert.fail(`Skill ${skill} has errors: ${result.errors.join(', ')}`);
        }
      });

      it('should have YAML frontmatter with name', () => {
        const skillPath = join(skillDir, 'SKILL.md');
        if (existsSync(skillPath)) {
          const content = readFileSync(skillPath, 'utf-8');
          assert.ok(content.startsWith('---'), `${skill}: missing frontmatter`);
          assert.ok(content.includes('name:'), `${skill}: missing name`);
        }
      });

      it('should have description', () => {
        const skillPath = join(skillDir, 'SKILL.md');
        if (existsSync(skillPath)) {
          const content = readFileSync(skillPath, 'utf-8');
          assert.ok(content.includes('description'), `${skill}: missing description`);
        }
      });

      it('should have substantive content (>5 lines)', () => {
        assert.ok(
          result.metrics?.contentLines >= 5,
          `${skill}: too short (${result.metrics?.contentLines} lines)`,
        );
      });
    });
  }
});

describe('Skill Coverage', () => {
  it('should cover core workflow skills', () => {
    const required = ['auto', 'plan-task', 'explore', 'ship', 'review-code'];
    for (const name of required) {
      const dirPath = join(SKILLS_DIR, name);
      const exists = existsSync(dirPath) && existsSync(join(dirPath, 'SKILL.md'));
      assert.ok(exists, `Missing core skill: ${name}`);
    }
  });

  it('should cover debugging skills', () => {
    const debugSkills = ['debug', 'investigate'];
    const hasDebug = debugSkills.some(s => existsSync(join(SKILLS_DIR, s, 'SKILL.md')));
    assert.ok(hasDebug, 'Missing debugging skill (debug or investigate)');
  });

  it('should cover testing skills', () => {
    const testSkills = ['test', 'tdd', 'qa-loop'];
    const hasTest = testSkills.some(s => existsSync(join(SKILLS_DIR, s, 'SKILL.md')));
    assert.ok(hasTest, 'Missing testing skill');
  });

  it('should cover design skills', () => {
    const designSkills = ['design'];
    const hasDesign = designSkills.some(s => existsSync(join(SKILLS_DIR, s, 'SKILL.md')));
    assert.ok(hasDesign, 'Missing design skill');
  });

  it('should cover safety skills', () => {
    const safetySkills = ['freeze', 'rollback'];
    for (const s of safetySkills) {
      assert.ok(existsSync(join(SKILLS_DIR, s, 'SKILL.md')), `Missing safety skill: ${s}`);
    }
  });
});
