/**
 * aing State Manager — Atomic file I/O
 * All writes use temp+rename pattern to prevent corruption.
 * @module scripts/core/state
 */
interface ReadStateSuccess {
    ok: true;
    data: unknown;
}
interface ReadStateFailure {
    ok: false;
    error: string;
}
type ReadStateResult = ReadStateSuccess | ReadStateFailure;
interface WriteStateSuccess {
    ok: true;
}
interface WriteStateFailure {
    ok: false;
    error: string;
}
type WriteStateResult = WriteStateSuccess | WriteStateFailure;
interface UpdateStateSuccess {
    ok: true;
    data: unknown;
}
type UpdateStateResult = UpdateStateSuccess | WriteStateFailure;
export declare function cacheInvalidate(filePath: string): void;
/**
 * Read JSON state file safely. Results are cached with a 5s TTL.
 * @param filePath - Absolute path to JSON file
 */
export declare function readState(filePath: string): ReadStateResult;
/**
 * Write JSON state file atomically (temp file + rename).
 * Acquires an advisory lock, invalidates the read cache.
 * @param filePath - Absolute path to target file
 * @param data - Data to serialize as JSON
 */
export declare function writeState(filePath: string, data: unknown): WriteStateResult;
/**
 * Delete a state file if it exists.
 */
export declare function deleteState(filePath: string): WriteStateResult;
/**
 * Read state with fallback to default value.
 */
export declare function readStateOrDefault(filePath: string, defaultValue: unknown): unknown;
/**
 * Atomic read-modify-write with retry on conflict.
 * Solves race conditions in multi-agent environments by retrying
 * when the file changes between read and write.
 * @param filePath - Absolute path to JSON file
 * @param defaultValue - Default if file doesn't exist
 * @param mutator - Function that modifies and returns data
 * @param maxRetries - Max retry attempts
 */
export declare function updateState(filePath: string, defaultValue: unknown | (() => unknown), mutator: (data: unknown) => unknown, maxRetries?: number): UpdateStateResult;
export {};
//# sourceMappingURL=state.d.ts.map