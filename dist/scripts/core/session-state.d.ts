/**
 * aing Session State Manager
 * Provides session-scoped and stage-scoped state persistence.
 * Survives context compaction by writing to .aing/state/ files.
 * Uses atomic temp+rename writes (same pattern as state.mjs).
 * @module scripts/core/session-state
 */
interface StageResult {
    status: 'success' | 'failed' | 'skipped';
    summary: string;
    completedAt?: string;
}
interface SessionData {
    feature: string;
    mode: string;
    currentStage: string | null;
    planPath: string | null;
    agents: Record<string, string[]>;
    stageResults: Record<string, StageResult>;
    fixLoopCount: number;
    active: boolean;
    startedAt: string;
    updatedAt: string;
    endedAt?: string;
    endReason?: string;
}
interface WriteSessionParams {
    feature: string;
    mode: string;
    currentStage?: string | null;
    planPath?: string | null;
    agents?: Record<string, string[]>;
    stageResults?: Record<string, StageResult>;
    fixLoopCount?: number;
    active?: boolean;
    startedAt?: string;
    updatedAt?: string;
    endedAt?: string;
    endReason?: string;
}
interface WriteSessionResult {
    ok: boolean;
    sessionPath: string;
}
interface ResumeInfo {
    canResume: boolean;
    feature: string | null;
    currentStage: string | null;
    completedStages: string[];
    fixLoopCount: number;
}
/**
 * Create or update a pipeline session.
 */
export declare function writeSession(params: WriteSessionParams, projectDir?: string): WriteSessionResult;
/**
 * Read a pipeline session.
 */
export declare function readSession(mode: string, projectDir?: string): SessionData | null;
/**
 * Update specific fields in an existing session.
 */
export declare function updateSession(mode: string, updates: Partial<WriteSessionParams>, projectDir?: string): {
    ok: boolean;
};
/**
 * Mark a stage as complete with results and advance currentStage.
 */
export declare function completeStage(mode: string, stage: string, result: {
    status: 'success' | 'failed' | 'skipped';
    summary: string;
}, projectDir?: string): {
    ok: boolean;
};
/**
 * Get resume info for a session.
 */
export declare function getResumeInfo(mode: string, projectDir?: string): ResumeInfo;
/**
 * End a session (mark inactive).
 */
export declare function endSession(mode: string, reason: 'complete' | 'failed' | 'cancelled', projectDir?: string): {
    ok: boolean;
};
export {};
//# sourceMappingURL=session-state.d.ts.map