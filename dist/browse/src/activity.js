/**
 * Activity Pub/Sub System — EventEmitter-based activity tracking.
 *
 * Tracks all browse daemon operations (navigation, click, fill, screenshot,
 * error, snapshot) in a circular buffer and provides pub/sub for real-time
 * consumers. Flushes activity log to disk asynchronously.
 *
 * Zero external deps — uses node:events, node:fs, node:path only.
 * @module browse/src/activity
 */
import { EventEmitter } from 'node:events';
import { writeFileSync, appendFileSync, mkdirSync, existsSync, renameSync, } from 'node:fs';
import { join } from 'node:path';
// ---------------------------------------------------------------------------
// Circular Activity Buffer
// ---------------------------------------------------------------------------
class ActivityBuffer {
    capacity;
    buffer;
    head = 0;
    size = 0;
    constructor(capacity = 100) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }
    push(event) {
        this.buffer[this.head] = event;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        }
    }
    getRecent(limit) {
        if (this.size === 0)
            return [];
        const count = Math.min(limit, this.size);
        const result = [];
        // Walk backwards from the most recent entry
        for (let i = 0; i < count; i++) {
            const idx = (this.head - 1 - i + this.capacity) % this.capacity;
            result.push(this.buffer[idx]);
        }
        return result;
    }
    getAll() {
        if (this.size === 0)
            return [];
        if (this.size < this.capacity) {
            return this.buffer.slice(0, this.size);
        }
        return [
            ...this.buffer.slice(this.head),
            ...this.buffer.slice(0, this.head),
        ];
    }
    get length() {
        return this.size;
    }
    clear() {
        this.head = 0;
        this.size = 0;
        this.buffer = new Array(this.capacity);
    }
}
// ---------------------------------------------------------------------------
// Activity Tracker
// ---------------------------------------------------------------------------
let activityIdCounter = 0;
function generateActivityId() {
    return `act_${Date.now()}_${++activityIdCounter}`;
}
export class ActivityTracker {
    emitter = new EventEmitter();
    buffer;
    subscriptions = new Map();
    subscriptionCounter = 0;
    logDir;
    logFile;
    pendingLines = [];
    flushTimer = null;
    disposed = false;
    constructor(stateDir, bufferSize = 100) {
        this.buffer = new ActivityBuffer(bufferSize);
        this.logDir = stateDir;
        this.logFile = join(stateDir, 'browse-activity.log');
        // Ensure log directory exists
        if (!existsSync(this.logDir)) {
            mkdirSync(this.logDir, { recursive: true });
        }
        // Start periodic flush (1s interval)
        this.flushTimer = setInterval(() => this.flushToDisk(), 1_000);
        this.flushTimer.unref(); // Don't prevent process exit
    }
    // -------------------------------------------------------------------------
    // Core API
    // -------------------------------------------------------------------------
    /**
     * Record an activity event. Pushes to buffer, emits to subscribers,
     * and queues for disk flush.
     */
    record(type, summary, meta, durationMs, sessionId) {
        const event = {
            id: generateActivityId(),
            type,
            timestamp: Date.now(),
            summary,
            meta,
            durationMs,
            sessionId,
        };
        this.buffer.push(event);
        this.emitter.emit('activity', event);
        // Notify all subscribers
        for (const sub of this.subscriptions.values()) {
            try {
                sub.callback(event);
            }
            catch {
                // Subscriber errors must not break the tracker
            }
        }
        // Queue for disk flush
        this.pendingLines.push(this.formatLogLine(event));
        return event;
    }
    /**
     * Convenience: record a command execution.
     */
    recordCommand(cmd, args, success, durationMs, sessionId, error) {
        const type = this.inferActivityType(cmd);
        const summary = success
            ? `${cmd}(${args.join(', ')}) completed in ${durationMs}ms`
            : `${cmd}(${args.join(', ')}) failed: ${error ?? 'unknown'}`;
        return this.record(type, summary, { cmd, args, success, error }, durationMs, sessionId);
    }
    /**
     * Get the most recent N activity events (newest first).
     */
    getRecentActivity(limit = 20) {
        return this.buffer.getRecent(limit);
    }
    /**
     * Get all activity events in chronological order.
     */
    getAllActivity() {
        return this.buffer.getAll();
    }
    /**
     * Get activity count.
     */
    get activityCount() {
        return this.buffer.length;
    }
    // -------------------------------------------------------------------------
    // Pub/Sub
    // -------------------------------------------------------------------------
    /**
     * Subscribe to real-time activity events. Returns a subscription ID
     * for later unsubscription.
     */
    subscribe(callback) {
        const id = `sub_${++this.subscriptionCounter}`;
        this.subscriptions.set(id, { id, callback });
        return id;
    }
    /**
     * Unsubscribe by subscription ID.
     */
    unsubscribe(id) {
        return this.subscriptions.delete(id);
    }
    /**
     * Listen for activity events via the EventEmitter interface.
     */
    on(event, listener) {
        this.emitter.on(event, listener);
    }
    /**
     * Remove an EventEmitter listener.
     */
    off(event, listener) {
        this.emitter.off(event, listener);
    }
    // -------------------------------------------------------------------------
    // Disk Flush
    // -------------------------------------------------------------------------
    /**
     * Flush pending log lines to disk. Called automatically every 1s.
     * Safe to call manually for guaranteed persistence.
     */
    flushToDisk() {
        if (this.pendingLines.length === 0)
            return;
        const lines = this.pendingLines.splice(0);
        const chunk = lines.join('\n') + '\n';
        try {
            appendFileSync(this.logFile, chunk);
        }
        catch {
            // If append fails (disk full, permissions), silently drop.
            // Activity log is best-effort; we never crash for logging.
        }
    }
    /**
     * Rotate the log file. Renames current to .old and starts fresh.
     */
    rotateLog() {
        this.flushToDisk();
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
    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------
    /**
     * Dispose the tracker. Flushes pending logs and stops the timer.
     */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.flushToDisk();
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        this.subscriptions.clear();
        this.emitter.removeAllListeners();
    }
    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------
    formatLogLine(event) {
        const ts = new Date(event.timestamp).toISOString();
        const meta = event.meta ? ` ${JSON.stringify(event.meta)}` : '';
        const dur = event.durationMs !== undefined ? ` (${event.durationMs}ms)` : '';
        return `[${ts}] [${event.type}] ${event.summary}${dur}${meta}`;
    }
    inferActivityType(cmd) {
        switch (cmd) {
            case 'goto':
            case 'back':
            case 'forward':
            case 'reload':
                return 'navigation';
            case 'click':
            case 'hover':
            case 'press':
            case 'select':
                return 'click';
            case 'fill':
            case 'type':
                return 'fill';
            case 'screenshot':
            case 'responsive':
                return 'screenshot';
            case 'snapshot':
                return 'snapshot';
            default:
                return 'command';
        }
    }
}
//# sourceMappingURL=activity.js.map