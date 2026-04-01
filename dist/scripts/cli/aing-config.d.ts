/**
 * Get a config value.
 */
export declare function getConfig(key: string, fallback?: unknown, projectDir?: string): unknown;
/**
 * Set a config value.
 */
export declare function setConfig(key: string, value: unknown, projectDir?: string): void;
/**
 * Apply a named profile preset to config.
 * Returns true if preset was found and applied, false otherwise.
 */
export declare function applyProfilePreset(presetName: string, projectDir?: string): boolean;
/**
 * List all config values.
 */
export declare function listConfig(projectDir?: string): Record<string, unknown>;
/**
 * Format config for display.
 */
export declare function formatConfig(config: Record<string, unknown>): string;
//# sourceMappingURL=aing-config.d.ts.map