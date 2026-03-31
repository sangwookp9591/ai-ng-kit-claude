/**
 * Browse Server — production-grade HTTP daemon for headless browser control.
 *
 * Features:
 * - Session management with IDs, idle timeout, state persistence
 * - Bearer token authentication
 * - Activity pub/sub tracking for all commands
 * - /health, /activity, /sessions, /commands, /command endpoints
 * - Graceful shutdown (SIGTERM/SIGINT → cleanup browser + state file)
 * - Auto-restart on browser crash (detect disconnected, relaunch)
 * - Request logging with timing
 * - Atomic state file writes (temp + rename, mode 0o600)
 * - Stale session detection (check PID alive on reconnect)
 *
 * Zero external deps — uses node:http, node:fs, node:crypto, node:path only.
 * @module browse/src/server
 */
import http from 'node:http';
import { BrowserManager } from './browser-manager.js';
import { ActivityTracker } from './activity.js';
interface RequestLog {
    method: string;
    url: string;
    status: number;
    durationMs: number;
    sessionId?: string;
    timestamp: number;
}
export interface ServerConfig {
    port: number;
    token: string;
    stateDir: string;
    headless: boolean;
    /** Optional binary version for state file metadata */
    binaryVersion?: string;
}
export declare class BrowseServer {
    private server;
    private bm;
    private activity;
    private config;
    private sessions;
    private sessionTimeouts;
    private startedAt;
    private isShuttingDown;
    private commandsProcessed;
    private browserRestarts;
    private lastActivityAt;
    private idleTimer;
    private isRestarting;
    private headless;
    private requestLog;
    private readonly maxRequestLogs;
    constructor(bm: BrowserManager, config: ServerConfig);
    /**
     * Start the HTTP server. Writes state file atomically after bind.
     */
    start(): Promise<http.Server>;
    /**
     * Graceful shutdown: close browser, cleanup state, stop server.
     */
    shutdown(): Promise<void>;
    private handleRequest;
    private handleHealth;
    private handleActivity;
    private handleSessions;
    private handleCommands;
    private handleCommand;
    private resolveSession;
    private touchSession;
    private resetSessionTimeout;
    private getActiveSessionId;
    private generateSessionId;
    private restartBrowser;
    private writeStateFile;
    private removeStateFile;
    private resetIdleTimer;
    private clearIdleTimer;
    private registerSignalHandlers;
    private sendJson;
    private getHealthStatus;
    private logRequest;
    getActivity(): ActivityTracker;
    getRequestLog(): RequestLog[];
    getSessionCount(): number;
}
/**
 * Start a browse server with the classic (port, token, bm) signature.
 * Maintained for backward compatibility with existing callers.
 */
export declare function startServer(port: number, token: string, bm: BrowserManager, options?: {
    stateDir?: string;
    headless?: boolean;
    binaryVersion?: string;
}): http.Server;
export {};
//# sourceMappingURL=server.d.ts.map