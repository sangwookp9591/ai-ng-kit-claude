export interface AlertThreshold {
    name: string;
    consecutiveChecks: number;
}
export interface HealthCheckResult {
    healthy: boolean;
    statusCode: number | null;
    responseTimeMs: number;
    error?: string;
}
export interface CanaryAlert {
    type: string;
    check: number;
    message: string;
    statusCode: number | null;
}
export interface CanaryCheckEntry {
    check: number;
    healthy: boolean;
    statusCode: number | null;
    responseTimeMs: number;
    error?: string;
    ts: string;
}
export interface CanaryOptions {
    url: string;
    feature: string;
    checks?: number;
    intervalMs?: number;
    projectDir?: string;
}
export interface CanaryResult {
    passed: boolean;
    checks: CanaryCheckEntry[];
    alerts: CanaryAlert[];
}
/**
 * Alert thresholds.
 */
export declare const ALERT_THRESHOLDS: Record<string, AlertThreshold>;
/**
 * Run a single health check against a URL.
 */
export declare function healthCheck(url: string): HealthCheckResult;
/**
 * Run canary monitoring loop.
 */
export declare function runCanaryLoop(options: CanaryOptions): CanaryResult;
/**
 * Format canary results.
 */
export declare function formatCanaryResult(result: CanaryResult): string;
//# sourceMappingURL=canary-monitor.d.ts.map