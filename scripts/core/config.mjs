/**
 * aing Configuration Loader
 * Single source of truth: aing.config.json
 * @module scripts/core/config
 */

import { readState } from './state.mjs';
import { join } from 'node:path';

const DEFAULTS = {
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

let _configCache = null;
let _cachedDir = null;

/**
 * Load aing configuration with defaults merge.
 * @param {string} [projectDir] - Project root directory
 * @returns {object} Merged configuration
 */
export function loadConfig(projectDir) {
  const dir = projectDir || process.cwd();
  if (_configCache && _cachedDir === dir) return _configCache;

  const configPath = join(dir, 'aing.config.json');

  const result = readState(configPath);
  const userConfig = result.ok ? result.data : {};

  _cachedDir = dir;
  _configCache = Object.freeze(deepMerge(DEFAULTS, userConfig));
  return _configCache;
}

/**
 * Get a specific config value by dot-notated path.
 * @param {string} path - e.g. 'pdca.automationLevel'
 * @param {any} [fallback] - Default if path not found
 * @returns {any}
 */
export function getConfig(path, fallback) {
  const config = loadConfig();
  const keys = path.split('.');
  let current = config;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[key];
  }
  return current !== undefined ? current : fallback;
}

/**
 * Reset config cache (for testing or config reload).
 */
export function resetConfigCache() {
  _configCache = null;
  _cachedDir = null;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
