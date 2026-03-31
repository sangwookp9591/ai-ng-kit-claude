/**
 * aing Health Check (Innovation #5 — Self-Healing Engine)
 * Validates integrity of state files and detects corruption.
 * @module scripts/recovery/health-check
 */
interface FileCheck {
    file: string;
    status: 'ok' | 'not_found' | 'corrupted';
    error?: string;
}
interface HealthCheckResult {
    healthy: boolean;
    checks: FileCheck[];
}
/**
 * Run health check on all aing state files.
 */
export declare function runHealthCheck(projectDir?: string): HealthCheckResult;
export {};
//# sourceMappingURL=health-check.d.ts.map