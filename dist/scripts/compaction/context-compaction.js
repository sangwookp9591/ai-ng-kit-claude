/**
 * aing Context Compaction Strategy v0.4.0
 * Intelligent context preservation during compaction.
 * Harness Engineering: Inform axis — survive context window limits.
 * @module scripts/compaction/context-compaction
 */
import { readStateOrDefault } from '../core/state.js';
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { estimateTokens } from '../core/context-budget.js';
import { getProgressSummary } from '../guardrail/progress-tracker.js';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
const log = createLogger('compaction');
/**
 * Priority levels for context preservation.
 * Higher number = higher priority = preserved first.
 */
const PRIORITY = {
    PDCA_STATE: 100, // Always preserve — PDCA progress
    PROGRESS: 90, // Session continuity
    SAFETY_INVARIANTS: 85, // Guardrail state
    EVIDENCE_CHAIN: 80, // Verification evidence
    PROJECT_MEMORY: 70, // Learned patterns
    ROUTING_HISTORY: 40, // Nice to have
    TRACE_SUMMARY: 30 // Debug info
};
/**
 * Build compaction context — what to preserve when context is compressed.
 */
export function buildCompactionContext(projectDir) {
    const dir = projectDir || process.cwd();
    const maxTokens = getConfig('context.maxCompactionTokens', 1500);
    const sections = [];
    // Gather all preservable sections with priorities
    const pdcaState = readStateOrDefault(join(dir, '.aing', 'state', 'pdca-status.json'), null);
    if (pdcaState && pdcaState.activeFeature) {
        const feat = pdcaState.features?.[pdcaState.activeFeature];
        sections.push({
            priority: PRIORITY.PDCA_STATE,
            label: 'PDCA State',
            content: `PDCA: ${pdcaState.activeFeature} — ${feat?.currentStage || 'unknown'} (iter ${feat?.iteration || 0})`
        });
    }
    // Progress summary
    const progress = getProgressSummary(dir);
    if (progress) {
        sections.push({
            priority: PRIORITY.PROGRESS,
            label: 'Progress',
            content: progress
        });
    }
    // Safety invariant tracker
    const tracker = readStateOrDefault(join(dir, '.aing', 'state', 'invariants-tracker.json'), null);
    if (tracker && tracker.steps > 0) {
        sections.push({
            priority: PRIORITY.SAFETY_INVARIANTS,
            label: 'Safety',
            content: `Steps: ${tracker.steps}, Files changed: ${tracker.fileChanges}, Errors: ${tracker.errors}`
        });
    }
    // Evidence chain (latest)
    try {
        const stateDir = join(dir, '.aing', 'state');
        const files = readdirSync(stateDir).filter((f) => f.startsWith('evidence-'));
        for (const f of files.slice(-2)) {
            const data = readStateOrDefault(join(stateDir, f), null);
            if (data && data.verdict) {
                sections.push({
                    priority: PRIORITY.EVIDENCE_CHAIN,
                    label: `Evidence (${data.feature})`,
                    content: `${data.feature}: ${data.verdict} — ${data.entries?.length || 0} evidence items`
                });
            }
        }
    }
    catch (_) { /* best effort */ }
    // Project memory summary
    const memory = readStateOrDefault(join(dir, '.aing', 'project-memory.json'), null);
    if (memory) {
        const parts = [];
        if (memory.patterns?.length)
            parts.push(`${memory.patterns.length} patterns`);
        if (memory.pitfalls?.length)
            parts.push(`${memory.pitfalls.length} pitfalls`);
        if (Object.keys(memory.techStack || {}).length)
            parts.push(`tech: ${Object.keys(memory.techStack).join(', ')}`);
        if (parts.length > 0) {
            sections.push({
                priority: PRIORITY.PROJECT_MEMORY,
                label: 'Memory',
                content: `Project memory: ${parts.join(', ')}`
            });
        }
    }
    // Sort by priority (highest first)
    sections.sort((a, b) => b.priority - a.priority);
    // Build context within token budget
    const preserved = [];
    const dropped = [];
    let totalContent = '';
    for (const section of sections) {
        const candidate = totalContent + `\n[${section.label}] ${section.content}`;
        if (estimateTokens(candidate) <= maxTokens) {
            totalContent = candidate;
            preserved.push(section.label);
        }
        else {
            dropped.push(section.label);
        }
    }
    const context = totalContent.trim();
    const tokens = estimateTokens(context);
    log.info('Compaction context built', { preserved, dropped, tokens: `~${tokens}` });
    return { context, preserved, dropped, tokens };
}
/**
 * Generate the compaction injection string for PreCompact hook.
 */
export function generateCompactionInjection(projectDir) {
    const { context, preserved, dropped } = buildCompactionContext(projectDir);
    if (!context)
        return '';
    const lines = [
        '[aing] Context preserved across compaction:',
        context,
        '',
        `Preserved: ${preserved.join(', ')}`,
    ];
    if (dropped.length > 0) {
        lines.push(`Dropped (budget): ${dropped.join(', ')}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=context-compaction.js.map