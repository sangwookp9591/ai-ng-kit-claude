/**
 * aing Plan State Manager — Tracks AING-DR consensus planning lifecycle.
 * Provides phase transition tracking, iteration management, and session resume.
 * @module scripts/hooks/plan-state
 */
export type PlanPhase = 'gate' | 'foundation' | 'option-design' | 'steelman' | 'synthesis' | 'synthesis-check' | 'critique' | 'adr' | 'completed' | 'terminated';
export interface PlanState {
    active: boolean;
    phase: PlanPhase;
    feature: string;
    startedAt: string;
    updatedAt: string;
    iteration: number;
    maxIterations: number;
    complexity?: string;
    deliberate?: boolean;
    confidence?: string;
    verdict?: string;
    phaseHistory: string[];
    terminated?: boolean;
    terminateReason?: string;
}
/**
 * Initialize a new plan state.
 */
export declare function initPlanState(projectDir: string, feature: string, opts?: {
    complexity?: string;
    deliberate?: boolean;
}): PlanState;
/**
 * Read current plan state. Returns null if no active plan.
 */
export declare function readPlanState(projectDir: string): PlanState | null;
/**
 * Advance to the next phase. Validates phase ordering.
 * Returns the updated state, or null if transition is invalid.
 */
export declare function advancePhase(projectDir: string, nextPhase: PlanPhase): PlanState | null;
/**
 * Increment iteration (on Critic ITERATE).
 * Returns false if max iterations reached or time budget exceeded.
 */
export declare function incrementIteration(projectDir: string): boolean;
/**
 * Check if the current iteration has exceeded its time budget.
 * Called by hooks to force early termination of stuck iterations.
 */
export declare function isIterationTimedOut(projectDir: string): boolean;
/**
 * Complete the plan (Phase 7 done).
 */
export declare function completePlan(projectDir: string, confidence: string, verdict: string): void;
/**
 * Terminate the plan (REJECT, max iterations, stagnation).
 */
export declare function terminatePlan(projectDir: string, reason: string): void;
/**
 * Delete plan state entirely.
 */
export declare function clearPlanState(projectDir: string): void;
/**
 * Check if a phase transition is valid (for integrity checks).
 */
export declare function validatePhaseSequence(history: string[]): {
    valid: boolean;
    issues: string[];
};
/**
 * Check if an agent spawn is allowed in the current phase.
 * Called by pre-tool-use hook to block out-of-order agent spawns.
 *
 * Returns { allowed: true } if no active plan or agent is permitted.
 * Returns { allowed: false, reason } if agent spawn violates phase ordering.
 */
export declare function checkAgentAllowed(projectDir: string, agentName: string): {
    allowed: boolean;
    reason?: string;
    phase?: PlanPhase;
};
/**
 * Auto-advance phase after an agent completes.
 * Called by post-tool-use hook when an aing: agent finishes.
 *
 * Returns the new phase, or null if no advancement needed.
 */
export declare function autoAdvancePhase(projectDir: string, completedAgent: string): PlanPhase | null;
/**
 * Get the expected agent(s) for the current phase.
 * Used by hooks to inject guidance when phase doesn't match.
 */
export declare function getExpectedAgent(projectDir: string): {
    phase: PlanPhase;
    agents: string[];
} | null;
/**
 * Get resume info for session restart.
 */
export declare function getResumeInfo(projectDir: string): {
    canResume: boolean;
    feature: string | null;
    phase: PlanPhase | null;
    iteration: number;
};
//# sourceMappingURL=plan-state.d.ts.map