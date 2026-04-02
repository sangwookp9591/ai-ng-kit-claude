/**
 * aing Agent Budget Guard v1.0.0
 * Session-level agent spawn tracking + budget enforcement.
 * Independent of plan-state — works for auto, team, plan-task, and all other skills.
 * @module scripts/guardrail/agent-budget
 */
interface AgentBudgetState {
    sessionId: string;
    agentCount: number;
    totalDurationMs: number;
    lastSpawnAt: string | null;
    slowAgents: string[];
}
export interface BudgetCheck {
    allowed: boolean;
    warn: string | null;
    agentCount: number;
    totalDurationMs: number;
}
/**
 * Track an agent spawn. Called by pre-tool-use hook on every aing: agent spawn.
 * Returns { allowed, warn } — warn is a message for stderr, allowed=false means cap exceeded.
 */
export declare function trackAgentSpawn(projectDir: string, agentName: string): BudgetCheck;
/**
 * Record agent completion with duration. Called by post-tool-use hook.
 * Returns slow-agent warning if applicable.
 */
export declare function recordAgentCompletion(projectDir: string, agentName: string, durationMs: number): string | null;
/**
 * Reset budget state (e.g., on session start).
 */
export declare function resetAgentBudget(projectDir: string): void;
/**
 * Get current budget status (for HUD/diagnostics).
 */
export declare function getAgentBudgetStatus(projectDir: string): AgentBudgetState;
export {};
//# sourceMappingURL=agent-budget.d.ts.map