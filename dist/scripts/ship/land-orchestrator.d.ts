export type MergeStrategy = 'squash' | 'merge' | 'rebase';
export interface LandOptions {
    prNumber: number;
    feature: string;
    mergeStrategy?: MergeStrategy;
    canaryUrl?: string;
    canaryChecks?: number;
    canaryIntervalMs?: number;
    deployTimeoutMs?: number;
    dryRun?: boolean;
    projectDir?: string;
}
export type StepStatus = 'pass' | 'fail' | 'skip';
export interface LandStep {
    name: string;
    status: StepStatus;
    duration_ms: number;
    details: Record<string, unknown>;
}
export interface LandResult {
    success: boolean;
    steps: LandStep[];
    deployUrl: string | null;
    error?: string;
}
export declare function executeLandPipeline(options: LandOptions): Promise<LandResult>;
export declare function formatLandReport(result: LandResult, prNumber: number): string;
//# sourceMappingURL=land-orchestrator.d.ts.map