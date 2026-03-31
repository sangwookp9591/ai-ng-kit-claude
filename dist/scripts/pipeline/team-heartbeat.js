/**
 * aing Team Heartbeat v1.0.0
 * Lightweight worker health monitoring.
 * Tracks worker liveness via periodic heartbeat writes to .aing/state/team-health.json.
 *
 * @module scripts/pipeline/team-heartbeat
 */
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { readState, updateState } from '../core/state.js';
const STALE_THRESHOLD_MS = 60_000; // 60s
function getHealthPath(projectDir) {
    return join(projectDir || process.cwd(), '.aing', 'state', 'team-health.json');
}
function ensureHealthDir(healthPath) {
    mkdirSync(dirname(healthPath), { recursive: true });
}
function defaultHealth() {
    return { workers: [], healthScore: 100, staleCount: 0, activeCount: 0 };
}
/**
 * Mark a worker as active and update its lastSeen timestamp.
 * Creates the worker entry if it does not exist yet.
 */
export async function recordHeartbeat(agentName, projectDir) {
    const path = getHealthPath(projectDir);
    ensureHealthDir(path);
    const now = new Date().toISOString();
    updateState(path, defaultHealth, (raw) => {
        const health = raw;
        const existing = health.workers.find(w => w.agentName === agentName);
        if (existing) {
            existing.lastSeen = now;
            // Promote stale worker back to active on heartbeat
            if (existing.status === 'stale') {
                existing.status = 'active';
            }
        }
        else {
            health.workers.push({
                agentName,
                startedAt: now,
                lastSeen: now,
                status: 'active',
            });
        }
        return recalcStats(health);
    });
}
/**
 * Register a new worker at spawn time.
 */
export async function registerWorker(agentName, taskDescription, projectDir) {
    const path = getHealthPath(projectDir);
    ensureHealthDir(path);
    const now = new Date().toISOString();
    updateState(path, defaultHealth, (raw) => {
        const health = raw;
        // Upsert — avoid duplicate entries if hook fires twice
        const existing = health.workers.find(w => w.agentName === agentName);
        if (existing) {
            existing.lastSeen = now;
            existing.status = 'active';
            existing.taskDescription = taskDescription;
        }
        else {
            health.workers.push({
                agentName,
                startedAt: now,
                lastSeen: now,
                status: 'active',
                taskDescription,
            });
        }
        return recalcStats(health);
    });
}
/**
 * Mark a worker as completed or failed.
 */
export async function markWorkerDone(agentName, status, projectDir) {
    const path = getHealthPath(projectDir);
    ensureHealthDir(path);
    const now = new Date().toISOString();
    updateState(path, defaultHealth, (raw) => {
        const health = raw;
        const worker = health.workers.find(w => w.agentName === agentName);
        if (worker) {
            worker.status = status;
            worker.lastSeen = now;
        }
        return recalcStats(health);
    });
}
/**
 * Read team-health.json, mark stale workers, return current TeamHealth.
 * A worker is stale if still 'active' and lastSeen > 60s ago.
 */
export async function getTeamHealth(projectDir) {
    const path = getHealthPath(projectDir);
    const now = Date.now();
    const result = readState(path);
    const health = result.ok ? result.data : defaultHealth();
    let mutated = false;
    for (const worker of health.workers) {
        if (worker.status === 'active') {
            const age = now - new Date(worker.lastSeen).getTime();
            if (age > STALE_THRESHOLD_MS) {
                worker.status = 'stale';
                mutated = true;
            }
        }
    }
    if (mutated) {
        // Persist stale marks back
        updateState(path, defaultHealth, (_raw) => recalcStats(health));
    }
    return recalcStats(health);
}
/**
 * Calculate a 0-100 health score.
 * Active workers each contribute full weight.
 * Stale workers each contribute half weight (penalty).
 * Terminal (completed/failed) workers do not affect score.
 */
export function getHealthScore(health) {
    const nonTerminal = health.workers.filter(w => w.status === 'active' || w.status === 'stale');
    if (nonTerminal.length === 0)
        return 100;
    const activeWeight = health.workers.filter(w => w.status === 'active').length;
    const staleWeight = health.workers.filter(w => w.status === 'stale').length * 0.5;
    const score = (activeWeight / (activeWeight + staleWeight)) * 100;
    return Math.round(score);
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function recalcStats(health) {
    health.activeCount = health.workers.filter(w => w.status === 'active').length;
    health.staleCount = health.workers.filter(w => w.status === 'stale').length;
    health.healthScore = getHealthScore(health);
    return health;
}
//# sourceMappingURL=team-heartbeat.js.map