/**
 * aing Plan Manager v1.1.0
 * Creates and manages plan documents in .aing/plans/
 * Integrates with Task Manager for checklist tracking.
 * @module scripts/task/plan-manager
 */
interface PlanOption {
    name: string;
    pros: string[];
    cons: string[];
}
interface ReviewNote {
    reviewer: string;
    verdict: string;
    highlights: string[];
}
interface CreatePlanParams {
    feature: string;
    goal: string;
    steps: string[];
    acceptanceCriteria?: string[];
    risks?: string[];
    options?: PlanOption[];
    reviewNotes?: ReviewNote[];
    complexityScore?: number;
    complexityLevel?: string;
}
interface CreatePlanResult {
    ok: boolean;
    planPath: string;
    taskId: string;
}
interface PlanListEntry {
    file: string;
    feature: string;
}
/**
 * Create a plan document from a task description.
 * Generates both a markdown plan file and a tracked task with subtasks.
 */
export declare function createPlan(params: CreatePlanParams, projectDir?: string): CreatePlanResult;
/**
 * Get a plan document.
 */
export declare function getPlan(feature: string, projectDir?: string): string | null;
/**
 * List all plans.
 */
export declare function listPlans(projectDir?: string): PlanListEntry[];
export {};
//# sourceMappingURL=plan-manager.d.ts.map