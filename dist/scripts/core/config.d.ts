/**
 * aing Configuration Loader
 * Single source of truth: .aing/config.json > aing.config.json > DEFAULTS
 * @module scripts/core/config
 */
interface PdcaConfig {
    stages: string[];
    automationLevel: string;
    matchRateThreshold: number;
    maxIterations: number;
}
interface ContextConfig {
    maxSessionStartTokens: number;
    truncateLimit: number;
    budgetWarningThreshold: number;
}
interface RoutingConfig {
    complexityThresholds: {
        low: number;
        mid: number;
    };
    modelMap: {
        low: string;
        mid: string;
        high: string;
    };
    historyRetention: number;
}
interface LearningConfig {
    maxPatterns: number;
    decayDays: number;
    minSuccessRate: number;
}
interface RecoveryConfig {
    circuitBreakerThreshold: number;
    circuitBreakerResetMs: number;
    maxSnapshots: number;
}
interface I18nConfig {
    defaultLocale: string;
    supportedLocales: string[];
}
interface AgentsConfig {
    categories: {
        leadership: boolean;
        backend: boolean;
        frontend: boolean;
        design: boolean;
        aiml: boolean;
        special: boolean;
    };
    deny: string[];
    allow: string[];
}
interface ProfileConfig {
    costMode: 'quality' | 'balanced' | 'budget';
    maxTeamSize: number;
    tokenLimit: number | null;
    agents: AgentsConfig;
}
interface AingConfig {
    pdca: PdcaConfig;
    context: ContextConfig;
    routing: RoutingConfig;
    learning: LearningConfig;
    recovery: RecoveryConfig;
    i18n: I18nConfig;
    profile: ProfileConfig;
    [key: string]: unknown;
}
/**
 * Load aing configuration with 3-way defaults merge.
 * Priority: .aing/config.json > aing.config.json > DEFAULTS
 * Cache is invalidated when either file's mtime changes.
 * @param projectDir - Project root directory
 */
export declare function loadConfig(projectDir?: string): Readonly<AingConfig>;
/**
 * Get a specific config value by dot-notated path.
 * @param path - e.g. 'pdca.automationLevel'
 * @param fallback - Default if path not found
 */
export declare function getConfig(path: string, fallback?: unknown): unknown;
/**
 * Reset config cache (for testing or config reload).
 */
export declare function resetConfigCache(): void;
export {};
//# sourceMappingURL=config.d.ts.map