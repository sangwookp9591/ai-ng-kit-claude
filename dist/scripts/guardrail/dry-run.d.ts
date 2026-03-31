/**
 * aing Dry-Run Mode v0.3.0
 * Preview changes before execution.
 * Harness Engineering: Verify axis — human-in-the-loop approval.
 * @module scripts/guardrail/dry-run
 */
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
/**
 * Check if dry-run mode is active.
 */
export declare function isDryRunActive(_projectDir?: string): boolean;
/**
 * Queue a pending change for dry-run preview.
 */
export declare function queueChange(change: Change, projectDir?: string): {
    queued: boolean;
    queueSize: number;
};
/**
 * Get all pending changes for preview.
 */
export declare function getPendingChanges(projectDir?: string): QueuedChange[];
/**
 * Format pending changes as a preview summary.
 */
export declare function formatPreview(projectDir?: string): string;
/**
 * Approve all pending changes.
 */
export declare function approveAll(projectDir?: string): {
    approved: number;
};
/**
 * Reject all pending changes.
 */
export declare function rejectAll(projectDir?: string): {
    rejected: number;
};
/**
 * Clear the dry-run queue.
 */
export declare function clearQueue(projectDir?: string): void;
export {};
//# sourceMappingURL=dry-run.d.ts.map