/**
 * aing Configuration Loader
 * Single source of truth: .aing/config.json > aing.config.json > DEFAULTS
 * @module scripts/core/config
 */
import { readState } from './state.js';
import { join } from 'node:path';
import { statSync } from 'node:fs';
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
    },
    profile: {
        costMode: 'balanced',
        maxTeamSize: 7,
        tokenLimit: null,
        agents: {
            categories: {
                leadership: true,
                backend: true,
                frontend: true,
                design: true,
                aiml: true,
                special: true
            },
            deny: [],
            allow: []
        }
    }
};
let _configCache = null;
let _cachedDir = null;
let _cachedMtimes = null;
/**
 * Safely read mtime of a file. Returns '0' if file does not exist.
 */
function safeStatMtime(path) {
    try {
        return statSync(path).mtimeMs.toString();
    }
    catch {
        return '0';
    }
}
/**
 * Load aing configuration with 3-way defaults merge.
 * Priority: .aing/config.json > aing.config.json > DEFAULTS
 * Cache is invalidated when either file's mtime changes.
 * @param projectDir - Project root directory
 */
export function loadConfig(projectDir) {
    const dir = projectDir || process.cwd();
    const aingConfigPath = join(dir, '.aing', 'config.json');
    const legacyConfigPath = join(dir, 'aing.config.json');
    const currentMtimes = safeStatMtime(aingConfigPath) + ':' + safeStatMtime(legacyConfigPath);
    if (_configCache && _cachedDir === dir && _cachedMtimes === currentMtimes) {
        return _configCache;
    }
    const aingResult = readState(aingConfigPath);
    const aingUserConfig = aingResult.ok
        ? aingResult.data
        : {};
    const legacyResult = readState(legacyConfigPath);
    const legacyUserConfig = legacyResult.ok
        ? legacyResult.data
        : {};
    // 3-way merge: DEFAULTS < legacyConfig < aingConfig
    const merged = deepMerge(deepMerge(DEFAULTS, legacyUserConfig), aingUserConfig);
    _cachedDir = dir;
    _cachedMtimes = currentMtimes;
    _configCache = Object.freeze(merged);
    return _configCache;
}
/**
 * Get a specific config value by dot-notated path.
 * @param path - e.g. 'pdca.automationLevel'
 * @param fallback - Default if path not found
 */
export function getConfig(path, fallback) {
    const config = loadConfig();
    const keys = path.split('.');
    let current = config;
    for (const key of keys) {
        if (current == null || typeof current !== 'object')
            return fallback;
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
    _cachedMtimes = null;
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
            target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
            result[key] = deepMerge(target[key], source[key]);
        }
        else {
            result[key] = source[key];
        }
    }
    return result;
}
//# sourceMappingURL=config.js.map