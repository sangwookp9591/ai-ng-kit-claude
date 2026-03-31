/**
 * aing Dry-Run Mode v0.3.0
 * Preview changes before execution.
 * Harness Engineering: Verify axis — human-in-the-loop approval.
 * @module scripts/guardrail/dry-run
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
const log = createLogger('dry-run');
function getDryRunPath(projectDir) {
    return join(projectDir || process.cwd(), '.aing', 'state', 'dry-run-queue.json');
}
/**
 * Check if dry-run mode is active.
 */
export function isDryRunActive(_projectDir) {
    return getConfig('guardrail.dryRun', false);
}
/**
 * Queue a pending change for dry-run preview.
 */
export function queueChange(change, projectDir) {
    const queuePath = getDryRunPath(projectDir);
    const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] });
    queue.pending.push({
        id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...change,
        queuedAt: new Date().toISOString(),
        status: 'pending'
    });
    writeState(queuePath, queue);
    log.info(`Change queued for dry-run review`, { type: change.type, target: change.target });
    return { queued: true, queueSize: queue.pending.length };
}
/**
 * Get all pending changes for preview.
 */
export function getPendingChanges(projectDir) {
    const queuePath = getDryRunPath(projectDir);
    const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] });
    return queue.pending;
}
/**
 * Format pending changes as a preview summary.
 */
export function formatPreview(projectDir) {
    const pending = getPendingChanges(projectDir);
    if (pending.length === 0)
        return '[aing Dry-Run] 대기 중인 변경사항이 없습니다.';
    const lines = [
        '[aing Dry-Run] 다음 변경사항이 대기 중입니다:',
        ''
    ];
    const icons = { write: '📝', edit: '✏️', bash: '⚡', delete: '🗑️' };
    for (let i = 0; i < pending.length; i++) {
        const c = pending[i];
        const icon = icons[c.type] || '📋';
        lines.push(`  ${i + 1}. ${icon} [${c.type.toUpperCase()}] ${c.target}`);
        if (c.description) {
            lines.push(`     ${c.description}`);
        }
    }
    lines.push('');
    lines.push('진행하려면 "/aing approve", 취소하려면 "/aing reject"를 실행하세요.');
    return lines.join('\n');
}
/**
 * Approve all pending changes.
 */
export function approveAll(projectDir) {
    const queuePath = getDryRunPath(projectDir);
    const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] });
    const count = queue.pending.length;
    queue.approved.push(...queue.pending.map(c => ({ ...c, status: 'approved', approvedAt: new Date().toISOString() })));
    queue.pending = [];
    writeState(queuePath, queue);
    log.info(`${count} changes approved`);
    return { approved: count };
}
/**
 * Reject all pending changes.
 */
export function rejectAll(projectDir) {
    const queuePath = getDryRunPath(projectDir);
    const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] });
    const count = queue.pending.length;
    queue.rejected.push(...queue.pending.map(c => ({ ...c, status: 'rejected', rejectedAt: new Date().toISOString() })));
    queue.pending = [];
    writeState(queuePath, queue);
    log.info(`${count} changes rejected`);
    return { rejected: count };
}
/**
 * Clear the dry-run queue.
 */
export function clearQueue(projectDir) {
    const queuePath = getDryRunPath(projectDir);
    writeState(queuePath, { pending: [], approved: [], rejected: [] });
}
//# sourceMappingURL=dry-run.js.map