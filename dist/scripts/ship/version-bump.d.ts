export interface SemVer {
    major: number;
    minor: number;
    patch: number;
}
export type BumpType = 'major' | 'minor' | 'patch';
export interface BumpSignals {
    filesChanged?: number;
    hasBreaking: boolean;
    hasNewFeature: boolean;
    hasBugFix?: boolean;
}
export interface BumpResult {
    oldVersion: string;
    newVersion: string;
    bumpType: string;
}
/**
 * Parse semantic version string.
 */
export declare function parseVersion(version: string): SemVer;
/**
 * Determine bump type from change signals.
 */
export declare function determineBumpType(signals: BumpSignals): BumpType;
/**
 * Bump version and write to VERSION file.
 */
export declare function bumpVersion(bumpType: BumpType, projectDir?: string): BumpResult;
/**
 * Read current version without modifying.
 */
export declare function readVersion(projectDir?: string): string;
//# sourceMappingURL=version-bump.d.ts.map