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