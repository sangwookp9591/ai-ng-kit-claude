/**
 * Shared path utilities — safe file naming helpers.
 * Extracted from handoff-manager.mjs and plan-manager.mjs to eliminate DRY violation.
 * @module scripts/core/path-utils
 */
import { basename } from 'node:path';
/**
 * Sanitize a feature name for safe use in file paths.
 * Prevents path traversal (e.g., "../../etc" → "etc").
 */
export function sanitizeFeature(feature) {
    const safe = basename(feature).replace(/[^a-zA-Z0-9_\-가-힣]/g, '_');
    if (!safe)
        throw new Error(`Invalid feature name: ${feature}`);
    return safe;
}
//# sourceMappingURL=path-utils.js.map