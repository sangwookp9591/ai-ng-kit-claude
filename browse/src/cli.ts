#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import type { BrowseState, CommandResult } from './types.js';
import { COMMANDS } from './commands.js';

// Resolve state file relative to project root
function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    if (existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();
const STATE_DIR = path.join(PROJECT_ROOT, '.aing');
const STATE_FILE = path.join(STATE_DIR, 'browse.json');
const DEFAULT_PORT = 9222;

function readState(): BrowseState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    return data as BrowseState;
  } catch {
    return null;
  }
}

function writeState(state: BrowseState): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function clearState(): void {
  if (existsSync(STATE_FILE)) {
    unlinkSync(STATE_FILE);
  }
}

function isServerAlive(state: BrowseState): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${state.port}/health`, { timeout: 3_000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.status === 'ok');
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sendCommand(state: BrowseState, cmd: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ cmd, args });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: state.port,
        path: '/command',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${state.token}`,
        },
        timeout: 60_000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ success: false, output: '', error: `Invalid response: ${body}` });
          }
        });
      },
    );
    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.write(payload);
    req.end();
  });
}

async function ensureServer(headless: boolean = true): Promise<BrowseState> {
  const existing = readState();
  if (existing) {
    const alive = await isServerAlive(existing);
    if (alive) return existing;
    // Stale state — clean up
    clearState();
  }

  // Start new server
  const port = DEFAULT_PORT;
  const token = crypto.randomBytes(16).toString('hex');

  const serverScript = path.join(path.dirname(new URL(import.meta.url).pathname), 'start-server.js');

  const child = spawn(
    process.execPath,
    [serverScript, String(port), token, headless ? 'headless' : 'headed'],
    {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    },
  );
  child.unref();

  const state: BrowseState = {
    pid: child.pid!,
    port,
    token,
    startedAt: new Date().toISOString(),
    mode: headless ? 'headless' : 'headed',
  };
  writeState(state);

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const alive = await isServerAlive(state);
    if (alive) return state;
  }

  clearState();
  throw new Error('Server failed to start within 6 seconds');
}

function printHelp(): void {
  console.log('Usage: aing-browse <command> [args...]\n');
  console.log('Options:');
  console.log('  --headed    Run browser in headed mode');
  console.log('  --help      Show this help\n');
  console.log('Commands:');
  for (const [, cmd] of COMMANDS) {
    const argsStr = cmd.args ? ` ${cmd.args}` : '';
    console.log(`  ${cmd.name.padEnd(14)} ${cmd.description}${argsStr ? `  ${argsStr}` : ''}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const headed = argv.includes('--headed');
  const filteredArgs = argv.filter((a) => a !== '--headed');
  const cmd = filteredArgs[0];
  const cmdArgs = filteredArgs.slice(1);

  try {
    const state = await ensureServer(!headed);
    const result = await sendCommand(state, cmd, cmdArgs);

    if (result.success) {
      if (result.output) console.log(result.output);
      if (result.screenshot) console.error(`[screenshot] ${result.screenshot}`);
    } else {
      console.error(result.error || 'Command failed');
      process.exit(1);
    }
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
