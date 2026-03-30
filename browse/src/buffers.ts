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

import {
  appendFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CircularBuffer — generic O(1) ring buffer
// ---------------------------------------------------------------------------

export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private size: number = 0;

  constructor(private capacity: number = 50_000) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  getAll(): T[] {
    if (this.size === 0) return [];
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
  getRecent(limit: number): T[] {
    if (this.size === 0) return [];
    const count = Math.min(limit, this.size);
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      result.push(this.buffer[idx]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
    this.buffer = new Array(this.capacity);
  }

  get length(): number {
    return this.size;
  }
}

// ---------------------------------------------------------------------------
// FlushableBuffer — CircularBuffer + periodic disk flush
// ---------------------------------------------------------------------------

export type LogFormatter<T> = (entry: T) => string;

export class FlushableBuffer<T> {
  private buffer: CircularBuffer<T>;
  private pendingEntries: T[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private logFile: string;
  private formatter: LogFormatter<T>;
  private disposed = false;

  constructor(
    logDir: string,
    logFileName: string,
    formatter: LogFormatter<T>,
    capacity: number = 50_000,
    flushIntervalMs: number = 1_000,
  ) {
    this.buffer = new CircularBuffer<T>(capacity);
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

  push(item: T): void {
    this.buffer.push(item);
    this.pendingEntries.push(item);
  }

  getAll(): T[] {
    return this.buffer.getAll();
  }

  getRecent(limit: number): T[] {
    return this.buffer.getRecent(limit);
  }

  clear(): void {
    this.buffer.clear();
    this.pendingEntries = [];
  }

  get length(): number {
    return this.buffer.length;
  }

  /**
   * Flush pending entries to disk. Called automatically every interval.
   * Safe to call manually for guaranteed persistence.
   */
  flush(): void {
    if (this.pendingEntries.length === 0) return;

    const entries = this.pendingEntries.splice(0);
    const lines = entries.map(this.formatter).join('\n') + '\n';

    try {
      appendFileSync(this.logFile, lines);
    } catch {
      // Best-effort — never crash for logging
    }
  }

  /**
   * Rotate the log file: current -> .old, start fresh.
   */
  rotate(): void {
    this.flush();
    try {
      const oldFile = this.logFile + '.old';
      if (existsSync(this.logFile)) {
        renameSync(this.logFile, oldFile);
      }
      writeFileSync(this.logFile, '');
    } catch {
      // Best-effort rotation
    }
  }

  /**
   * Dispose: flush remaining entries and stop the timer.
   */
  dispose(): void {
    if (this.disposed) return;
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

export const consoleFormatter: LogFormatter<LogEntry> = (entry) => {
  const ts = new Date(entry.timestamp).toISOString();
  const src = entry.source ? ` (${entry.source})` : '';
  return `[${ts}] [${entry.level}] ${entry.message}${src}`;
};

export const networkFormatter: LogFormatter<NetworkEntry> = (entry) => {
  const ts = new Date(entry.timestamp).toISOString();
  const dur = entry.duration !== undefined ? ` (${entry.duration}ms)` : '';
  return `[${ts}] ${entry.method} ${entry.status} ${entry.url}${dur}`;
};

export const dialogFormatter: LogFormatter<DialogEntry> = (entry) => {
  const ts = new Date(entry.timestamp).toISOString();
  const def = entry.defaultValue ? ` default="${entry.defaultValue}"` : '';
  return `[${ts}] [${entry.type}] ${entry.message}${def}`;
};

// ---------------------------------------------------------------------------
// Factory — create a full set of flushable buffers
// ---------------------------------------------------------------------------

export interface BufferSet {
  console: FlushableBuffer<LogEntry>;
  network: FlushableBuffer<NetworkEntry>;
  dialog: FlushableBuffer<DialogEntry>;
  disposeAll(): void;
  flushAll(): void;
}

export function createBufferSet(logDir: string): BufferSet {
  const consoleBuf = new FlushableBuffer<LogEntry>(
    logDir,
    'browse-console.log',
    consoleFormatter,
    50_000,
  );
  const networkBuf = new FlushableBuffer<NetworkEntry>(
    logDir,
    'browse-network.log',
    networkFormatter,
    50_000,
  );
  const dialogBuf = new FlushableBuffer<DialogEntry>(
    logDir,
    'browse-dialog.log',
    dialogFormatter,
    50_000,
  );

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
