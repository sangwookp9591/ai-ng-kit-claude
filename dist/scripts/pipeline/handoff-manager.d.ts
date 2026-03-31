/**
 * aing Handoff Manager — Preserves decisions and context between pipeline stages.
 * Prevents context loss during compaction by persisting stage outputs.
 * @module scripts/pipeline/handoff-manager
 */
interface HandoffParams {
    feature: string;
    stage: string;
    summary: string;
    decisions: string[];
    artifacts?: string[];
    openIssues?: string[];
    agentOutputs?: Record<string, string>;
    nextStage?: string;
}
interface HandoffWriteResult {
    ok: boolean;
    handoffPath: string;
}
interface HandoffListEntry {
    stage: string;
    file: string;
    timestamp: string;
}
interface ResumeContext {
    canResume: boolean;
    lastStage: string | null;
    nextStage: string | null;
    handoff: string | null;
}
/**
 * Write a stage handoff document.
 * Captures the key decisions, outputs, and context from a pipeline stage.
 */
export declare function writeHandoff(params: HandoffParams, projectDir?: string): HandoffWriteResult;
/**
 * Read the latest handoff for a stage.
 */
export declare function readHandoff(feature: string, stage: string, projectDir?: string): string | null;
/**
 * List all handoffs for a feature in chronological order.
 */
export declare function listHandoffs(feature: string, projectDir?: string): HandoffListEntry[];
/**
 * Get resume context — reads the latest handoff to determine where to continue.
 */
export declare function getResumeContext(feature: string, projectDir?: string): ResumeContext;
export {};
//# sourceMappingURL=handoff-manager.d.ts.map