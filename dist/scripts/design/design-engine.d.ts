/**
 * aing Design Engine
 * Programmatic design system generation and management.
 * Works with Willji agent for AI-powered design decisions.
 * @module scripts/design/design-engine
 */
export interface ColorToken {
    name: string;
    value: string;
    usage: string;
    contrast?: number;
}
export interface SpacingToken {
    name: string;
    value: string;
    px: number;
}
export interface TypographyToken {
    name: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
    lineHeight: string;
    letterSpacing?: string;
}
export interface RadiusToken {
    name: string;
    value: string;
}
export interface DesignTokens {
    colors: ColorToken[];
    spacing: SpacingToken[];
    typography: TypographyToken[];
    radius: RadiusToken[];
    shadows?: string[];
}
export interface DesignBrief {
    projectName: string;
    projectType: 'saas' | 'ecommerce' | 'dashboard' | 'landing' | 'mobile' | 'docs' | 'other';
    aesthetic: string;
    targetAudience: string;
    colorPreference?: string;
    darkMode: boolean;
    frameworks: string[];
}
export interface DesignSystem {
    brief: DesignBrief;
    tokens: DesignTokens;
    components: ComponentSpec[];
    score: DesignScore;
    generatedAt: string;
}
export interface ComponentSpec {
    name: string;
    category: 'layout' | 'navigation' | 'input' | 'display' | 'feedback' | 'overlay';
    variants: string[];
    props: string[];
    accessibility: string[];
}
export interface DesignScore {
    overall: number;
    contrast: number;
    consistency: number;
    spacing: number;
    typography: number;
    accessibility: number;
    issues: DesignIssue[];
}
export interface DesignIssue {
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    suggestion: string;
}
/**
 * Generate design tokens from a brief.
 */
export declare function generateTokens(brief: DesignBrief): DesignTokens;
/**
 * Generate component inventory based on project type.
 */
export declare function generateComponents(brief: DesignBrief): ComponentSpec[];
/**
 * Score a design system for quality issues.
 */
export declare function scoreDesign(tokens: DesignTokens): DesignScore;
/**
 * Generate a complete design system from a brief.
 */
export declare function generateDesignSystem(brief: DesignBrief): DesignSystem;
/**
 * Export design tokens as CSS custom properties.
 */
export declare function exportAsCSS(tokens: DesignTokens, darkMode?: boolean): string;
/**
 * Export design tokens as Tailwind config partial.
 */
export declare function exportAsTailwind(tokens: DesignTokens): string;
//# sourceMappingURL=design-engine.d.ts.map