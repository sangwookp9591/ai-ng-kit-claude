/**
 * aing Scope Drift Detector
 * Compares actual diff against stated plan/goals.
 * @module scripts/review/scope-drift
 */
import { createLogger } from '../core/logger.js';
const log = createLogger('scope-drift');
/**
 * Analyze scope drift between plan and actual changes.
 */
export function analyzeDrift(plan, diff) {
    if (!plan || !diff) {
        return { driftScore: 0, inScope: [], outOfScope: [], missed: [] };
    }
    const inScope = [];
    const outOfScope = [];
    const missed = [];
    // Files matching plan scope
    for (const file of (diff.files || [])) {
        const matchesScope = (plan.scope || []).some(s => file.includes(s) || matchGlob(file, s));
        if (matchesScope) {
            inScope.push(file);
        }
        else {
            outOfScope.push(file);
        }
    }
    // Goals not addressed
    for (const goal of (plan.goals || [])) {
        const addressed = (diff.files || []).some(f => f.toLowerCase().includes(goal.toLowerCase().split(' ')[0]));
        if (!addressed) {
            missed.push(goal);
        }
    }
    const totalFiles = (diff.files || []).length;
    const driftScore = totalFiles > 0
        ? Math.round((outOfScope.length / totalFiles) * 100)
        : 0;
    if (driftScore > 30) {
        log.warn(`High scope drift: ${driftScore}% of files outside plan scope`);
    }
    return { driftScore, inScope, outOfScope, missed };
}
/**
 * Format drift analysis for display.
 */
export function formatDrift(analysis) {
    const lines = [`Scope Drift: ${analysis.driftScore}%`];
    if (analysis.outOfScope.length > 0) {
        lines.push(`\nOut of Scope (${analysis.outOfScope.length} files):`);
        for (const f of analysis.outOfScope.slice(0, 10)) {
            lines.push(`  - ${f}`);
        }
    }
    if (analysis.missed.length > 0) {
        lines.push(`\nMissed Goals (${analysis.missed.length}):`);
        for (const g of analysis.missed) {
            lines.push(`  - ${g}`);
        }
    }
    if (analysis.driftScore === 0 && analysis.missed.length === 0) {
        lines.push('No drift detected. All changes align with plan.');
    }
    return lines.join('\n');
}
/**
 * Three-way scope comparison.
 * Compares: stated intent (TODOS/PR) vs plan file vs actual diff.
 */
export function threeWayComparison(context) {
    // Extract intent from TODOS, PR description, and commit messages
    const intent = extractIntent(context.todosContent, context.prDescription, context.commitMessages);
    // Extract delivered items from changed files
    const delivered = (context.changedFiles || []).map(f => {
        const parts = f.split('/');
        return parts.length > 1 ? parts.slice(0, 2).join('/') : f;
    });
    const uniqueDelivered = [...new Set(delivered)];
    // Scope creep: files changed that don't match any intent
    const scopeCreep = uniqueDelivered.filter(d => !intent.some(i => matchesAnyWord(d, i)));
    // Missing: intent items not reflected in any changed file
    const missing = intent.filter(i => !uniqueDelivered.some(d => matchesAnyWord(d, i)));
    let verdict = 'CLEAN';
    if (scopeCreep.length > 0 && missing.length > 0) {
        verdict = 'DRIFT DETECTED + REQUIREMENTS MISSING';
    }
    else if (scopeCreep.length > 0) {
        verdict = 'DRIFT DETECTED';
    }
    else if (missing.length > 0) {
        verdict = 'REQUIREMENTS MISSING';
    }
    return { intent, delivered: uniqueDelivered, scopeCreep, missing, verdict };
}
/**
 * Extract intent from various sources.
 */
function extractIntent(todos, prDesc, commits) {
    const items = [];
    // From TODOS.md: look for checkbox items
    if (todos) {
        const matches = todos.match(/- \[[ x]\] (.+)/g) || [];
        items.push(...matches.map(m => m.replace(/- \[[ x]\] /, '')));
    }
    // From PR description: look for bullet points
    if (prDesc) {
        const matches = prDesc.match(/^[-*] (.+)/gm) || [];
        items.push(...matches.map(m => m.replace(/^[-*] /, '')));
    }
    // From commit messages: extract conventional commit descriptions
    if (commits) {
        for (const msg of commits) {
            const match = msg.match(/^\w+(?:\([^)]+\))?\s*:\s*(.+)/);
            if (match)
                items.push(match[1]);
        }
    }
    return [...new Set(items)];
}
/**
 * Format three-way comparison for display.
 */
export function formatThreeWay(result) {
    const lines = [`Scope Check: [${result.verdict}]`];
    if (result.intent.length > 0) {
        lines.push(`\nIntent (${result.intent.length} items):`);
        for (const i of result.intent.slice(0, 8))
            lines.push(`  ▸ ${i}`);
    }
    if (result.scopeCreep.length > 0) {
        lines.push(`\nScope Creep (${result.scopeCreep.length} areas):`);
        for (const s of result.scopeCreep.slice(0, 5))
            lines.push(`  ⚠ ${s}`);
    }
    if (result.missing.length > 0) {
        lines.push(`\nMissing Requirements (${result.missing.length}):`);
        for (const m of result.missing.slice(0, 5))
            lines.push(`  ✗ ${m}`);
    }
    if (result.verdict === 'CLEAN') {
        lines.push('\nAll changes align with stated intent.');
    }
    return lines.join('\n');
}
/**
 * Check if path matches any significant word from intent.
 */
function matchesAnyWord(path, intent) {
    const words = intent.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const lowerPath = path.toLowerCase();
    return words.some(word => lowerPath.includes(word));
}
function matchGlob(str, pattern) {
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars first
        .replace(/\*/g, '.*') // Then handle wildcards
        .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`).test(str);
}
//# sourceMappingURL=scope-drift.js.map