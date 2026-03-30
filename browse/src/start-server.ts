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

import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import http from 'node:http';
import { join, dirname } from 'node:path';
import { BrowserManager } from './browser-manager.js';
import { BrowseServer } from './server.js';
import type { ServerConfig } from './server.js';
import type { BrowseState } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    if (existsSync(join(dir, '.git'))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();
const STATE_DIR = join(PROJECT_ROOT, '.aing');
const STATE_FILE = join(STATE_DIR, 'browse.json');

function readState(): BrowseState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as BrowseState;
  } catch {
    return null;
  }
}

function clearState(): void {
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch {
    // best-effort
  }
}

/**
 * Check if a PID is alive (works on macOS and Linux).
 */
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // Signal 0: check existence without killing
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the server at the given port responds to /health.
 */
function isServerHealthy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${port}/health`,
      { timeout: 3_000 },
      (res) => {
        let body = '';
        res.on('data', (c: Buffer) => (body += c.toString()));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data.status === 'ok' || data.status === 'degraded');
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Pick a random port between 10000-60000.
 */
function randomPort(): number {
  return 10_000 + Math.floor(Math.random() * 50_000);
}

/**
 * Check if an existing server is still alive and healthy.
 * Returns the state if healthy, null if stale.
 */
async function checkExistingServer(): Promise<BrowseState | null> {
  const state = readState();
  if (!state) return null;

  // First: quick PID check (no network needed)
  if (!isPidAlive(state.pid)) {
    console.log(
      `[browse] Stale state detected (PID ${state.pid} not alive). Cleaning up.`,
    );
    clearState();
    return null;
  }

  // Second: health check via HTTP
  const healthy = await isServerHealthy(state.port);
  if (healthy) {
    return state;
  }

  // PID alive but not responding — possibly hung. Clean up.
  console.log(
    `[browse] Server PID ${state.pid} alive but not responding. Cleaning up.`,
  );
  clearState();
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const portArg = parseInt(process.argv[2], 10);
  const token = process.argv[3];
  const mode = process.argv[4] ?? 'headless';

  if (!token) {
    console.error('Usage: start-server [port] <token> [headless|headed]');
    process.exit(1);
  }

  // Check for existing healthy server
  const existing = await checkExistingServer();
  if (existing) {
    console.log(
      `[browse] Server already running on port ${existing.port} (PID ${existing.pid})`,
    );
    // Output JSON so parent process can parse it
    console.log(
      JSON.stringify({
        status: 'already_running',
        port: existing.port,
        pid: existing.pid,
      }),
    );
    process.exit(0);
  }

  // Determine port
  const port = portArg && portArg > 0 ? portArg : randomPort();
  const headless = mode !== 'headed';

  // Launch browser
  const bm = new BrowserManager();
  try {
    await bm.launch(headless);
    console.log(`[browse] Browser launched (${mode})`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[browse] Failed to launch browser: ${msg}`);
    process.exit(1);
  }

  // Configure and start server
  const config: ServerConfig = {
    port,
    token,
    stateDir: STATE_DIR,
    headless,
  };

  const server = new BrowseServer(bm, config);

  try {
    await server.start();
    console.log(
      JSON.stringify({
        status: 'started',
        port,
        pid: process.pid,
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[browse] Failed to start server: ${msg}`);
    await bm.shutdown().catch(() => {});
    process.exit(1);
  }
}

main();
