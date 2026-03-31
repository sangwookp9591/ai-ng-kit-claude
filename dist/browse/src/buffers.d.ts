/**
 * Circular Log Buffers — O(1) push, async disk flush, crash-safe.
 *
 * Three buffer types: console (50K), network (50K), dialog (50K).
 * Each buffer periodically flushes to .aing/browse-{type}.log every 1s.
 * Survives server crashes with up to 1s data loss.
 *
 * Zero external deps — uses node:fs only.
 * @module browse/src/buffers
 */
export interface LogEntry {
    level: string;
    message: string;
    timestamp: number;
    source?: string;
}
export interface NetworkEntry {
    method: string;
    url: string;
    status: number;
    timestamp: number;
    duration?: number;
}
export interface DialogEntry {
    type: string;
    message: string;
    timestamp: number;
    defaultValue?: string;
}
export declare class CircularBuffer<T> {
    private capacity;
    private buffer;
    private head;
    private size;
    constructor(capacity?: number);
    push(item: T): void;
    getAll(): T[];
    /**
     * Get the most recent N items (newest first).
     */
    getRecent(limit: number): T[];
    clear(): void;
    get length(): number;
}
export type LogFormatter<T> = (entry: T) => string;
export declare class FlushableBuffer<T> {
    private buffer;
    private pendingEntries;
    private flushTimer;
    private logFile;
    private formatter;
    private disposed;
    constructor(logDir: string, logFileName: string, formatter: LogFormatter<T>, capacity?: number, flushIntervalMs?: number);
    push(item: T): void;
    getAll(): T[];
    getRecent(limit: number): T[];
    clear(): void;
    get length(): number;
    /**
     * Flush pending entries to disk. Called automatically every interval.
     * Safe to call manually for guaranteed persistence.
     */
    flush(): void;
    /**
     * Rotate the log file: current -> .old, start fresh.
     */
    rotate(): void;
    /**
     * Dispose: flush remaining entries and stop the timer.
     */
    dispose(): void;
}
export declare const consoleFormatter: LogFormatter<LogEntry>;
export declare const networkFormatter: LogFormatter<NetworkEntry>;
export declare const dialogFormatter: LogFormatter<DialogEntry>;
export interface BufferSet {
    console: FlushableBuffer<LogEntry>;
    network: FlushableBuffer<NetworkEntry>;
    dialog: FlushableBuffer<DialogEntry>;
    disposeAll(): void;
    flushAll(): void;
}
export declare function createBufferSet(logDir: string): BufferSet;
//# sourceMappingURL=buffers.d.ts.map