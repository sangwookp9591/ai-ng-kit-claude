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
interface Constraint {
    name: string;
    source: string;
    evidence: string;
    violationImpact: string;
}
interface Preference {
    name: string;
    priority: string;
    tradeoffThreshold: string;
    why: string;
}
interface Driver {
    name: string;
    status: string;
    source?: string;
}
interface Steelman {
    antithesis: string;
    tradeoffs: string[];
    newDrivers: string[];
    synthesisPath: string | null;
}
interface NoaVerdict {
    verdict: string;
    absorbed: number;
    rebutted: number;
    acknowledged: number;
    ignored: number;
    reflectionScore: number;
    deltaScore: number | null;
    confidence: string;
}
interface CriticVerdict {
    verdict: string;
    mode: string;
    critical: number;
    major: number;
    minor: number;
    selfAuditDowngrades: number;
    constraintCompliance: string;
    criteriaTestability: string;
    evidenceCoverage: string;
}
interface ADR {
    decision: string;
    confidence: string;
    constraintsHonored: string[];
    alternativesRejected: string[];
    consequences: {
        positive: string[];
        negative: string[];
    };
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
    constraints?: Constraint[];
    preferences?: Preference[];
    drivers?: Driver[];
    steelman?: Steelman;
    noaVerdict?: NoaVerdict;
    criticVerdict?: CriticVerdict;
    adr?: ADR;
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