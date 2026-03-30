/**
 * aing Config Manager — Read/write/list configuration
 * @module scripts/cli/aing-config
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { join } from 'node:path';

const CONFIG_FILE = '.aing/config.json';

/**
 * Get a config value.
 */
export function getConfig(key: string, fallback?: unknown, projectDir?: string): unknown {
  const dir = projectDir || process.cwd();
  const config = readStateOrDefault(join(dir, CONFIG_FILE), {}) as Record<string, unknown>;
  return getNestedValue(config, key) ?? fallback;
}

/**
 * Set a config value.
 */
export function setConfig(key: string, value: unknown, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const configPath = join(dir, CONFIG_FILE);
  const config = readStateOrDefault(configPath, {}) as Record<string, unknown>;
  setNestedValue(config, key, value);
  writeState(configPath, config);
}

/**
 * List all config values.
 */
export function listConfig(projectDir?: string): Record<string, unknown> {
  const dir = projectDir || process.cwd();
  return readStateOrDefault(join(dir, CONFIG_FILE), {}) as Record<string, unknown>;
}

/**
 * Format config for display.
 */
export function formatConfig(config: Record<string, unknown>): string {
  if (Object.keys(config).length === 0) return 'No configuration set.';
  return JSON.stringify(config, null, 2);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], obj);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] == null) current[keys[i]] = {};
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}
