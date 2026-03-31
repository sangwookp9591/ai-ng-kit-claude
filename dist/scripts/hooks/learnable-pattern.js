/**
 * aing Learnable Pattern Detector
 * Detects reusable patterns from tool usage and stores them for future suggestions.
 * @module scripts/hooks/learnable-pattern
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { join } from 'node:path';
const PATTERN_THRESHOLD = 3;
const MAX_PATTERNS = 200;
const STATE_FILENAME = 'learned-patterns.json';
function statePath(projectDir) {
    return join(projectDir, '.aing', 'state', STATE_FILENAME);
}
function loadStore(projectDir) {
    return readStateOrDefault(statePath(projectDir), { patterns: [] });
}
/**
 * Extract the base command, stripping flags/paths but keeping subcommands.
 * Examples:
 *   "git log --oneline -10"  -> "git log"
 *   "npm run test"           -> "npm run test"  (npm run <script> = 3 tokens)
 *   "tsc --noEmit"           -> "tsc"
 */
function extractBaseCommand(command) {
    const tokens = command.trim().split(/\s+/);
    // npm/yarn/pnpm run <script>: keep 3 tokens
    if (tokens.length >= 3 && (tokens[0] === 'npm' || tokens[0] === 'yarn' || tokens[0] === 'pnpm') && tokens[1] === 'run') {
        return tokens.slice(0, 3).join(' ');
    }
    // Default: keep up to 2 tokens
    return tokens.slice(0, 2).join(' ');
}
/**
 * Find an existing pattern entry by type and pattern string.
 */
function findPattern(store, type, pattern) {
    return store.patterns.find((p) => p.type === type && p.pattern === pattern);
}
/**
 * Record a pattern use and persist. Called on every relevant tool invocation.
 */
export function recordPatternUse(projectDir, type, pattern, pendingError) {
    const store = loadStore(projectDir);
    const now = new Date().toISOString();
    const existing = findPattern(store, type, pattern);
    if (existing) {
        existing.count += 1;
        existing.lastSeen = now;
        if (pendingError !== undefined) {
            existing.pendingError = pendingError;
        }
    }
    else {
        const entry = {
            type,
            pattern,
            count: 1,
            firstSeen: now,
            lastSeen: now,
        };
        if (pendingError !== undefined) {
            entry.pendingError = pendingError;
        }
        store.patterns.push(entry);
    }
    // Cap at MAX_PATTERNS — remove oldest by firstSeen
    if (store.patterns.length > MAX_PATTERNS) {
        store.patterns.sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
        store.patterns = store.patterns.slice(-MAX_PATTERNS);
    }
    writeState(statePath(projectDir), store);
}
/**
 * Detect if the current tool use represents a learnable pattern.
 * Returns a LearnablePattern if a pattern crosses the threshold, null otherwise.
 */
export function detectLearnablePattern(projectDir, toolName, toolInput, toolResponse) {
    const store = loadStore(projectDir);
    const now = new Date().toISOString();
    // --- Command pattern (Bash tool) ---
    if (toolName === 'Bash' && toolInput.command) {
        const rawCommand = toolInput.command;
        const baseCmd = extractBaseCommand(rawCommand);
        const isSuccess = !toolResponse.toLowerCase().includes('error') &&
            !toolResponse.toLowerCase().includes('failed') &&
            !toolResponse.toLowerCase().includes('exception');
        // Check for error->fix cycle first
        const errorFixEntry = findPattern(store, 'errorFix', baseCmd);
        if (errorFixEntry?.pendingError && isSuccess) {
            const result = {
                ...errorFixEntry,
                count: errorFixEntry.count + 1,
                lastSeen: now,
                pendingError: undefined,
                suggestion: `Error-fix pattern detected for "${baseCmd}". Consider adding this fix to your runbook.`,
            };
            return result;
        }
        // Track error state for future fix detection
        if (!isSuccess) {
            const errorMsg = toolResponse.slice(0, 200);
            recordPatternUse(projectDir, 'errorFix', baseCmd, errorMsg);
            return null;
        }
        // Check for repeated command pattern
        const cmdEntry = findPattern(store, 'command', baseCmd);
        if (cmdEntry && cmdEntry.count >= PATTERN_THRESHOLD - 1) {
            return {
                ...cmdEntry,
                count: cmdEntry.count + 1,
                lastSeen: now,
                suggestion: `Consider creating an alias or script for "${baseCmd}" (used ${cmdEntry.count + 1} times).`,
            };
        }
        return null;
    }
    // --- File pattern (Glob tool) ---
    if (toolName === 'Glob' && toolInput.pattern) {
        const globPattern = toolInput.pattern;
        const entry = findPattern(store, 'filePattern', globPattern);
        if (entry && entry.count >= PATTERN_THRESHOLD - 1) {
            return {
                ...entry,
                count: entry.count + 1,
                lastSeen: now,
                suggestion: `"${globPattern}" is a common search target (used ${entry.count + 1} times). Consider noting this pattern.`,
            };
        }
        return null;
    }
    return null;
}
//# sourceMappingURL=learnable-pattern.js.map