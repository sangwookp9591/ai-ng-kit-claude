#!/usr/bin/env node
/**
 * Server entry point — spawned by CLI as a detached background process.
 *
 * Features:
 * - Check if server already running (read state file, check PID)
 * - If running and healthy, return existing port
 * - If stale, cleanup and restart
 * - Write state file atomically after successful start
 * - Port selection: random 10000-60000 (avoid conflicts)
 *
 * Usage: node start-server.js [port] <token> [headless|headed]
 *   If port is 0 or omitted, picks a random port in 10000-60000.
 */
export {};
//# sourceMappingURL=start-server.d.ts.map