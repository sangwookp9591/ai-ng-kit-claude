/**
 * aing Skill Validator — Validates SKILL.md files
 * Absorbed from gstack's skill-parser.ts pattern.
 *
 * @module tests/helpers/skill-validator
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = 'skills';

/**
 * Validate a single skill file.
 * @param {string} skillPath - Path to SKILL.md or SKILL.md.tmpl
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateSkill(skillPath) {
  const errors = [];
  const warnings = [];

  if (!existsSync(skillPath)) {
    return { valid: false, errors: [`File not found: ${skillPath}`], warnings: [] };
  }

  const content = readFileSync(skillPath, 'utf-8');

  // Must have a title (# heading)
  if (!content.match(/^#\s+/m)) {
    errors.push('Missing title (# heading)');
  }

  // Must have usage section
  if (!content.match(/##\s+(사용법|Usage)/i)) {
    warnings.push('Missing usage section');
  }

  // Check for unresolved placeholders
  const unresolvedPlaceholders = content.match(/\{\{[A-Z_]+\}\}/g);
  if (unresolvedPlaceholders) {
    for (const p of unresolvedPlaceholders) {
      errors.push(`Unresolved placeholder: ${p}`);
    }
  }

  // Check for agent references that don't exist
  const agentRefs = content.match(/agents\/(\w+)\.md/g) || [];
  for (const ref of agentRefs) {
    const agentFile = ref;
    if (!existsSync(join(process.cwd(), agentFile))) {
      warnings.push(`Referenced agent not found: ${agentFile}`);
    }
  }

  // Check for script references that don't exist
  const scriptRefs = content.match(/scripts\/[\w/]+\.mjs/g) || [];
  for (const ref of scriptRefs) {
    if (!existsSync(join(process.cwd(), ref))) {
      warnings.push(`Referenced script not found: ${ref}`);
    }
  }

  // Check for MCP tool references (browser tools)
  const mcpRefs = content.match(/mcp__playwright__\w+/g) || [];
  if (mcpRefs.length > 0) {
    // Verify browser-evidence module exists
    if (!existsSync(join(process.cwd(), 'scripts/review/browser-evidence.mjs'))) {
      warnings.push('References MCP Playwright tools but browser-evidence.mjs not found');
    }
    if (!existsSync(join(process.cwd(), 'scripts/review/aria-refs.mjs'))) {
      warnings.push('References MCP Playwright tools but aria-refs.mjs not found');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all skills in the project.
 * @param {string} [projectDir]
 * @returns {Array<{ skill: string, valid: boolean, errors: string[], warnings: string[] }>}
 */
export function validateAllSkills(projectDir) {
  const dir = projectDir || process.cwd();
  const skillsDir = join(dir, SKILLS_DIR);

  if (!existsSync(skillsDir)) return [];

  const results = [];
  const entries = readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = join(skillsDir, entry.name);
    const skillFile = join(skillDir, 'SKILL.md');
    const tmplFile = join(skillDir, 'SKILL.md.tmpl');

    const target = existsSync(skillFile) ? skillFile : existsSync(tmplFile) ? tmplFile : null;
    if (!target) continue;

    const result = validateSkill(target);
    results.push({ skill: entry.name, ...result });
  }

  return results.sort((a, b) => a.skill.localeCompare(b.skill));
}

/**
 * Check template freshness (generated vs template).
 * @param {string} [projectDir]
 * @returns {Array<{ skill: string, fresh: boolean, reason?: string }>}
 */
export function checkFreshness(projectDir) {
  const dir = projectDir || process.cwd();
  const skillsDir = join(dir, SKILLS_DIR);
  const results = [];

  if (!existsSync(skillsDir)) return results;

  const entries = readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const tmpl = join(skillsDir, entry.name, 'SKILL.md.tmpl');
    const generated = join(skillsDir, entry.name, 'SKILL.md');

    if (!existsSync(tmpl)) continue; // No template, skip

    if (!existsSync(generated)) {
      results.push({ skill: entry.name, fresh: false, reason: 'SKILL.md missing (template exists)' });
      continue;
    }

    // Compare mtime
    const tmplMtime = statSync(tmpl).mtimeMs;
    const genMtime = statSync(generated).mtimeMs;

    if (tmplMtime > genMtime) {
      results.push({ skill: entry.name, fresh: false, reason: 'Template newer than generated file' });
    } else {
      results.push({ skill: entry.name, fresh: true });
    }
  }

  return results;
}

/**
 * Format validation results for display.
 * @param {Array} results
 * @returns {string}
 */
export function formatValidation(results) {
  const lines = ['Skill Validation:'];
  let errors = 0;
  let warnings = 0;

  for (const r of results) {
    const icon = r.valid ? '✓' : '✗';
    const issues = [...r.errors.map(e => `ERROR: ${e}`), ...r.warnings.map(w => `WARN: ${w}`)];
    lines.push(`  ${icon} ${r.skill}${issues.length > 0 ? ':' : ''}`);
    for (const issue of issues) {
      lines.push(`    ${issue}`);
    }
    errors += r.errors.length;
    warnings += r.warnings.length;
  }

  lines.push(`\n  Total: ${results.length} skills, ${errors} errors, ${warnings} warnings`);
  return lines.join('\n');
}
