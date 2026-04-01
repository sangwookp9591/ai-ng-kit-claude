/**
 * aing Config Manager — Read/write/list configuration
 * @module scripts/cli/aing-config
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { resetConfigCache } from '../core/config.js';
import { join } from 'node:path';
const CONFIG_FILE = '.aing/config.json';
/**
 * Get a config value.
 */
export function getConfig(key, fallback, projectDir) {
    const dir = projectDir || process.cwd();
    const config = readStateOrDefault(join(dir, CONFIG_FILE), {});
    return getNestedValue(config, key) ?? fallback;
}
/**
 * Set a config value.
 */
export function setConfig(key, value, projectDir) {
    const dir = projectDir || process.cwd();
    const configPath = join(dir, CONFIG_FILE);
    const config = readStateOrDefault(configPath, {});
    setNestedValue(config, key, value);
    writeState(configPath, config);
    resetConfigCache();
}
// ---------------------------------------------------------------------------
// Profile presets
// ---------------------------------------------------------------------------
const PROFILE_PRESETS = {
    light: {
        costMode: 'budget',
        maxTeamSize: 2,
        tokenLimit: 50000,
        agents: {
            categories: { leadership: true, backend: true, frontend: false, design: false, aiml: false, special: true },
            deny: [],
            allow: [],
        },
    },
    standard: {
        costMode: 'balanced',
        maxTeamSize: 4,
        tokenLimit: null,
        agents: {
            categories: { leadership: true, backend: true, frontend: true, design: true, aiml: false, special: true },
            deny: [],
            allow: [],
        },
    },
    full: {
        costMode: 'quality',
        maxTeamSize: 7,
        tokenLimit: null,
        agents: {
            categories: { leadership: true, backend: true, frontend: true, design: true, aiml: true, special: true },
            deny: [],
            allow: [],
        },
    },
};
/**
 * Apply a named profile preset to config.
 * Returns true if preset was found and applied, false otherwise.
 */
export function applyProfilePreset(presetName, projectDir) {
    const preset = PROFILE_PRESETS[presetName];
    if (!preset)
        return false;
    setConfig('profile', preset, projectDir);
    return true;
}
/**
 * List all config values.
 */
export function listConfig(projectDir) {
    const dir = projectDir || process.cwd();
    return readStateOrDefault(join(dir, CONFIG_FILE), {});
}
/**
 * Format config for display.
 */
export function formatConfig(config) {
    if (Object.keys(config).length === 0)
        return 'No configuration set.';
    return JSON.stringify(config, null, 2);
}
function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
}
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] == null)
            current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}
//# sourceMappingURL=aing-config.js.map