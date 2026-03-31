export interface StepResult {
    step: string;
    status: 'pass' | 'fail';
    details?: Record<string, unknown>;
    ts?: string;
}
export interface ShipState {
    feature: string;
    branch: string;
    baseBranch: string;
    currentStep: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    stepResults: StepResult[];
    startedAt: string;
    completedAt?: string;
}
/**
 * Initialize a ship session.
 */
export declare function initShip(feature: string, branch: string, baseBranch: string, projectDir?: string): ShipState;
/**
 * Get the current step name.
 */
export declare function getCurrentStep(state: ShipState): string;
/**
 * Advance to the next step after recording result.
 */
export declare function advanceStep(stepResult: StepResult, projectDir?: string): ShipState;
/**
 * Get ship state.
 */
export declare function getShipState(projectDir?: string): ShipState | null;
/**
 * Format ship progress for display.
 */
export declare function formatShipProgress(state: ShipState | null): string;
/**
 * Get all step names.
 */
export declare function getSteps(): string[];
//# sourceMappingURL=ship-engine.d.ts.map