/**
 * aing Session Cleanup Engine
 * Centralized transient cleanup for session start/stop.
 * Owns: locks, temps, handoffs, stale mode states.
 * Does NOT touch: PDCA features (owned by state-gc.ts).
 * @module scripts/core/session-cleanup
 */
import { existsSync, readdirSync, statSync, renameSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { writeState } from './state.js';
import { createLogger } from './logger.js';
import { PROTECTED_FILES } from './protected-files.js';
const log = createLogger('session-cleanup');
// Default thresholds (used when options not provided)
const PLAN_STALE_MS = 24 * 60 * 60 * 1000; // 24h
const PERSISTENT_MODE_STALE_MS = 30 * 60 * 1000; // 30min
const TEAM_SESSION_STALE_MS = 24 * 60 * 60 * 1000; // 24h
const TDD_STALE_MS = 24 * 60 * 60 * 1000; // 24h
const PIPELINE_STALE_MS = 24 * 60 * 60 * 1000; // 24h
const EMERGENCY_BACKUP_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const CHECKPOINT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const AUTO_RUN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COMPACTION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
/**
 * Run centralized session cleanup.
 * All operations are best-effort — never throws.
 */
export function runSessionCleanup(projectDir, options) {
    const result = { cleaned: [], errors: [], skipped: [] };
    const stateDir = join(projectDir, '.aing', 'state');
    if (!existsSync(stateDir)) {
        return result;
    }
    const dryRun = options?.dryRun ?? false;
    const lockStaleMs = (options?.maxLockAgeSec ?? 30) * 1000;
    const handoffMaxAgeMs = (options?.maxHandoffAgeDays ?? 7) * 24 * 60 * 60 * 1000;
    let files;
    try {
        files = readdirSync(stateDir);
    }
    catch (err) {
        result.errors.push(`Failed to read state dir: ${err.message}`);
        return result;
    }
    for (const file of files) {
        if (PROTECTED_FILES.has(file))
            continue;
        const filePath = join(stateDir, file);
        try {
            // --- .tmp files: always remove ---
            if (file.endsWith('.tmp')) {
                if (dryRun) {
                    result.skipped.push(`[dry-run] would remove: ${file}`);
                    continue;
                }
                unlinkSync(filePath);
                result.cleaned.push(file);
                continue;
            }
            // --- .lock files: remove if older than threshold ---
            if (file.endsWith('.lock')) {
                const stat = statSync(filePath);
                const ageMs = Date.now() - stat.mtimeMs;
                if (ageMs > lockStaleMs) {
                    if (dryRun) {
                        result.skipped.push(`[dry-run] would remove stale lock: ${file} (${Math.round(ageMs / 1000)}s)`);
                        continue;
                    }
                    unlinkSync(filePath);
                    result.cleaned.push(file);
                }
                continue;
            }
            // --- handoff-*.md: archive if older than threshold ---
            if (file.startsWith('handoff-') && file.endsWith('.md')) {
                const stat = statSync(filePath);
                const ageMs = Date.now() - stat.mtimeMs;
                if (ageMs > handoffMaxAgeMs) {
                    if (dryRun) {
                        result.skipped.push(`[dry-run] would archive: ${file}`);
                        continue;
                    }
                    const archiveDir = join(projectDir, '.aing', 'archive');
                    mkdirSync(archiveDir, { recursive: true });
                    renameSync(filePath, join(archiveDir, file));
                    result.cleaned.push(`archived: ${file}`);
                }
                continue;
            }
            // --- pdca-emergency-backup.json: remove if >3 days ---
            if (file === 'pdca-emergency-backup.json') {
                cleanByFileAge(filePath, file, EMERGENCY_BACKUP_MAX_AGE_MS, dryRun, result);
                continue;
            }
            // --- checkpoints.json: remove if >7 days ---
            if (file === 'checkpoints.json') {
                cleanByFileAge(filePath, file, CHECKPOINT_MAX_AGE_MS, dryRun, result);
                continue;
            }
            // --- dry-run-queue.json: always remove ---
            if (file === 'dry-run-queue.json') {
                if (dryRun) {
                    result.skipped.push(`[dry-run] would remove: ${file}`);
                    continue;
                }
                unlinkSync(filePath);
                result.cleaned.push(file);
                continue;
            }
            // --- compaction-session.json: remove if >24h ---
            if (file === 'compaction-session.json') {
                cleanByFileAge(filePath, file, COMPACTION_MAX_AGE_MS, dryRun, result);
                continue;
            }
            // --- auto-run-*.json: remove if >7 days ---
            if (file.startsWith('auto-run-') && file.endsWith('.json')) {
                cleanByFileAge(filePath, file, AUTO_RUN_MAX_AGE_MS, dryRun, result);
                continue;
            }
            // --- Stale mode state files: deactivate if active + stale ---
            if (file === 'plan-state.json') {
                deactivateStaleState(filePath, file, PLAN_STALE_MS, dryRun, result);
                continue;
            }
            if (file === 'persistent-mode.json') {
                deactivateStaleState(filePath, file, PERSISTENT_MODE_STALE_MS, dryRun, result);
                continue;
            }
            if (file === 'team-session.json') {
                deactivateStaleTeamSession(filePath, file, TEAM_SESSION_STALE_MS, dryRun, result);
                continue;
            }
            if (file === 'tdd-state.json') {
                deactivateStaleState(filePath, file, TDD_STALE_MS, dryRun, result);
                continue;
            }
            if (file === 'pipeline-state.json') {
                deactivateStaleState(filePath, file, PIPELINE_STALE_MS, dryRun, result);
                continue;
            }
        }
        catch (err) {
            result.errors.push(`${file}: ${err.message}`);
        }
    }
    if (!dryRun && result.cleaned.length > 0) {
        log.info('Session cleanup completed', { cleaned: result.cleaned.length, errors: result.errors.length });
    }
    return result;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cleanByFileAge(filePath, fileName, maxAgeMs, dryRun, result) {
    try {
        const stat = statSync(filePath);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs > maxAgeMs) {
            if (dryRun) {
                result.skipped.push(`[dry-run] would remove: ${fileName} (${Math.round(ageMs / 86400000)}d old)`);
                return;
            }
            unlinkSync(filePath);
            result.cleaned.push(fileName);
        }
    }
    catch (err) {
        result.errors.push(`${fileName}: ${err.message}`);
    }
}
function deactivateStaleState(filePath, fileName, staleMs, dryRun, result) {
    try {
        const raw = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.active !== true)
            return;
        const startedAt = data.startedAt;
        if (!startedAt)
            return;
        const ageMs = Date.now() - new Date(startedAt).getTime();
        if (ageMs <= staleMs)
            return;
        if (dryRun) {
            result.skipped.push(`[dry-run] would deactivate: ${fileName} (${Math.round(ageMs / 60000)}min old)`);
            return;
        }
        writeState(filePath, {
            ...data,
            active: false,
            deactivatedAt: new Date().toISOString(),
            reason: `session-cleanup: stale >${Math.round(staleMs / 60000)}min`,
        });
        result.cleaned.push(fileName);
    }
    catch (err) {
        result.errors.push(`${fileName}: ${err.message}`);
    }
}
function deactivateStaleTeamSession(filePath, fileName, staleMs, dryRun, result) {
    try {
        const raw = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        // Terminal-stage sessions: clear immediately
        const stage = data.currentStage;
        const terminalStages = ['completion', 'completed', 'cancelled', 'failed'];
        if (stage && terminalStages.includes(stage)) {
            if (dryRun) {
                result.skipped.push(`[dry-run] would clear terminal team-session (stage: ${stage})`);
                return;
            }
            writeState(filePath, {});
            result.cleaned.push(`${fileName} (terminal: ${stage})`);
            return;
        }
        // Active + stale: deactivate
        if (data.active !== true)
            return;
        const startedAt = data.startedAt;
        if (!startedAt)
            return;
        const ageMs = Date.now() - new Date(startedAt).getTime();
        if (ageMs <= staleMs)
            return;
        if (dryRun) {
            result.skipped.push(`[dry-run] would deactivate: ${fileName} (${Math.round(ageMs / 60000)}min old)`);
            return;
        }
        writeState(filePath, {
            ...data,
            active: false,
            deactivatedAt: new Date().toISOString(),
            reason: `session-cleanup: stale >${Math.round(staleMs / 60000)}min`,
        });
        result.cleaned.push(fileName);
    }
    catch (err) {
        result.errors.push(`${fileName}: ${err.message}`);
    }
}
//# sourceMappingURL=session-cleanup.js.map