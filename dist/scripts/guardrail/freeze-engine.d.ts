interface FreezeResult {
    ok: boolean;
    freezeDir?: string;
}
interface FreezeCheckResult {
    allowed: boolean;
    reason?: string;
}
/**
 * Set freeze boundary.
 */
export declare function setFreeze(directory: string, projectDir?: string): FreezeResult;
/**
 * Clear freeze boundary.
 */
export declare function clearFreeze(projectDir?: string): {
    ok: boolean;
};
/**
 * Get current freeze directory.
 */
export declare function getFreezeDir(projectDir?: string): string | null;
/**
 * Check if a file path is allowed under current freeze.
 */
export declare function checkFreeze(filePath: string, projectDir?: string): FreezeCheckResult;
/**
 * Format freeze status for display.
 */
export declare function formatFreezeStatus(projectDir?: string): string;
export {};
//# sourceMappingURL=freeze-engine.d.ts.map