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
export type ActivityType = 'navigation' | 'click' | 'fill' | 'screenshot' | 'error' | 'snapshot' | 'command' | 'session' | 'lifecycle';
export interface ActivityEvent {
    id: string;
    type: ActivityType;
    timestamp: number;
    /** Human-readable summary */
    summary: string;
    /** Structured metadata */
    meta?: Record<string, unknown>;
    /** Duration in ms (for timed operations) */
    durationMs?: number;
    /** Session that produced this event */
    sessionId?: string;
}
export interface ActivitySubscription {
    id: string;
    callback: (event: ActivityEvent) => void;
}
export declare class ActivityTracker {
    private emitter;
    private buffer;
    private subscriptions;
    private subscriptionCounter;
    private logDir;
    private logFile;
    private pendingLines;
    private flushTimer;
    private disposed;
    constructor(stateDir: string, bufferSize?: number);
    /**
     * Record an activity event. Pushes to buffer, emits to subscribers,
     * and queues for disk flush.
     */
    record(type: ActivityType, summary: string, meta?: Record<string, unknown>, durationMs?: number, sessionId?: string): ActivityEvent;
    /**
     * Convenience: record a command execution.
     */
    recordCommand(cmd: string, args: string[], success: boolean, durationMs: number, sessionId?: string, error?: string): ActivityEvent;
    /**
     * Get the most recent N activity events (newest first).
     */
    getRecentActivity(limit?: number): ActivityEvent[];
    /**
     * Get all activity events in chronological order.
     */
    getAllActivity(): ActivityEvent[];
    /**
     * Get activity count.
     */
    get activityCount(): number;
    /**
     * Subscribe to real-time activity events. Returns a subscription ID
     * for later unsubscription.
     */
    subscribe(callback: (event: ActivityEvent) => void): string;
    /**
     * Unsubscribe by subscription ID.
     */
    unsubscribe(id: string): boolean;
    /**
     * Listen for activity events via the EventEmitter interface.
     */
    on(event: 'activity', listener: (ev: ActivityEvent) => void): void;
    /**
     * Remove an EventEmitter listener.
     */
    off(event: 'activity', listener: (ev: ActivityEvent) => void): void;
    /**
     * Flush pending log lines to disk. Called automatically every 1s.
     * Safe to call manually for guaranteed persistence.
     */
    flushToDisk(): void;
    /**
     * Rotate the log file. Renames current to .old and starts fresh.
     */
    rotateLog(): void;
    /**
     * Dispose the tracker. Flushes pending logs and stops the timer.
     */
    dispose(): void;
    private formatLogLine;
    private inferActivityType;
}
//# sourceMappingURL=activity.d.ts.map