/**
 * aing Version Detect v1.0.0
 * Detects project tech stack versions from package.json, requirements.txt, etc.
 * Used by worker prompts to ensure version-appropriate code generation.
 * @module scripts/context/version-detect
 */
export interface TechStackVersion {
    name: string;
    version: string;
    major: number;
}
export interface DetectedStack {
    versions: TechStackVersion[];
    summary: string;
}
/**
 * Detect tech stack versions from the project directory.
 */
export declare function detectVersions(projectDir: string): DetectedStack;
/**
 * Generate a version-aware prompt snippet for agent workers.
 * Includes version warnings and doc lookup instructions.
 */
export declare function generateVersionContext(projectDir: string): string;
//# sourceMappingURL=version-detect.d.ts.map