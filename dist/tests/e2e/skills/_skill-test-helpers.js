/**
 * Shared helpers for skill E2E tests.
 *
 * Provides frontmatter parsing, agent discovery, scoring,
 * and reusable assertion helpers.
 *
 * @module tests/e2e/skills/_skill-test-helpers
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const PROJECT_DIR = join(import.meta.dirname, '..', '..', '..');
export const AGENTS_DIR = join(PROJECT_DIR, 'agents');
export const SKILLS_DIR = join(PROJECT_DIR, 'skills');
// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------
export function parseFrontmatter(content) {
    if (!content.startsWith('---'))
        return { frontmatter: null, body: content };
    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1)
        return { frontmatter: null, body: content };
    const raw = content.slice(3, endIndex).trim();
    const body = content.slice(endIndex + 3).trim();
    const fm = {};
    const lines = raw.split('\n');
    let i = 0;
    while (i < lines.length) {
        const trimmed = lines[i].trim();
        i++;
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1)
            continue;
        const key = trimmed.slice(0, colonIdx).trim();
        let value = trimmed.slice(colonIdx + 1).trim();
        // Handle YAML literal block scalar (|)
        if (value === '|' || value === '|-') {
            const blockLines = [];
            while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
                blockLines.push(lines[i].replace(/^ {2}/, ''));
                i++;
            }
            fm[key] = blockLines.join('\n').trim();
            continue;
        }
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                fm[key] = JSON.parse(value);
            }
            catch {
                fm[key] = value;
            }
        }
        else {
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            fm[key] = value;
        }
    }
    return { frontmatter: fm, body };
}
// ---------------------------------------------------------------------------
// Agent discovery
// ---------------------------------------------------------------------------
export function getAgentNames() {
    if (!existsSync(AGENTS_DIR))
        return [];
    return readdirSync(AGENTS_DIR)
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', '').toLowerCase());
}
// ---------------------------------------------------------------------------
// Skill loader
// ---------------------------------------------------------------------------
export function loadSkill(skillName) {
    const skillPath = join(SKILLS_DIR, skillName, 'SKILL.md');
    assert.ok(existsSync(skillPath), `SKILL.md not found at ${skillPath}`);
    const content = readFileSync(skillPath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const agents = getAgentNames();
    return { content, frontmatter, body, agents, skillPath };
}
// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
export function scoreSkill(parsed) {
    const { content, frontmatter: fm, body } = parsed;
    let score = 0;
    // Frontmatter presence (10pts)
    if (fm)
        score += 10;
    // Name field (10pts)
    if (fm?.name)
        score += 10;
    // Description field (10pts)
    if (fm?.description)
        score += 10;
    // Triggers field (10pts)
    if (fm?.triggers && Array.isArray(fm.triggers) && fm.triggers.length > 0)
        score += 10;
    // Has sections (10pts)
    const headings = body.split('\n').filter(l => /^##\s/.test(l));
    if (headings.length >= 2)
        score += 10;
    // Has steps/phases or structured workflow (10pts)
    if (/^##\s+(Phase|Step)\s+\d+/im.test(body) || /^###\s+Step\s+\d+/im.test(body) || headings.length >= 3)
        score += 10;
    // No unresolved placeholders (10pts)
    if (!/\{\{[A-Z_]+\}\}/.test(content))
        score += 10;
    // Content length adequate (10pts)
    const nonEmpty = content.split('\n').filter(l => l.trim().length > 0).length;
    if (nonEmpty >= 15)
        score += 10;
    // Agent or tool references exist (10pts)
    if (/agent|Agent|spawn|delegate|subagent|tool|Tool/i.test(body))
        score += 10;
    // Error handling section (10pts)
    if (/error|failure|fallback|retry|abort|cancel|timeout|fail|exception/i.test(body))
        score += 10;
    return Math.min(100, score);
}
// ---------------------------------------------------------------------------
// Reusable assertion helpers
// ---------------------------------------------------------------------------
export function assertFrontmatterValid(fm) {
    assert.ok(fm !== null, 'SKILL.md must start with YAML frontmatter (---)');
}
export function assertHasName(fm, expectedName) {
    assert.ok(fm.name, 'Frontmatter must include a non-empty "name" field');
    assert.strictEqual(fm.name, expectedName, `Name should be "${expectedName}"`);
}
export function assertHasDescription(fm, minLength = 5) {
    assert.ok(fm.description, 'Frontmatter must include a non-empty "description" field');
    // Trim the description since YAML literal blocks may have trailing whitespace
    const desc = String(fm.description).trim();
    assert.ok(desc.length >= minLength, `Description should be at least ${minLength} characters (got ${desc.length})`);
}
export function assertHasTriggers(fm) {
    assert.ok(fm.triggers, 'Frontmatter should include "triggers"');
    assert.ok(Array.isArray(fm.triggers), 'Triggers should be an array');
    assert.ok(fm.triggers.length > 0, 'Triggers should not be empty');
}
export function assertNoPlaceholders(content) {
    const placeholders = content.match(/\{\{[A-Z_]+\}\}/g);
    assert.strictEqual(placeholders, null, `Found unresolved placeholders: ${placeholders?.join(', ')}`);
}
export function assertHasErrorHandling(body) {
    const hasErrorHandling = /error|failure|fallback|retry|abort|cancel|timeout|fail|exception/i.test(body);
    assert.ok(hasErrorHandling, 'Skill should describe error handling or failure scenarios');
}
export function assertPhaseStructure(body) {
    const headings = body.split('\n').filter(l => /^##\s/.test(l));
    assert.ok(headings.length >= 2, `Should have at least 2 sections (found ${headings.length})`);
}
export function assertPhasesHaveContent(body) {
    const lines = body.split('\n');
    const phasePattern = /^##\s+(Phase|Step)\s+\d+/i;
    let currentPhase = null;
    let phaseContentLines = 0;
    for (const line of lines) {
        if (phasePattern.test(line)) {
            if (currentPhase !== null) {
                assert.ok(phaseContentLines >= 2, `"${currentPhase}" should have substantive content (found ${phaseContentLines} lines)`);
            }
            currentPhase = line.replace(/^#+\s*/, '').trim();
            phaseContentLines = 0;
        }
        else if (currentPhase && line.trim().length > 0) {
            phaseContentLines++;
        }
    }
    // Check last phase
    if (currentPhase !== null) {
        assert.ok(phaseContentLines >= 2, `"${currentPhase}" should have substantive content (found ${phaseContentLines} lines)`);
    }
}
export function assertReferencesAgents(body) {
    const hasAgentRef = /agent|Agent|spawn|delegate|subagent/i.test(body);
    assert.ok(hasAgentRef, 'Skill should reference agents');
}
export function assertReferencesTools(body) {
    const knownTools = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'TaskCreate', 'TeamCreate', 'SendMessage', 'mcp__'];
    const toolRefs = knownTools.filter(t => body.includes(t));
    assert.ok(toolRefs.length > 0 || /tool|Tool|mcp/i.test(body), 'Should reference tools or describe tool usage');
}
export function assertMinScore(parsed, threshold = 70) {
    const score = scoreSkill(parsed);
    assert.ok(score >= threshold, `Completeness score ${score}/100 is below threshold (${threshold})`);
}
//# sourceMappingURL=_skill-test-helpers.js.map