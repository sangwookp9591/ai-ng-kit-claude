/**
 * Shared path utilities — safe file naming helpers.
 * Extracted from handoff-manager.mjs and plan-manager.mjs to eliminate DRY violation.
 * @module scripts/core/path-utils
 */
/**
 * Sanitize a feature name for safe use in file paths.
 * Prevents path traversal (e.g., "../../etc" → "etc").
 */
export declare function sanitizeFeature(feature: string): string;
//# sourceMappingURL=path-utils.d.ts.map