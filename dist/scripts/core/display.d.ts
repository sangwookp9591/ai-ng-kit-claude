/**
 * aing Display — Colorful terminal output with cute team visualization
 * @module scripts/core/display
 */
interface AnsiColors {
    reset: string;
    bold: string;
    dim: string;
    italic: string;
    purple: string;
    cyan: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    orange: string;
    pink: string;
    lime: string;
    sky: string;
    red: string;
    bgPurple: string;
    bgCyan: string;
    bgGreen: string;
}
declare const C: AnsiColors;
interface AgentInfo {
    icon: string;
    color: string;
    name: string;
    role: string;
    desc: string;
    model: string;
}
interface InnovationInfo {
    icon: string;
    name: string;
    color: string;
    desc: string;
}
declare const AGENTS: Record<string, AgentInfo>;
declare const INNOVATIONS: InnovationInfo[];
/**
 * Generate the aing banner
 */
export declare function banner(): string;
/**
 * Generate the team visualization (grouped by department)
 */
export declare function teamDisplay(): string;
/**
 * Generate innovations display
 */
export declare function innovationsDisplay(): string;
/**
 * Generate PDCA stage flow visualization
 */
export declare function pdcaFlow(currentStage: string): string;
/**
 * Generate commands help
 */
export declare function commandsHelp(): string;
/**
 * Generate best practices guide
 */
export declare function bestPracticesGuide(): string;
/**
 * Generate full help output
 */
export declare function fullHelp(): string;
export { C, AGENTS, INNOVATIONS };
//# sourceMappingURL=display.d.ts.map