/**
 * aing Review ↔ PDCA Integration
 * 200% Synergy: Connects review pipeline with PDCA lifecycle.
 *
 * - PDCA "check" stage triggers review pipeline
 * - PDCA "review" stage checks review readiness dashboard
 * - Ship is gated by PDCA completion + review CLEARED
 *
 * @module scripts/review/pdca-integration
 */
import { type Dashboard } from './review-dashboard.js';
export interface ShipReadinessContext {
    pdcaStage: string;
    pdcaVerdict: string;
    evidenceVerdict: string;
    projectDir?: string;
}
export interface ShipReadinessResult {
    canShip: boolean;
    reason: string;
    blockers: string[];
}
export interface ReviewRequirementsContext {
    complexityLevel: 'low' | 'mid' | 'high';
    hasUI: boolean;
    hasProductChange: boolean;
    pdcaStage: string;
}
export interface ReviewRequirementsResult {
    tiers: string[];
    reason: string;
}
/**
 * Check if the current state allows shipping.
 * Combines PDCA verdict + review dashboard + evidence chain.
 */
export declare function checkShipReadiness(context: ShipReadinessContext): ShipReadinessResult;
/**
 * Determine review requirements based on PDCA context and complexity.
 */
export declare function determineReviewRequirements(context: ReviewRequirementsContext): ReviewRequirementsResult;
/**
 * Format ship readiness report.
 */
export declare function formatShipReadiness(readiness: ShipReadinessResult, _dashboard: Dashboard): string;
//# sourceMappingURL=pdca-integration.d.ts.map