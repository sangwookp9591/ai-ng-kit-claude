export interface PlatformConfig {
    appName: string | null;
    url: string | null;
    deployCmd: string;
    healthCheck: string;
}
export interface Platform {
    id: string;
    name: string;
    detect: (dir: string) => boolean;
    getConfig: (dir: string) => PlatformConfig;
}
export interface DetectResult {
    platform: Platform | null;
    config: PlatformConfig | null;
}
export interface HealthCheckResult {
    healthy: boolean;
    statusCode: number | null;
    error?: string;
}
/**
 * Supported platforms with detection heuristics.
 */
export declare const PLATFORMS: Platform[];
/**
 * Detect deployment platform.
 */
export declare function detectPlatform(projectDir?: string): DetectResult;
/**
 * Format deploy config for CLAUDE.md or display.
 */
export declare function formatDeployConfig(result: DetectResult): string;
/**
 * Run health check against deployed URL.
 * Note: Uses execSync with curl (fixed command template, URL from config not user input).
 */
export declare function healthCheck(url: string): HealthCheckResult;
//# sourceMappingURL=deploy-detect.d.ts.map