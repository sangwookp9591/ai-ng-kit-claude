/**
 * aing Careful Checklist — Pre-deploy safety verification
 * Absorbed from gstack's /careful skill.
 * @module scripts/guardrail/careful-checklist
 */
interface DangerousPattern {
    pattern: RegExp;
    name: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}
interface Finding {
    name: string;
    severity: string;
}
interface SafetyCheckResult {
    safe: boolean;
    findings: Finding[];
}
export declare const DANGEROUS_PATTERNS: DangerousPattern[];
export declare const SAFE_EXCEPTIONS: string[];
/**
 * Check a command for dangerous patterns.
 */
export declare function checkCommand(command: string): SafetyCheckResult;
/**
 * Format safety check result.
 */
export declare function formatSafetyCheck(result: SafetyCheckResult): string;
export {};
//# sourceMappingURL=careful-checklist.d.ts.map