/**
 * aing Configuration Loader
 * Single source of truth: aing.config.json
 * @module scripts/core/config
 */

import { readState } from './state.js';
import { join } from 'node:path';

interface PdcaConfig {
  stages: string[];
  automationLevel: string;
  matchRateThreshold: number;
  maxIterations: number;
}

interface ContextConfig {
  maxSessionStartTokens: number;
  truncateLimit: number;
  budgetWarningThreshold: number;
}

interface RoutingConfig {
  complexityThresholds: { low: number; mid: number };
  modelMap: { low: string; mid: string; high: string };
  historyRetention: number;
}

interface LearningConfig {
  maxPatterns: number;
  decayDays: number;
  minSuccessRate: number;
}

interface RecoveryConfig {
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
  maxSnapshots: number;
}

interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
}

interface AingConfig {
  pdca: PdcaConfig;
  context: ContextConfig;
  routing: RoutingConfig;
  learning: LearningConfig;
  recovery: RecoveryConfig;
  i18n: I18nConfig;
  [key: string]: unknown;
}

const DEFAULTS: AingConfig = {
  pdca: {
    stages: ['plan', 'do', 'check', 'act', 'review'],
    automationLevel: 'semi-auto',
    matchRateThreshold: 90,
    maxIterations: 5
  },
  context: {
    maxSessionStartTokens: 2000,
    truncateLimit: 800,
    budgetWarningThreshold: 0.8
  },
  routing: {
    complexityThresholds: { low: 3, mid: 7 },
    modelMap: { low: 'haiku', mid: 'sonnet', high: 'opus' },
    historyRetention: 50
  },
  learning: {
    maxPatterns: 100,
    decayDays: 90,
    minSuccessRate: 0.7
  },
  recovery: {
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 300000,
    maxSnapshots: 10
  },
  i18n: {
    defaultLocale: 'ko',
    supportedLocales: ['ko', 'en']
  }
};

let _configCache: Readonly<AingConfig> | null = null;
let _cachedDir: string | null = null;

/**
 * Load aing configuration with defaults merge.
 * @param projectDir - Project root directory
 */
export function loadConfig(projectDir?: string): Readonly<AingConfig> {
  const dir = projectDir || process.cwd();
  if (_configCache && _cachedDir === dir) return _configCache;

  const configPath = join(dir, 'aing.config.json');

  const result = readState(configPath);
  const userConfig: Record<string, unknown> = result.ok ? result.data as Record<string, unknown> : {};

  _cachedDir = dir;
  _configCache = Object.freeze(deepMerge(DEFAULTS, userConfig)) as Readonly<AingConfig>;
  return _configCache;
}

/**
 * Get a specific config value by dot-notated path.
 * @param path - e.g. 'pdca.automationLevel'
 * @param fallback - Default if path not found
 */
export function getConfig(path: string, fallback?: unknown): unknown {
  const config = loadConfig();
  const keys = path.split('.');
  let current: unknown = config;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return fallback;
    current = (current as Record<string, unknown>)[key];
  }
  return current !== undefined ? current : fallback;
}

/**
 * Reset config cache (for testing or config reload).
 */
export function resetConfigCache(): void {
  _configCache = null;
  _cachedDir = null;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
