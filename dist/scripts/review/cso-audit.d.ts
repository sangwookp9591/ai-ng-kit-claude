export interface CSOPhase {
    id: number;
    name: string;
    description: string;
}
export interface SeverityInfo {
    label: string;
    requirement: string;
}
export interface OWASPCheck {
    patterns: string[];
    description: string;
}
export interface STRIDEDimension {
    name: string;
    question: string;
}
export interface FPRule {
    pattern: string;
    maxSeverity: string | null;
    reason: string;
}
export interface SecretPattern {
    pattern: string;
    name: string;
    severity: string;
}
export interface AuditPromptContext {
    phases?: number[];
    stack?: string;
}
export interface AuditFinding {
    title: string;
    severity: string;
    category: string;
    file: string;
    line: number;
    description: string;
    remediation: string;
    confidence: string;
    phase: number;
}
/**
 * 14-phase security audit structure.
 */
export declare const CSO_PHASES: CSOPhase[];
/**
 * Severity levels with exploitation requirement.
 */
export declare const SEVERITY: Record<string, SeverityInfo>;
/**
 * OWASP Top 10 categories with specific check patterns.
 */
export declare const OWASP_CHECKS: Record<string, OWASPCheck>;
/**
 * STRIDE threat model dimensions.
 */
export declare const STRIDE: Record<string, STRIDEDimension>;
/**
 * False positive rules — known safe patterns.
 */
export declare const FP_RULES: FPRule[];
/**
 * Secret patterns to scan in git history.
 */
export declare const SECRET_PATTERNS: SecretPattern[];
/**
 * Build CSO audit prompt for Milla agent.
 */
export declare function buildAuditPrompt(context: AuditPromptContext): string;
/**
 * Record CSO audit finding as evidence.
 */
export declare function recordFinding(feature: string, finding: AuditFinding, projectDir?: string): void;
/**
 * Format audit summary.
 */
export declare function formatAuditSummary(findings: AuditFinding[]): string;
//# sourceMappingURL=cso-audit.d.ts.map