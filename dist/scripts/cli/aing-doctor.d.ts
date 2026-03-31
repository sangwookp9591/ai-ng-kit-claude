interface HealthCheck {
    name: string;
    status: string;
    detail?: string;
}
interface HealthResult {
    healthy: boolean;
    checks: HealthCheck[];
}
/**
 * Run installation health check.
 */
export declare function runHealthCheck(projectDir?: string): HealthResult;
/**
 * Format health check results.
 */
export declare function formatHealthCheck(result: HealthResult): string;
export {};
//# sourceMappingURL=aing-doctor.d.ts.map