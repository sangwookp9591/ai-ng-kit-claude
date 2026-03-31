/**
 * Smart Rebuild Check
 *
 * Compares source file mtimes vs generated file mtimes to skip unnecessary rebuilds.
 * Used by build scripts to avoid redundant work when sources haven't changed.
 *
 * @module scripts/build/smart-rebuild
 */
/**
 * Check if any source file is newer than the target file.
 */
export declare function needsRebuild(sources: string[], target: string): boolean;
interface SourceTargetPair {
    sources: string[];
    target: string;
}
/**
 * Check if rebuild is needed for multiple source-target pairs.
 * Returns the list of targets that need rebuilding.
 */
export declare function staleTargets(pairs: SourceTargetPair[]): string[];
export {};
//# sourceMappingURL=smart-rebuild.d.ts.map