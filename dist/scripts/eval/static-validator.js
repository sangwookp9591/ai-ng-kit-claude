/**
 * aing Static Validator — Tier 1 Skill Quality Checks
 *
 * Validates SKILL.md files for structural correctness:
 * - Frontmatter required fields
 * - No broken placeholder references
 * - Tool allowlist vs actual usage
 * - Phase completeness
 * - Agent reference validity
 *
 * Zero cost, runs in <5s.
 *
 * @module scripts/eval/static-validator
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('static-validator');
// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------
function parseFrontmatter(content) {
    if (!content.startsWith('---')) {
        return { frontmatter: null, body: content };
    }
    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
        return { frontmatter: null, body: content };
    }
    const raw = content.slice(3, endIndex).trim();
    const body = content.slice(endIndex + 3).trim();
    const fm = {};
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1)
            continue;
        const key = trimmed.slice(0, colonIdx).trim();
        let value = trimmed.slice(colonIdx + 1).trim();
        // Handle YAML arrays: ["a", "b", "c"]
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                fm[key] = JSON.parse(value);
            }
            catch {
                fm[key] = value;
            }
        }
        else {
            // Strip surrounding quotes
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            fm[key] = value;
        }
    }
    return { frontmatter: fm, body };
}
// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------
function validateFrontmatterFields(fm, findings) {
    if (!fm) {
        findings.push({
            rule: 'frontmatter-missing',
            message: 'SKILL.md must start with YAML frontmatter (---)',
            severity: 'error',
        });
        return;
    }
    if (!fm.name || String(fm.name).trim().length === 0) {
        findings.push({
            rule: 'frontmatter-name',
            message: 'Frontmatter must include a non-empty "name" field',
            severity: 'error',
        });
    }
    if (!fm.description || String(fm.description).trim().length === 0) {
        findings.push({
            rule: 'frontmatter-description',
            message: 'Frontmatter must include a non-empty "description" field',
            severity: 'error',
        });
    }
    if (!fm.triggers) {
        findings.push({
            rule: 'frontmatter-triggers',
            message: 'Frontmatter should include "triggers" for auto-detection',
            severity: 'warning',
        });
    }
}
function validateNoUnresolvedPlaceholders(content, findings) {
    const lines = content.split('\n');
    const placeholderPattern = /\{\{[A-Z_]+\}\}/g;
    for (let i = 0; i < lines.length; i++) {
        const matches = lines[i].match(placeholderPattern);
        if (matches) {
            for (const match of matches) {
                findings.push({
                    rule: 'unresolved-placeholder',
                    message: `Unresolved placeholder: ${match}`,
                    severity: 'error',
                    line: i + 1,
                });
            }
        }
    }
}
function validateToolAllowlist(fm, body, findings) {
    if (!fm?.tools || !Array.isArray(fm.tools))
        return;
    const declaredTools = new Set(fm.tools);
    // Known tool patterns referenced in skill bodies
    const toolPatterns = {
        Read: /\bRead\b/,
        Write: /\bWrite\b/,
        Edit: /\bEdit\b/,
        Bash: /\bBash\b/,
        Glob: /\bGlob\b/,
        Grep: /\bGrep\b/,
        WebFetch: /\bWebFetch\b/,
        WebSearch: /\bWebSearch\b/,
        TaskCreate: /\bTaskCreate\b/,
        TeamCreate: /\bTeamCreate\b/,
        SendMessage: /\bSendMessage\b/,
    };
    // Check each declared tool is actually referenced
    for (const tool of declaredTools) {
        const pattern = toolPatterns[tool];
        if (pattern && !pattern.test(body)) {
            findings.push({
                rule: 'tool-declared-unused',
                message: `Tool "${tool}" is declared in frontmatter but not referenced in body`,
                severity: 'warning',
            });
        }
    }
    // Check for tools used in body but not declared
    for (const [tool, pattern] of Object.entries(toolPatterns)) {
        if (pattern.test(body) && !declaredTools.has(tool)) {
            findings.push({
                rule: 'tool-used-undeclared',
                message: `Tool "${tool}" is used in body but not declared in frontmatter tools`,
                severity: 'info',
            });
        }
    }
}
function validatePhaseCompleteness(body, findings) {
    const lines = body.split('\n');
    const phasePattern = /^##\s+(Phase|Step)\s+\d+/i;
    let currentPhase = null;
    let currentPhaseStart = 0;
    let phaseContentLines = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (phasePattern.test(line)) {
            // Flush previous phase
            if (currentPhase && phaseContentLines < 2) {
                findings.push({
                    rule: 'empty-phase',
                    message: `Phase "${currentPhase}" has no substantive content`,
                    severity: 'error',
                    line: currentPhaseStart + 1,
                });
            }
            currentPhase = line.replace(/^#+\s*/, '').trim();
            currentPhaseStart = i;
            phaseContentLines = 0;
        }
        else if (currentPhase && line.trim().length > 0) {
            phaseContentLines++;
        }
    }
    // Check last phase
    if (currentPhase && phaseContentLines < 2) {
        findings.push({
            rule: 'empty-phase',
            message: `Phase "${currentPhase}" has no substantive content`,
            severity: 'error',
            line: currentPhaseStart + 1,
        });
    }
}
function validateAgentReferences(body, projectDir, findings) {
    // Collect known agent names from agents/ directory
    const agentsDir = join(projectDir, 'agents');
    const knownAgents = new Set();
    if (existsSync(agentsDir)) {
        const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
        for (const f of files) {
            knownAgents.add(f.replace('.md', '').toLowerCase());
        }
    }
    if (knownAgents.size === 0)
        return;
    // Look for agent references: @AgentName, spawn AgentName
    const agentRefPattern = /@(\w+)|(?:spawn|delegate to|use)\s+(\w+)/gi;
    let match;
    while ((match = agentRefPattern.exec(body)) !== null) {
        const ref = (match[1] || match[2]).toLowerCase();
        // Skip common non-agent words
        if (['the', 'a', 'an', 'it', 'this', 'that', 'cc', 'claude', 'user'].includes(ref))
            continue;
        if (!knownAgents.has(ref)) {
            findings.push({
                rule: 'agent-ref-unknown',
                message: `Agent reference "${ref}" not found in agents/ directory`,
                severity: 'info',
            });
        }
    }
}
function validateContentQuality(content, findings) {
    const lines = content.split('\n');
    const contentLines = lines.filter(l => l.trim().length > 0 && !l.startsWith('---'));
    if (contentLines.length < 5) {
        findings.push({
            rule: 'content-too-short',
            message: `Skill has only ${contentLines.length} non-empty lines (minimum 5)`,
            severity: 'error',
        });
    }
    else if (contentLines.length < 10) {
        findings.push({
            rule: 'content-sparse',
            message: `Skill has only ${contentLines.length} non-empty lines (recommend 10+)`,
            severity: 'warning',
        });
    }
    // Check for headings structure
    const headings = lines.filter(l => /^##\s/.test(l));
    if (headings.length === 0) {
        findings.push({
            rule: 'no-sections',
            message: 'Skill has no ## sections -- consider adding structure',
            severity: 'warning',
        });
    }
    // AI slop detection
    const slopPatterns = [
        { pattern: /\bdelve\b/i, label: 'delve' },
        { pattern: /\bcrucial\b/i, label: 'crucial' },
        { pattern: /\brobust\b/i, label: 'robust' },
        { pattern: /\beverything you need\b/i, label: 'everything you need' },
        { pattern: /\bnuanced\b/i, label: 'nuanced' },
        { pattern: /\bleverage\b/i, label: 'leverage' },
        { pattern: /\bsynergy\b/i, label: 'synergy' },
    ];
    for (const { pattern, label } of slopPatterns) {
        if (pattern.test(content)) {
            findings.push({
                rule: 'ai-slop',
                message: `AI slop term detected: "${label}"`,
                severity: 'info',
            });
        }
    }
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Run all static validation checks on a skill.
 * Returns an array of findings with severity levels.
 */
export function runStaticValidation(skill, projectDir) {
    const dir = projectDir || process.cwd();
    const skillPath = join(dir, 'skills', skill, 'SKILL.md');
    const findings = [];
    if (!existsSync(skillPath)) {
        findings.push({
            rule: 'skill-not-found',
            message: `SKILL.md not found at ${skillPath}`,
            severity: 'error',
        });
        return findings;
    }
    let content;
    try {
        content = readFileSync(skillPath, 'utf-8');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        findings.push({
            rule: 'read-error',
            message: `Failed to read SKILL.md: ${message}`,
            severity: 'error',
        });
        return findings;
    }
    const { frontmatter, body } = parseFrontmatter(content);
    // Run all validation rules
    validateFrontmatterFields(frontmatter, findings);
    validateNoUnresolvedPlaceholders(content, findings);
    validateToolAllowlist(frontmatter, body, findings);
    validatePhaseCompleteness(body, findings);
    validateAgentReferences(body, dir, findings);
    validateContentQuality(content, findings);
    log.info(`Static validation for "${skill}": ${findings.length} findings`);
    return findings;
}
/**
 * Validate a raw SKILL.md content string (for testing without filesystem).
 */
export function validateSkillContent(content, agentNames) {
    const findings = [];
    const { frontmatter, body } = parseFrontmatter(content);
    validateFrontmatterFields(frontmatter, findings);
    validateNoUnresolvedPlaceholders(content, findings);
    validatePhaseCompleteness(body, findings);
    validateContentQuality(content, findings);
    // Inline agent check if names provided
    if (agentNames && agentNames.length > 0) {
        const knownSet = new Set(agentNames.map(n => n.toLowerCase()));
        const agentRefPattern = /@(\w+)|(?:spawn|delegate to|use)\s+(\w+)/gi;
        let match;
        while ((match = agentRefPattern.exec(body)) !== null) {
            const ref = (match[1] || match[2]).toLowerCase();
            if (['the', 'a', 'an', 'it', 'this', 'that', 'cc', 'claude', 'user'].includes(ref))
                continue;
            if (!knownSet.has(ref)) {
                findings.push({
                    rule: 'agent-ref-unknown',
                    message: `Agent reference "${ref}" not found`,
                    severity: 'info',
                });
            }
        }
    }
    return findings;
}
//# sourceMappingURL=static-validator.js.map