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
import crypto from 'node:crypto';
import {
  writeFileSync,
  unlinkSync,
  mkdirSync,
  existsSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { BrowserManager } from './browser-manager.js';
import { dispatchCommand } from './dispatch.js';
import { COMMANDS } from './commands.js';
import { ActivityTracker } from './activity.js';
import type { ActivityEvent } from './activity.js';
import type { BrowseState } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REQUEST_BODY = 1_048_576; // 1 MB
const BROWSER_RESTART_DELAY_MS = 2_000;
const BROWSER_RESTART_MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Session Types
// ---------------------------------------------------------------------------

interface Session {
  id: string;
  createdAt: number;
  lastActivityAt: number;
  commandCount: number;
  userAgent?: string;
  remoteAddress?: string;
}

interface ServerHealth {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  sessions: number;
  activeSessionId: string | null;
  lastActivity: number | null;
  browser: boolean;
  browserRestarts: number;
  commandsProcessed: number;
  version: string;
}

interface RequestLog {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  sessionId?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Server Configuration
// ---------------------------------------------------------------------------

export interface ServerConfig {
  port: number;
  token: string;
  stateDir: string;
  headless: boolean;
  /** Optional binary version for state file metadata */
  binaryVersion?: string;
}

// ---------------------------------------------------------------------------
// BrowseServer Class
// ---------------------------------------------------------------------------

export class BrowseServer {
  private server: http.Server | null = null;
  private bm: BrowserManager;
  private activity: ActivityTracker;
  private config: ServerConfig;

  // Session tracking
  private sessions = new Map<string, Session>();
  private sessionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  // Server state
  private startedAt: number = 0;
  private isShuttingDown = false;
  private commandsProcessed = 0;
  private browserRestarts = 0;
  private lastActivityAt: number = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  // Browser auto-restart
  private isRestarting = false;
  private headless: boolean;

  // Request logging
  private requestLog: RequestLog[] = [];
  private readonly maxRequestLogs = 500;

  constructor(bm: BrowserManager, config: ServerConfig) {
    this.bm = bm;
    this.config = config;
    this.headless = config.headless;

    // Initialize activity tracker
    const logDir = config.stateDir;
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    this.activity = new ActivityTracker(logDir);
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start the HTTP server. Writes state file atomically after bind.
   */
  start(): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      this.startedAt = Date.now();

      const server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.config.port} already in use`));
        } else {
          console.error('[browse] Server error:', err);
          reject(err);
        }
      });

      server.listen(this.config.port, '127.0.0.1', () => {
        this.server = server;
        console.log(
          `[browse] Server listening on http://127.0.0.1:${this.config.port}`,
        );

        // Write state file atomically
        this.writeStateFile();

        // Start idle timer
        this.resetIdleTimer();

        // Record startup
        this.activity.record('lifecycle', 'Server started', {
          port: this.config.port,
          headless: this.headless,
        });

        // Register signal handlers
        this.registerSignalHandlers();

        resolve(server);
      });
    });
  }

  /**
   * Graceful shutdown: close browser, cleanup state, stop server.
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('[browse] Shutting down...');
    this.activity.record('lifecycle', 'Server shutting down');

    // Clear all timers
    this.clearIdleTimer();
    for (const timer of this.sessionTimeouts.values()) {
      clearTimeout(timer);
    }
    this.sessionTimeouts.clear();

    // Flush activity logs
    this.activity.dispose();

    // Close browser
    await this.bm.shutdown().catch(() => {});

    // Remove state file
    this.removeStateFile();

    // Close HTTP server
    if (this.server) {
      this.server.close(() => {
        console.log('[browse] Server closed.');
        process.exit(0);
      });
      // Force exit after 5s
      setTimeout(() => process.exit(0), 5_000).unref();
    } else {
      process.exit(0);
    }
  }

  // -----------------------------------------------------------------------
  // Request Handling
  // -----------------------------------------------------------------------

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): void {
    const startTime = Date.now();
    this.lastActivityAt = startTime;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Session-Id',
    );

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route request
    const url = req.url ?? '/';

    // Health check — no auth required
    if (req.method === 'GET' && url === '/health') {
      this.handleHealth(req, res, startTime);
      return;
    }

    // Auth check for all other routes
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${this.config.token}`) {
      this.sendJson(res, 401, { error: 'Unauthorized' });
      this.logRequest(req, 401, startTime);
      return;
    }

    // Reset idle timer on authenticated requests
    this.resetIdleTimer();

    // Authenticated routes
    switch (true) {
      case req.method === 'GET' && url === '/activity':
        this.handleActivity(req, res, startTime);
        break;
      case req.method === 'GET' && url === '/sessions':
        this.handleSessions(req, res, startTime);
        break;
      case req.method === 'GET' && url === '/commands':
        this.handleCommands(req, res, startTime);
        break;
      case req.method === 'POST' && url === '/command':
        this.handleCommand(req, res, startTime);
        break;
      default:
        this.sendJson(res, 404, { error: 'Not found' });
        this.logRequest(req, 404, startTime);
    }
  }

  // -----------------------------------------------------------------------
  // Endpoint Handlers
  // -----------------------------------------------------------------------

  private handleHealth(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    startTime: number,
  ): void {
    const health: ServerHealth = {
      status: this.getHealthStatus(),
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      sessions: this.sessions.size,
      activeSessionId: this.getActiveSessionId(),
      lastActivity: this.lastActivityAt || null,
      browser: this.bm.isLaunched(),
      browserRestarts: this.browserRestarts,
      commandsProcessed: this.commandsProcessed,
      version: this.config.binaryVersion ?? 'unknown',
    };

    this.sendJson(res, 200, health);
    this.logRequest(req, 200, startTime);
  }

  private handleActivity(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    startTime: number,
  ): void {
    // Parse limit from query string
    const urlObj = new URL(req.url ?? '/', `http://127.0.0.1`);
    const limitStr = urlObj.searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const clampedLimit = Math.min(Math.max(1, limit), 100);

    const events: ActivityEvent[] =
      this.activity.getRecentActivity(clampedLimit);

    this.sendJson(res, 200, {
      events,
      total: this.activity.activityCount,
    });
    this.logRequest(req, 200, startTime);
  }

  private handleSessions(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    startTime: number,
  ): void {
    const sessionList = Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      createdAt: new Date(s.createdAt).toISOString(),
      lastActivityAt: new Date(s.lastActivityAt).toISOString(),
      commandCount: s.commandCount,
      idleMs: Date.now() - s.lastActivityAt,
    }));

    this.sendJson(res, 200, { sessions: sessionList });
    this.logRequest(req, 200, startTime);
  }

  private handleCommands(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    startTime: number,
  ): void {
    const cmds = Array.from(COMMANDS.values()).map((c) => ({
      name: c.name,
      category: c.category,
      description: c.description,
      args: c.args,
    }));

    this.sendJson(res, 200, cmds);
    this.logRequest(req, 200, startTime);
  }

  private handleCommand(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    startTime: number,
  ): void {
    let body = '';
    let bodySize = 0;

    req.on('data', (chunk: Buffer | string) => {
      const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
      bodySize += chunkStr.length;
      if (bodySize > MAX_REQUEST_BODY) {
        this.sendJson(res, 413, { error: 'Request body too large' });
        req.destroy();
        return;
      }
      body += chunkStr;
    });

    req.on('end', async () => {
      try {
        const { cmd, args: cmdArgs, sessionId: clientSessionId } =
          JSON.parse(body) as {
            cmd: string;
            args?: string[];
            sessionId?: string;
          };

        if (!cmd) {
          this.sendJson(res, 400, { error: 'Missing "cmd" field' });
          this.logRequest(req, 400, startTime);
          return;
        }

        // Resolve or create session
        const sessionId = this.resolveSession(
          clientSessionId ?? req.headers['x-session-id'] as string | undefined,
          req,
        );

        // Check browser health before dispatch; attempt restart if down
        if (!this.bm.isLaunched() && !this.isRestarting) {
          const restarted = await this.restartBrowser();
          if (!restarted) {
            this.sendJson(res, 503, {
              success: false,
              output: '',
              error:
                'Browser is disconnected and could not be restarted',
            });
            this.logRequest(req, 503, startTime, sessionId);
            return;
          }
        }

        // Dispatch command
        const cmdStart = Date.now();
        const result = await dispatchCommand(
          cmd,
          cmdArgs ?? [],
          this.bm,
          () => this.shutdown(),
        );
        const cmdDuration = Date.now() - cmdStart;

        // Track
        this.commandsProcessed++;
        this.touchSession(sessionId);

        // Record activity
        this.activity.recordCommand(
          cmd,
          cmdArgs ?? [],
          result.success,
          cmdDuration,
          sessionId,
          result.error,
        );

        // Respond
        const status = result.success ? 200 : 400;
        this.sendJson(res, status, result);
        this.logRequest(req, status, startTime, sessionId);
      } catch (e: unknown) {
        const error =
          e instanceof Error ? e.message : 'Internal server error';
        this.sendJson(res, 500, {
          success: false,
          output: '',
          error,
        });
        this.activity.record('error', `Command handler error: ${error}`);
        this.logRequest(req, 500, startTime);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Session Management
  // -----------------------------------------------------------------------

  private resolveSession(
    clientSessionId: string | undefined,
    req: http.IncomingMessage,
  ): string {
    // Use client-provided session ID if it exists
    if (clientSessionId && this.sessions.has(clientSessionId)) {
      return clientSessionId;
    }

    // Create new session if none provided or not found
    const id = clientSessionId ?? this.generateSessionId();
    const session: Session = {
      id,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      commandCount: 0,
      userAgent: req.headers['user-agent'],
      remoteAddress: req.socket.remoteAddress,
    };
    this.sessions.set(id, session);

    // Set session timeout (30 min idle)
    this.resetSessionTimeout(id);

    this.activity.record('session', `Session created: ${id}`, {
      sessionId: id,
    });

    return id;
  }

  private touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      session.commandCount++;
      this.resetSessionTimeout(sessionId);
    }
  }

  private resetSessionTimeout(sessionId: string): void {
    const existing = this.sessionTimeouts.get(sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.sessions.delete(sessionId);
      this.sessionTimeouts.delete(sessionId);
      this.activity.record('session', `Session expired: ${sessionId}`, {
        sessionId,
      });
    }, IDLE_TIMEOUT_MS);
    timer.unref();
    this.sessionTimeouts.set(sessionId, timer);
  }

  private getActiveSessionId(): string | null {
    // Return the most recently active session
    let latest: Session | null = null;
    for (const s of this.sessions.values()) {
      if (!latest || s.lastActivityAt > latest.lastActivityAt) {
        latest = s;
      }
    }
    return latest?.id ?? null;
  }

  private generateSessionId(): string {
    return `sess_${crypto.randomBytes(8).toString('hex')}`;
  }

  // -----------------------------------------------------------------------
  // Browser Auto-Restart
  // -----------------------------------------------------------------------

  private async restartBrowser(): Promise<boolean> {
    if (this.isRestarting) return false;
    this.isRestarting = true;

    for (let attempt = 1; attempt <= BROWSER_RESTART_MAX_ATTEMPTS; attempt++) {
      console.log(
        `[browse] Browser disconnected. Restart attempt ${attempt}/${BROWSER_RESTART_MAX_ATTEMPTS}...`,
      );
      this.activity.record('lifecycle', `Browser restart attempt ${attempt}`, {
        attempt,
        maxAttempts: BROWSER_RESTART_MAX_ATTEMPTS,
      });

      try {
        await this.bm.shutdown().catch(() => {});
        await this.bm.launch(this.headless);
        this.browserRestarts++;
        this.isRestarting = false;

        console.log('[browse] Browser restarted successfully.');
        this.activity.record('lifecycle', 'Browser restarted successfully', {
          totalRestarts: this.browserRestarts,
        });
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[browse] Restart attempt ${attempt} failed: ${msg}`);

        if (attempt < BROWSER_RESTART_MAX_ATTEMPTS) {
          await new Promise((r) =>
            setTimeout(r, BROWSER_RESTART_DELAY_MS * attempt),
          );
        }
      }
    }

    this.isRestarting = false;
    this.activity.record(
      'error',
      'Browser restart failed after all attempts',
    );
    return false;
  }

  // -----------------------------------------------------------------------
  // State File (Atomic Writes)
  // -----------------------------------------------------------------------

  private writeStateFile(): void {
    const stateDir = this.config.stateDir;
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    const stateFile = join(stateDir, 'browse.json');
    const tmpFile = join(stateDir, `browse.json.${process.pid}.tmp`);

    const state: BrowseState & {
      binaryVersion?: string;
      sessions?: number;
    } = {
      pid: process.pid,
      port: this.config.port,
      token: this.config.token,
      startedAt: new Date(this.startedAt).toISOString(),
      mode: this.headless ? 'headless' : 'headed',
      binaryVersion: this.config.binaryVersion,
      sessions: this.sessions.size,
    };

    const data = JSON.stringify(state, null, 2);

    try {
      // Write to temp file first
      writeFileSync(tmpFile, data, { mode: 0o600 });
      // Atomic rename
      renameSync(tmpFile, stateFile);
    } catch (err) {
      // Fallback: direct write
      try {
        writeFileSync(stateFile, data, { mode: 0o600 });
      } catch {
        console.error('[browse] Failed to write state file');
      }
      // Cleanup temp
      try {
        unlinkSync(tmpFile);
      } catch {
        // ignore
      }
    }
  }

  private removeStateFile(): void {
    const stateFile = join(this.config.stateDir, 'browse.json');
    try {
      if (existsSync(stateFile)) {
        unlinkSync(stateFile);
      }
    } catch {
      // Best-effort cleanup
    }
  }

  // -----------------------------------------------------------------------
  // Idle Timer
  // -----------------------------------------------------------------------

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      console.log('[browse] Idle timeout reached, shutting down.');
      this.activity.record('lifecycle', 'Idle timeout reached');
      this.shutdown();
    }, IDLE_TIMEOUT_MS);
    this.idleTimer.unref();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // Signal Handlers
  // -----------------------------------------------------------------------

  private registerSignalHandlers(): void {
    const handler = () => {
      this.shutdown();
    };
    process.on('SIGTERM', handler);
    process.on('SIGINT', handler);

    // Handle uncaught errors gracefully
    process.on('uncaughtException', (err) => {
      console.error('[browse] Uncaught exception:', err);
      this.activity.record('error', `Uncaught exception: ${err.message}`);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      const msg =
        reason instanceof Error ? reason.message : String(reason);
      console.error('[browse] Unhandled rejection:', msg);
      this.activity.record('error', `Unhandled rejection: ${msg}`);
    });
  }

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  private sendJson(
    res: http.ServerResponse,
    status: number,
    data: unknown,
  ): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  private getHealthStatus(): 'ok' | 'degraded' | 'error' {
    if (!this.bm.isLaunched()) return 'error';
    if (this.browserRestarts > 0) return 'degraded';
    return 'ok';
  }

  private logRequest(
    req: http.IncomingMessage,
    status: number,
    startTime: number,
    sessionId?: string,
  ): void {
    const durationMs = Date.now() - startTime;
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';

    const entry: RequestLog = {
      method,
      url,
      status,
      durationMs,
      sessionId,
      timestamp: startTime,
    };

    // Keep bounded request log
    this.requestLog.push(entry);
    if (this.requestLog.length > this.maxRequestLogs) {
      this.requestLog.shift();
    }

    // Console log for observability
    const sessionTag = sessionId ? ` [${sessionId}]` : '';
    console.log(
      `[browse] ${method} ${url} ${status} ${durationMs}ms${sessionTag}`,
    );
  }

  // -----------------------------------------------------------------------
  // Public Accessors (for testing)
  // -----------------------------------------------------------------------

  getActivity(): ActivityTracker {
    return this.activity;
  }

  getRequestLog(): RequestLog[] {
    return [...this.requestLog];
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

// ---------------------------------------------------------------------------
// Legacy API — backward compatible with existing start-server.ts
// ---------------------------------------------------------------------------

/**
 * Start a browse server with the classic (port, token, bm) signature.
 * Maintained for backward compatibility with existing callers.
 */
