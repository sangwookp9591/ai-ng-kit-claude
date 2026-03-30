/**
 * Browse daemon integration for browser evidence collection.
 * Uses the aing-browse daemon (browse/) instead of MCP Playwright.
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export interface BrowseConfig {
  browseBin: string;
  timeout: number;
}

/** Find the browse binary */
export function findBrowseBin(projectDir: string): string | null {
  const candidates = [
    join(projectDir, 'browse', 'dist', 'cli.js'),
    join(projectDir, 'node_modules', '.bin', 'aing-browse'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/** Execute a browse command and return output */
export function browseExec(bin: string, command: string, args: string[] = [], timeout = 30000): string {
  const fullArgs = [bin, command, ...args].join(' ');
  try {
    return execSync(`node ${fullArgs}`, { timeout, encoding: 'utf-8' }).trim();
  } catch (err) {
    throw new Error(`Browse command failed: ${command} — ${(err as Error).message}`);
  }
}

/** Take a screenshot and return the path */
export function browseScreenshot(bin: string, url: string, outputPath: string): string {
  browseExec(bin, 'goto', [url]);
  browseExec(bin, 'screenshot', [outputPath]);
  return outputPath;
}

/** Get annotated snapshot with @refs */
export function browseSnapshot(bin: string, url: string, interactive = true): string {
  browseExec(bin, 'goto', [url]);
  const flags = interactive ? ['-i'] : [];
  return browseExec(bin, 'snapshot', flags);
}

/** Check page for console errors */
export function browseConsoleErrors(bin: string): string[] {
  const output = browseExec(bin, 'console', ['--errors']);
  return output ? output.split('\n').filter(Boolean) : [];
}

/** Check if element is visible */
export function browseIsVisible(bin: string, selector: string): boolean {
  try {
    const result = browseExec(bin, 'is', ['visible', selector]);
    return result.includes('true');
  } catch {
    return false;
  }
}

/** Run responsive screenshots (mobile, tablet, desktop) */
export function browseResponsive(bin: string, url: string, prefix: string): string[] {
  browseExec(bin, 'goto', [url]);
  browseExec(bin, 'responsive', [prefix]);
  return [`${prefix}-mobile.png`, `${prefix}-tablet.png`, `${prefix}-desktop.png`];
}

/** Get page performance metrics */
export function browsePerf(bin: string): string {
  return browseExec(bin, 'perf');
}

