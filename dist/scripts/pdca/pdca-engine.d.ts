/**
 * aing PDCA-Lite 5-Stage Engine
 * Stages: plan → do → check → act → review
 * @module scripts/pdca/pdca-engine
 */
type PdcaStage = 'plan' | 'do' | 'check' | 'act' | 'review' | 'completed';
interface StageDescription {
    ko: string;
    en: string;
    next: PdcaStage | null;
}
interface HistoryEntry {
    stage: string;
    action: string;
    ts: string;
    reason?: string;
    iteration?: number;
    from?: string;
}
interface EvidenceEntry {
    stage: string;
    matchRate?: number;
    ts: string;
    [key: string]: unknown;
}
interface ScalingProfile {
    level: string;
    maxIterations: number;
    reviewTier: string;
    reviewers: string[];
    evidenceRequired: string[];
}
interface PdcaFeature {
    currentStage: PdcaStage;
    iteration: number;
    startedAt: string;
    completedAt?: string;
    history: HistoryEntry[];
    evidence: EvidenceEntry[];
    scalingProfile?: ScalingProfile;
    maxIterations?: number;
}
interface PdcaState {
    version: number;
    features: Record<string, PdcaFeature>;
    activeFeature?: string | null;
}
interface WriteResult {
    ok: boolean;
    error?: string;
}
declare const STAGES: PdcaStage[];
declare const STAGE_DESCRIPTIONS: Record<string, StageDescription>;
/**
 * Start a new PDCA cycle for a feature.
 */
export declare function startPdca(featureName: string, complexityScore?: number | string, projectDir?: string): WriteResult;
/**
 * Advance to the next PDCA stage.
 */
export declare function advancePdca(featureName: string, evidence?: Partial<EvidenceEntry>, projectDir?: string): WriteResult;
/**
 * Get current PDCA status for a feature.
 */
export declare function getPdcaStatus(featureName?: string, projectDir?: string): PdcaFeature | PdcaState | null;
/**
 * Complete a PDCA cycle.
 */
export declare function completePdca(featureName: string, projectDir?: string): WriteResult;
/**
 * Reset a PDCA cycle.
 */
export declare function resetPdca(featureName: string, projectDir?: string): WriteResult;
/**
 * Scaling profiles based on complexity score.
 */
export declare function getScalingProfile(complexityScore: number): ScalingProfile;
export { STAGES, STAGE_DESCRIPTIONS };
//# sourceMappingURL=pdca-engine.d.ts.map