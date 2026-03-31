/**
 * Shared session reader — reads active session state from pipeline/PDCA files.
 * Extracted from stop.mjs and user-prompt-submit.mjs to eliminate DRY violation.
 * @module scripts/core/session-reader
 */
interface PipelineState {
    status: string;
    currentStageIndex?: number;
    stages?: Array<{
        id: string;
    }>;
    feature?: string;
    id?: string;
}
interface PdcaFeatureData {
    currentStage?: string;
}
interface PdcaState {
    activeFeature?: string;
    features?: Record<string, PdcaFeatureData>;
}
interface PreReadState {
    pdcaState?: PdcaState | null;
    pipelineState?: PipelineState | null;
}
interface ActiveSessionResult {
    active: boolean;
    mode?: string;
    feature?: string;
    currentStage?: string;
}
/**
 * Sanitize a session field value for safe LLM context injection.
 * Truncates to MAX_FIELD_LENGTH and strips control characters.
 */
export declare function sanitizeSessionField(value: unknown): string;
/**
 * Determine the active session from state files.
 * Optionally accepts pre-read state to avoid redundant file I/O.
 */
export declare function getActiveSession(projectDir: string, preRead?: PreReadState): ActiveSessionResult;
export {};
//# sourceMappingURL=session-reader.d.ts.map