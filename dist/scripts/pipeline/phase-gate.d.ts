/**
 * aing Phase Gate v1.0.0
 * Validates phase transition preconditions before allowing pipeline stage changes.
 * Reads team-health.json and agent-trace.json for real-time worker state.
 *
 * @module scripts/pipeline/phase-gate
 */
export interface PhaseGateResult {
    canTransition: boolean;
    blockers: string[];
    warnings: string[];
    completedTasks: number;
    totalTasks: number;
}
/**
 * Verify preconditions for a phase transition.
 *
 * Supported transitions and their rules:
 *   exec   → verify : all workers must be completed or failed
 *   verify → fix    : at least one worker must have failed
 *   fix    → exec   : always allowed (re-execution)
 *
 * Any other transition: allowed with a warning if workers are still active.
 */
export declare function checkPhaseGate(fromPhase: string, toPhase: string, projectDir?: string): Promise<PhaseGateResult>;
//# sourceMappingURL=phase-gate.d.ts.map