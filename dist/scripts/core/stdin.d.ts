/**
 * aing stdin utility — timeout-protected stdin reading.
 * Pattern from OMC (issue #459): prevents indefinite hang on Linux/Windows.
 * @module scripts/core/stdin
 */
/**
 * Read all stdin with timeout to prevent hang.
 */
export declare function readStdinJSON(timeoutMs?: number): Promise<Record<string, unknown>>;
/**
 * Read raw stdin with timeout.
 */
export declare function readStdinRaw(timeoutMs?: number): Promise<string>;
//# sourceMappingURL=stdin.d.ts.map