/**
 * aing Safety Invariants v0.3.0
 * Hard limits that can never be overridden by the agent.
 * Harness Engineering: Constrain axis — absolute boundaries.
 * @module scripts/guardrail/safety-invariants
 */
import { readStateOrDefault, writeState, updateState } from '../core/state.js';
import { homedir } from 'node:os';
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
const log = createLogger('safety-invariants');
/**
 * Default invariant limits
 */
const DEFAULT_INVARIANTS = {
    maxSteps: 50,
    maxFileChanges: 20,
    maxSessionMinutes: 120,
    forbiddenPaths: [
        '/etc/',
        '/usr/',
        '/System/',
        '~/.ssh/',
        '~/.aws/credentials'
    ],
    requireTestBeforeCommit: false,
    maxConsecutiveErrors: 5
};
function getInvariantsPath(projectDir) {
    return join(projectDir || process.cwd(), '.aing', 'state', 'invariants-tracker.json');
}
/**
 * Load invariant limits (config overrides defaults, but cannot exceed hard max).
 */
export function loadInvariants(_projectDir) {
    const userInvariants = getConfig('guardrail.invariants', {});
    const HARD_MAX = {
        maxSteps: 200,
        maxFileChanges: 100,
        maxSessionMinutes: 480,
        maxConsecutiveErrors: 20
    };
    const merged = { ...DEFAULT_INVARIANTS };
    for (const [key, value] of Object.entries(userInvariants)) {
        if (key === 'forbiddenPaths' && Array.isArray(value)) {
            merged.forbiddenPaths = [...DEFAULT_INVARIANTS.forbiddenPaths, ...value];
        }
        else if (typeof value === 'number' && HARD_MAX[key]) {
            merged[key] = Math.min(value, HARD_MAX[key]);
        }
        else if (typeof value === 'boolean') {
            merged[key] = value;
        }
    }
    return merged;
}
/**
 * Track and check step count invariant.
 */
export function checkStepLimit(projectDir) {
    const invariants = loadInvariants(projectDir);
    const trackerPath = getInvariantsPath(projectDir);
    let steps = 0;
    updateState(trackerPath, { steps: 0, fileChanges: 0, errors: 0, startedAt: null }, (data) => {
        const tracker = data;
        tracker.steps++;
        if (!tracker.startedAt)
            tracker.startedAt = new Date().toISOString();
        steps = tracker.steps;
        return tracker;
    });
    if (steps > invariants.maxSteps) {
        log.error(`Step limit exceeded: ${steps}/${invariants.maxSteps}`);
        return {
            ok: false,
            current: steps,
            max: invariants.maxSteps,
            message: `[aing Safety] 실행 단계 한도 초과 (${steps}/${invariants.maxSteps}). 작업을 분할하거나 설정에서 maxSteps를 조정하세요.`
        };
    }
    return { ok: true, current: steps, max: invariants.maxSteps };
}
/**
 * Track and check file change count.
 */
export function checkFileChangeLimit(filePath, projectDir) {
    const invariants = loadInvariants(projectDir);
    const trackerPath = getInvariantsPath(projectDir);
    let fileChanges = 0;
    updateState(trackerPath, { steps: 0, fileChanges: 0, errors: 0, changedFiles: [] }, (data) => {
        const tracker = data;
        if (!tracker.changedFiles)
            tracker.changedFiles = [];
        if (!tracker.changedFiles.includes(filePath)) {
            tracker.changedFiles.push(filePath);
            tracker.fileChanges = tracker.changedFiles.length;
        }
        fileChanges = tracker.fileChanges;
        return tracker;
    });
    if (fileChanges > invariants.maxFileChanges) {
        log.error(`File change limit exceeded: ${fileChanges}/${invariants.maxFileChanges}`);
        return {
            ok: false,
            current: fileChanges,
            max: invariants.maxFileChanges,
            message: `[aing Safety] 파일 변경 한도 초과 (${fileChanges}/${invariants.maxFileChanges}). 커밋 후 계속하세요.`
        };
    }
    return { ok: true, current: fileChanges, max: invariants.maxFileChanges };
}
/**
 * Check if a path is in the forbidden list.
 */
export function checkForbiddenPath(filePath, projectDir) {
    const invariants = loadInvariants(projectDir);
    const home = process.env.HOME || homedir();
    const expanded = filePath.startsWith('~/') ? home + filePath.slice(1) : filePath;
    for (const forbidden of invariants.forbiddenPaths) {
        const expandedForbidden = forbidden.startsWith('~/') ? home + forbidden.slice(1) : forbidden;
        if (expanded.startsWith(expandedForbidden)) {
            log.error(`Forbidden path access: ${filePath}`);
            return {
                ok: false,
                message: `[aing Safety] 🚫 접근 금지 경로: ${filePath}`
            };
        }
    }
    return { ok: true };
}
/**
 * Track consecutive errors and check limit.
 */
export function checkErrorLimit(projectDir) {
    const invariants = loadInvariants(projectDir);
    const trackerPath = getInvariantsPath(projectDir);
    let errors = 0;
    updateState(trackerPath, { steps: 0, fileChanges: 0, errors: 0 }, (data) => {
        const tracker = data;
        tracker.errors++;
        errors = tracker.errors;
        return tracker;
    });
    if (errors > invariants.maxConsecutiveErrors) {
        return {
            ok: false,
            current: errors,
            max: invariants.maxConsecutiveErrors,
            message: `[aing Safety] 연속 에러 한도 초과 (${errors}/${invariants.maxConsecutiveErrors}). 접근 방식을 변경하거나 도움을 요청하세요.`
        };
    }
    return { ok: true, current: errors, max: invariants.maxConsecutiveErrors };
}
/**
 * Reset error counter (called on successful operation).
 */
export function resetErrorCount(projectDir) {
    const trackerPath = getInvariantsPath(projectDir);
    updateState(trackerPath, { steps: 0, fileChanges: 0, errors: 0 }, (data) => {
        const tracker = data;
        tracker.errors = 0;
        return tracker;
    });
}
/**
 * Reset all invariant trackers (called at session start).
 */
export function resetTrackers(projectDir) {
    const trackerPath = getInvariantsPath(projectDir);
    writeState(trackerPath, {
        steps: 0,
        fileChanges: 0,
        errors: 0,
        changedFiles: [],
        startedAt: new Date().toISOString()
    });
}
/**
 * Get current tracker status for display.
 */
export function getTrackerStatus(projectDir) {
    const invariants = loadInvariants(projectDir);
    const trackerPath = getInvariantsPath(projectDir);
    const tracker = readStateOrDefault(trackerPath, { steps: 0, fileChanges: 0, errors: 0, changedFiles: [] });
    return {
        steps: `${tracker.steps}/${invariants.maxSteps}`,
        fileChanges: `${tracker.fileChanges}/${invariants.maxFileChanges}`,
        errors: `${tracker.errors}/${invariants.maxConsecutiveErrors}`,
        startedAt: tracker.startedAt,
        changedFiles: tracker.changedFiles || []
    };
}
//# sourceMappingURL=safety-invariants.js.map