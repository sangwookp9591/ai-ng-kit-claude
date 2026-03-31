/**
 * Telemetry tiers.
 */
export declare const TELEMETRY_TIERS: Record<string, string>;
interface SkillUsageEvent {
    skill: string;
    duration_s: number;
    outcome: string;
    complexityLevel?: string | null;
    tokensUsed?: number | null;
    teamPreset?: string | null;
}
interface SessionEvent {
    type: 'start' | 'end';
    sessionId: string;
    totalTokens?: number;
    totalSteps?: number;
    totalFiles?: number;
    pdcaStage?: string;
}
interface SkillBreakdown {
    count: number;
    totalDuration: number;
    outcomes: Record<string, number>;
}
interface UsageSummary {
    totalSessions: number;
    totalDuration: number;
    totalTokens: number;
    avgDuration: number;
    skillBreakdown: Record<string, SkillBreakdown>;
}
/**
 * Log a skill usage event (always local, remote only if opted in).
 */
export declare function logSkillUsage(event: SkillUsageEvent, projectDir?: string): void;
/**
 * Log a session start/end event.
 */
export declare function logSession(event: SessionEvent, projectDir?: string): void;
/**
 * Read skill usage analytics.
 */
export declare function readUsageLog(projectDir?: string, limit?: number): Record<string, unknown>[];
/**
 * Generate usage summary statistics.
 */
export declare function getUsageSummary(projectDir?: string): UsageSummary;
/**
 * Format usage summary for display.
 */
export declare function formatUsageSummary(summary: UsageSummary): string;
/**
 * Create a pending marker for crash recovery.
 */
export declare function createPendingMarker(sessionId: string, skill: string, projectDir?: string): void;
/**
 * Finalize pending marker (skill completed normally).
 */
export declare function finalizePendingMarker(sessionId: string, projectDir?: string): void;
/**
 * Recover any orphaned pending markers from crashed sessions.
 * Called at session start.
 */
export declare function recoverPendingMarkers(projectDir?: string): void;
export {};
//# sourceMappingURL=telemetry-engine.d.ts.map