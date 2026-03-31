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
import { appendFileSync, writeFileSync, mkdirSync, existsSync, renameSync, } from 'node:fs';
import { join } from 'node:path';
// ---------------------------------------------------------------------------
// CircularBuffer — generic O(1) ring buffer
// ---------------------------------------------------------------------------
export class CircularBuffer {
    capacity;
    buffer;
    head = 0;
    size = 0;
    constructor(capacity = 50_000) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }
    push(item) {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        }
    }
    getAll() {
        if (this.size === 0)
            return [];
        if (this.size < this.capacity) {
            return this.buffer.slice(0, this.size);
        }
        // Buffer is full — head points to the oldest entry
        return [
            ...this.buffer.slice(this.head),
            ...this.buffer.slice(0, this.head),
        ];
    }
    /**
     * Get the most recent N items (newest first).
     */
    getRecent(limit) {
        if (this.size === 0)
            return [];
        const count = Math.min(limit, this.size);
        const result = [];
        for (let i = 0; i < count; i++) {
            const idx = (this.head - 1 - i + this.capacity) % this.capacity;
            result.push(this.buffer[idx]);
        }
        return result;
    }
    clear() {
        this.head = 0;
        this.size = 0;
        this.buffer = new Array(this.capacity);
    }
    get length() {
        return this.size;
    }
}
export class FlushableBuffer {
    buffer;
    pendingEntries = [];
    flushTimer = null;
    logFile;
    formatter;
    disposed = false;
    constructor(logDir, logFileName, formatter, capacity = 50_000, flushIntervalMs = 1_000) {
        this.buffer = new CircularBuffer(capacity);
        this.formatter = formatter;
        this.logFile = join(logDir, logFileName);
        // Ensure log directory exists
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }
        // Start periodic flush
        this.flushTimer = setInterval(() => this.flush(), flushIntervalMs);
        this.flushTimer.unref();
    }
    push(item) {
        this.buffer.push(item);
        this.pendingEntries.push(item);
    }
    getAll() {
        return this.buffer.getAll();
    }
    getRecent(limit) {
        return this.buffer.getRecent(limit);
    }
    clear() {
        this.buffer.clear();
        this.pendingEntries = [];
    }
    get length() {
        return this.buffer.length;
    }
    /**
     * Flush pending entries to disk. Called automatically every interval.
     * Safe to call manually for guaranteed persistence.
     */
    flush() {
        if (this.pendingEntries.length === 0)
            return;
        const entries = this.pendingEntries.splice(0);
        const lines = entries.map(this.formatter).join('\n') + '\n';
        try {
            appendFileSync(this.logFile, lines);
        }
        catch {
            // Best-effort — never crash for logging
        }
    }
    /**
     * Rotate the log file: current -> .old, start fresh.
     */
    rotate() {
        this.flush();
        try {
            const oldFile = this.logFile + '.old';
            if (existsSync(this.logFile)) {
                renameSync(this.logFile, oldFile);
            }
            writeFileSync(this.logFile, '');
        }
        catch {
            // Best-effort rotation
        }
    }
    /**
     * Dispose: flush remaining entries and stop the timer.
     */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.flush();
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
// ---------------------------------------------------------------------------
// Formatters — one per buffer type
// ---------------------------------------------------------------------------
export const consoleFormatter = (entry) => {
    const ts = new Date(entry.timestamp).toISOString();
    const src = entry.source ? ` (${entry.source})` : '';
    return `[${ts}] [${entry.level}] ${entry.message}${src}`;
};
export const networkFormatter = (entry) => {
    const ts = new Date(entry.timestamp).toISOString();
    const dur = entry.duration !== undefined ? ` (${entry.duration}ms)` : '';
    return `[${ts}] ${entry.method} ${entry.status} ${entry.url}${dur}`;
};
export const dialogFormatter = (entry) => {
    const ts = new Date(entry.timestamp).toISOString();
    const def = entry.defaultValue ? ` default="${entry.defaultValue}"` : '';
    return `[${ts}] [${entry.type}] ${entry.message}${def}`;
};
export function createBufferSet(logDir) {
    const consoleBuf = new FlushableBuffer(logDir, 'browse-console.log', consoleFormatter, 50_000);
    const networkBuf = new FlushableBuffer(logDir, 'browse-network.log', networkFormatter, 50_000);
    const dialogBuf = new FlushableBuffer(logDir, 'browse-dialog.log', dialogFormatter, 50_000);
    return {
        console: consoleBuf,
        network: networkBuf,
        dialog: dialogBuf,
        disposeAll() {
            consoleBuf.dispose();
            networkBuf.dispose();
            dialogBuf.dispose();
        },
        flushAll() {
            consoleBuf.flush();
            networkBuf.flush();
            dialogBuf.flush();
        },
    };
}
//# sourceMappingURL=buffers.js.map