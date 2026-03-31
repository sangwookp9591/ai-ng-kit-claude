/**
 * aing PreCompact Hook Handler v0.4.0
 * Intelligent context preservation + PDCA snapshot.
 */
import { readState, writeState, updateState } from '../scripts/core/state.js';
import { createLogger } from '../scripts/core/logger.js';
import { generateCompactionInjection } from '../scripts/compaction/context-compaction.js';
import { getBudgetStatus } from '../scripts/core/context-budget.js';
import { getConfig } from '../scripts/core/config.js';
import { writeWorking } from '../scripts/memory/notepad.js';
import { join } from 'node:path';
import { readdirSync, unlinkSync } from 'node:fs';
const log = createLogger('pre-compact');
try {
    const projectDir = process.env.PROJECT_DIR || process.cwd();
    const stateFile = join(projectDir, '.aing', 'state', 'pdca-status.json');
    const snapshotDir = join(projectDir, '.aing', 'snapshots');
    // Save PDCA snapshot
    const stateResult = readState(stateFile);
    if (stateResult.ok) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const snapshotFile = join(snapshotDir, `snapshot-${ts}.json`);
        writeState(snapshotFile, {
            savedAt: new Date().toISOString(),
            state: stateResult.data
        });
        // Keep only last 10 snapshots
        try {
            const snapshots = readdirSync(snapshotDir)
                .filter((f) => f.startsWith('snapshot-') && f.endsWith('.json'))
                .sort();
            if (snapshots.length > 10) {
                for (const file of snapshots.slice(0, snapshots.length - 10)) {
                    unlinkSync(join(snapshotDir, file));
                }
            }
        }
        catch (_) { /* best effort */ }
    }
    // Track compaction count in session state
    const compactionStatePath = join(projectDir, '.aing', 'state', 'compaction-session.json');
    const defaultCompactionState = {
        compactionCount: 0,
        lastCompactionAt: '',
        budgetWarnings: 0,
    };
    let compactionCount = 0;
    updateState(compactionStatePath, defaultCompactionState, (data) => {
        const state = data;
        state.compactionCount = (state.compactionCount || 0) + 1;
        state.lastCompactionAt = new Date().toISOString();
        compactionCount = state.compactionCount;
        return state;
    });
    // Check context budget usage — warn if > 80%
    const budget = getBudgetStatus();
    const maxTokens = getConfig('context.maxSessionStartTokens', 2000);
    const budgetRatio = maxTokens > 0 ? budget.total / maxTokens : 0;
    const WARN_THRESHOLD = 0.8;
    const budgetLines = [];
    if (budgetRatio > WARN_THRESHOLD) {
        const pct = Math.round(budgetRatio * 100);
        budgetLines.push(`[aing:compaction] Context budget at ~${pct}% (~${budget.total} / ${maxTokens} tokens). Compaction recommended.`);
        budgetLines.push(`Injection sources: ${budget.injections.map(i => i.source).join(', ') || 'none'}`);
        budgetLines.push(`Compaction #${compactionCount} triggered.`);
        // Track budget warning in state
        updateState(compactionStatePath, defaultCompactionState, (data) => {
            const state = data;
            state.budgetWarnings = (state.budgetWarnings || 0) + 1;
            return state;
        });
        log.warn('Context budget high on compaction', { pct, total: budget.total, maxTokens });
    }
    else {
        log.info('Compaction triggered', { compactionCount, budgetPct: Math.round(budgetRatio * 100) });
    }
    // Save current working context to notepad working tier (survives compaction)
    try {
        const injection_preview = generateCompactionInjection(projectDir);
        if (injection_preview) {
            const summary = `[compaction #${compactionCount}] ${injection_preview.slice(0, 300)}`;
            await writeWorking(summary, projectDir);
        }
    }
    catch (_e) { /* notepad write is best-effort */ }
    // Build intelligent compaction context (priority-based preservation)
    const injection = generateCompactionInjection(projectDir);
    const parts = [];
    if (budgetLines.length > 0)
        parts.push(budgetLines.join('\n'));
    if (injection)
        parts.push(injection);
    if (parts.length > 0) {
        process.stdout.write(JSON.stringify({
            hookSpecificOutput: { additionalContext: parts.join('\n\n') }
        }));
        log.info('Compaction context injected', { hasBudgetWarning: budgetLines.length > 0 });
    }
    else {
        process.stdout.write(JSON.stringify({}));
    }
}
catch (err) {
    log.error('Pre-compact failed', { error: err.message });
    process.stdout.write(JSON.stringify({}));
}
//# sourceMappingURL=pre-compact.js.map