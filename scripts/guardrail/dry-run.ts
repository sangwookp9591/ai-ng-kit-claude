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

interface Change {
  type: 'write' | 'edit' | 'bash' | 'delete';
  target: string;
  description?: string;
}

interface QueuedChange extends Change {
  id: string;
  queuedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedAt?: string;
}

interface DryRunQueue {
  pending: QueuedChange[];
  approved: QueuedChange[];
  rejected: QueuedChange[];
}

function getDryRunPath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.aing', 'state', 'dry-run-queue.json');
}

/**
 * Check if dry-run mode is active.
 */
export function isDryRunActive(_projectDir?: string): boolean {
  return getConfig('guardrail.dryRun', false) as boolean;
}

/**
 * Queue a pending change for dry-run preview.
 */
export function queueChange(change: Change, projectDir?: string): { queued: boolean; queueSize: number } {
  const queuePath = getDryRunPath(projectDir);
  const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] }) as DryRunQueue;

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
export function getPendingChanges(projectDir?: string): QueuedChange[] {
  const queuePath = getDryRunPath(projectDir);
  const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] }) as DryRunQueue;
  return queue.pending;
}

/**
 * Format pending changes as a preview summary.
 */
export function formatPreview(projectDir?: string): string {
  const pending = getPendingChanges(projectDir);
  if (pending.length === 0) return '[aing Dry-Run] 대기 중인 변경사항이 없습니다.';

  const lines: string[] = [
    '[aing Dry-Run] 다음 변경사항이 대기 중입니다:',
    ''
  ];

  const icons: Record<string, string> = { write: '📝', edit: '✏️', bash: '⚡', delete: '🗑️' };

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
export function approveAll(projectDir?: string): { approved: number } {
  const queuePath = getDryRunPath(projectDir);
  const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] }) as DryRunQueue;

  const count = queue.pending.length;
  queue.approved.push(...queue.pending.map(c => ({ ...c, status: 'approved' as const, approvedAt: new Date().toISOString() })));
  queue.pending = [];

  writeState(queuePath, queue);
  log.info(`${count} changes approved`);

  return { approved: count };
}

/**
 * Reject all pending changes.
 */
export function rejectAll(projectDir?: string): { rejected: number } {
  const queuePath = getDryRunPath(projectDir);
  const queue = readStateOrDefault(queuePath, { pending: [], approved: [], rejected: [] }) as DryRunQueue;

  const count = queue.pending.length;
  queue.rejected.push(...queue.pending.map(c => ({ ...c, status: 'rejected' as const, rejectedAt: new Date().toISOString() })));
  queue.pending = [];

  writeState(queuePath, queue);
  log.info(`${count} changes rejected`);

  return { rejected: count };
}

/**
 * Clear the dry-run queue.
 */
export function clearQueue(projectDir?: string): void {
  const queuePath = getDryRunPath(projectDir);
  writeState(queuePath, { pending: [], approved: [], rejected: [] });
}
