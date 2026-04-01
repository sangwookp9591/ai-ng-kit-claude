/**
 * aing Team Orchestrator v1.2.0
 * Cost-aware team composition using CC native TeamCreate/TaskCreate.
 * Harness Engineering innovation over OMC:
 *   - Auto team sizing (not user-specified N)
 *   - Cost-aware model routing per worker
 *   - TDD enforcement for all workers
 *   - Evidence Chain required for completion
 *   - Self-Healing integration (circuit breaker)
 *   - Human-readable progress tracking
 *
 * @module scripts/pipeline/team-orchestrator
 */
import type { ResolvedProfile } from '../routing/profile-resolver.js';
interface Worker {
    name: string;
    agent: string;
    model: 'haiku' | 'sonnet' | 'opus';
    role: string;
}
interface TeamPreset {
    name: string;
    cost: string;
    workers: Worker[];
    when: string;
    description: string;
}
interface ComplexityResult {
    score: number;
    level: string;
}
interface TeamSelection {
    preset: string;
    team: TeamPreset;
    reason: string;
    complexity: ComplexityResult;
}
interface CostEstimate {
    estimated: string;
    breakdown: Array<{
        name: string;
        model: string;
        estimatedTokens: string;
    }>;
    preset?: string;
    workerCount?: number;
}
interface WorkerPromptParams {
    teamName: string;
    workerName: string;
    role: string;
    agent: string;
    tasks: string[];
}
interface PresetInfo {
    key: string;
    name: string;
    workers: number;
    cost: string;
    description: string;
}
/**
 * Team templates — cost-optimized presets.
 * Instead of fixed N workers, aing auto-selects based on task analysis.
 */
declare const TEAM_PRESETS: Record<string, TeamPreset>;
/**
 * Auto-select optimal team preset based on task complexity.
 * aing innovation: OMC는 사용자가 N을 지정, aing은 자동 분석.
 */
export declare function selectTeam(signals?: Record<string, unknown>): TeamSelection;
/**
 * Estimate token cost for a team preset.
 */
export declare function estimateTeamCost(presetName: string): CostEstimate;
/**
 * Generate worker preamble — aing harness-enhanced version.
 * Lighter than OMC (role-specific minimal context), includes TDD + Evidence rules.
 */
export declare function generateWorkerPrompt(params: WorkerPromptParams): string;
/**
 * Format team selection for display.
 */
export declare function formatTeamSelection(selection: TeamSelection): string;
/**
 * Get available team presets for display.
 */
export declare function getTeamPresets(): PresetInfo[];
/**
 * Select team and apply profile constraints (maxTeamSize + allowedAgents).
 * Wraps selectTeam() — existing callers are unaffected.
 *
 * If the selected preset exceeds maxTeamSize, automatically downgrades
 * to the largest fitting preset before applying filterWorkers.
 */
export declare function selectTeamWithProfile(signals?: Record<string, unknown>, profile?: ResolvedProfile): TeamSelection;
export { TEAM_PRESETS };
//# sourceMappingURL=team-orchestrator.d.ts.map