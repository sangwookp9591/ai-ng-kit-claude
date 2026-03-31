/**
 * aing Team Heartbeat v1.0.0
 * Lightweight worker health monitoring.
 * Tracks worker liveness via periodic heartbeat writes to .aing/state/team-health.json.
 *
 * @module scripts/pipeline/team-heartbeat
 */
export interface WorkerStatus {
    agentName: string;
    startedAt: string;
    lastSeen: string;
    status: 'active' | 'stale' | 'completed' | 'failed';
    taskDescription?: string;
}
export interface TeamHealth {
    workers: WorkerStatus[];
    healthScore: number;
    staleCount: number;
    activeCount: number;
}
/**
 * Mark a worker as active and update its lastSeen timestamp.
 * Creates the worker entry if it does not exist yet.
 */
export declare function recordHeartbeat(agentName: string, projectDir?: string): Promise<void>;
/**
 * Register a new worker at spawn time.
 */
export declare function registerWorker(agentName: string, taskDescription: string, projectDir?: string): Promise<void>;
/**
 * Mark a worker as completed or failed.
 */
export declare function markWorkerDone(agentName: string, status: 'completed' | 'failed', projectDir?: string): Promise<void>;
/**
 * Read team-health.json, mark stale workers, return current TeamHealth.
 * A worker is stale if still 'active' and lastSeen > 60s ago.
 */
export declare function getTeamHealth(projectDir?: string): Promise<TeamHealth>;
/**
 * Calculate a 0-100 health score.
 * Active workers each contribute full weight.
 * Stale workers each contribute half weight (penalty).
 * Terminal (completed/failed) workers do not affect score.
 */
export declare function getHealthScore(health: TeamHealth): number;
//# sourceMappingURL=team-heartbeat.d.ts.map