export function startServer(
  port: number,
  token: string,
  bm: BrowserManager,
  options?: {
    stateDir?: string;
    headless?: boolean;
    binaryVersion?: string;
  },
): http.Server {
  const stateDir = options?.stateDir ?? join(process.cwd(), '.aing');

  const config: ServerConfig = {
    port,
    token,
    stateDir,
    headless: options?.headless ?? true,
    binaryVersion: options?.binaryVersion,
  };

  const server = new BrowseServer(bm, config);

  // Start is async but the legacy API returns synchronously.
  // We create the server inline and start it.
  const httpServer = http.createServer((req, res) => {
    // Proxy to the BrowseServer instance
    (server as any).handleRequest(req, res);
  });

  (server as any).startedAt = Date.now();
  (server as any).server = httpServer;

  // Idle timer
  let idleTimer: ReturnType<typeof setTimeout>;
  function resetIdleTimer(): void {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      console.log('[browse] Idle timeout reached, shutting down.');
      server.shutdown();
    }, IDLE_TIMEOUT_MS);
    idleTimer.unref();
  }

  httpServer.listen(port, '127.0.0.1', () => {
    console.log(`[browse] Server listening on http://127.0.0.1:${port}`);
    resetIdleTimer();

    // Write state file
    (server as any).writeStateFile();
  });

  httpServer.on('error', (err) => {
    console.error('[browse] Server error:', err);
    process.exit(1);
  });

  // Signals
  process.on('SIGTERM', () => server.shutdown());
  process.on('SIGINT', () => server.shutdown());

  // Reset idle on each request by wrapping
  const origEmit = httpServer.emit.bind(httpServer);
  httpServer.emit = function (
    event: string,
    ...args: unknown[]
  ): boolean {
    if (event === 'request') {
      resetIdleTimer();
    }
    return origEmit(event, ...args);
  };

  return httpServer;
}
