import type { ShipState } from './ship-engine.js';
export interface ShipPipelineOptions {
    feature: string;
    baseBranch?: string;
    dryRun?: boolean;
    skipTests?: boolean;
    projectDir?: string;
}
export interface ShipPipelineResult {
    success: boolean;
    state: ShipState | null;
    pr?: string | null;
    error?: string;
}
/**
 * Execute the full 7-step ship pipeline.
 */
export declare function executeShipPipeline(options: ShipPipelineOptions): Promise<ShipPipelineResult>;
//# sourceMappingURL=ship-orchestrator.d.ts.map