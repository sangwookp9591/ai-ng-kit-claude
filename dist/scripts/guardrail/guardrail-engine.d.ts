/**
 * aing Guardrail Engine v0.3.0
 * Declarative rule engine for constraining agent behavior.
 * Harness Engineering: Constrain axis — define boundaries.
 * @module scripts/guardrail/guardrail-engine
 */
interface GuardrailRule {
    id: string;
    type: 'bash' | 'file';
    pattern: RegExp;
    action: 'block' | 'warn';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
}
interface Violation {
    rule: GuardrailRule;
    match: string;
}
interface CheckResult {
    allowed: boolean;
    violations: Violation[];
}
/**
 * Load guardrail rules from config + defaults.
 */
export declare function loadRules(_projectDir?: string): GuardrailRule[];
/**
 * Check a bash command against guardrail rules.
 */
export declare function checkBashCommand(command: string, projectDir?: string): CheckResult;
/**
 * Check a file path against guardrail rules.
 */
export declare function checkFilePath(filePath: string, projectDir?: string): CheckResult;
/**
 * Format guardrail violation for display.
 */
export declare function formatViolations(violations: Violation[]): string;
export {};
//# sourceMappingURL=guardrail-engine.d.ts.map