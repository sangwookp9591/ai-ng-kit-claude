/**
 * aing SessionStart Hook v2.0.0
 * Injects harness rules so aing is ALWAYS active without explicit invocation.
 * Detects first-run and prompts for setup via /aing start.
 */
import { readStateOrDefault, writeState } from '../scripts/core/state.js';
import { loadConfig } from '../scripts/core/config.js';
import { createLogger } from '../scripts/core/logger.js';
import { resetBudget, trackInjection, trimToTokenBudget } from '../scripts/core/context-budget.js';
import { getProgressSummary } from '../scripts/guardrail/progress-tracker.js';
import { resetTrackers } from '../scripts/guardrail/safety-invariants.js';
import { resetAgentBudget } from '../scripts/guardrail/agent-budget.js';
import { generateVersionContext } from '../scripts/context/version-detect.js';
import { isSetupComplete } from '../scripts/setup/setup-progress.js';
import { norchSessionStart } from '../scripts/core/norch-bridge.js';
import { readNotepad, pruneWorking } from '../scripts/memory/notepad.js';
import { getPersistentModeState } from '../scripts/hooks/persistent-mode.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
const pluginRoot = dirname(fileURLToPath(import.meta.url)).replace(/[\\/]hooks-handlers$/, '');
const log = createLogger('session-start');
try {
    const projectDir = process.env.PROJECT_DIR || process.cwd();
    const sessionId = process.env.SESSION_ID || 'default';
    norchSessionStart(sessionId);
    // Telemetry: recover crashed sessions + log start (best-effort)
    try {
        const { logSession, recoverPendingMarkers } = await import('../scripts/telemetry/telemetry-engine.js');
        recoverPendingMarkers(projectDir);
        logSession({ type: 'start', sessionId }, projectDir);
    }
    catch { /* telemetry is best-effort */ }
    const config = loadConfig(projectDir);
    resetBudget();
    resetTrackers(projectDir);
    resetAgentBudget(projectDir);
    const setupStatus = isSetupComplete();
    const pdcaState = readStateOrDefault(join(projectDir, '.aing', 'state', 'pdca-status.json'), null);
    const memory = readStateOrDefault(join(projectDir, '.aing', 'project-memory.json'), null);
    const ctx = [];
    // === Header ===
    ctx.push(`# aing v2.4.8 Harness Engineering Agent`);
    ctx.push(`For developers: the ultimate assistant. For everyone: the ultimate magician.`);
    ctx.push('');
    // === Setup Check: First Run Detection ===
    if (!setupStatus.completed) {
        ctx.push(`## First Run — Setup Required`);
        ctx.push(`aing has not been initialized yet.`);
        ctx.push(`Run \`/aing start\` to launch the setup wizard.`);
        ctx.push('');
        ctx.push(`Setup configures:`);
        ctx.push(`- Scope selection (this project only vs all projects)`);
        ctx.push(`- Status Line HUD (active agent display in terminal)`);
        ctx.push(`- Default execution mode (auto / pdca / wizard)`);
        ctx.push('');
        ctx.push(`aing features work without setup, but setup provides a better experience.`);
        ctx.push('');
    }
    else {
        // Show setup info compactly
        ctx.push(`Setup: ${setupStatus.configTarget || 'configured'} | HUD: ${setupStatus.hudEnabled ? 'on' : 'off'} | Mode: ${setupStatus.defaultMode || 'auto'}`);
        ctx.push('');
    }
    // === Tech Stack Version Context ===
    try {
        const versionCtx = generateVersionContext(projectDir);
        if (versionCtx) {
            ctx.push(versionCtx);
            ctx.push('');
        }
    }
    catch { /* version detection is best-effort */ }
    // === Onboarding: Resume vs New (only when setup is done) ===
    if (setupStatus.completed && pdcaState?.activeFeature) {
        const feat = pdcaState.features?.[pdcaState.activeFeature];
        if (feat) {
            ctx.push(`## Active Work — Resume Available`);
            ctx.push(`Feature: ${pdcaState.activeFeature} | Stage: ${feat.currentStage || 'plan'} | Iteration: ${feat.iteration || 0}/${config.pdca.maxIterations}`);
            ctx.push(`To continue previous work, run \`/aing next\`.`);
            ctx.push(`To start new work, run \`/aing auto <feature> <task>\`.`);
            ctx.push('');
        }
    }
    else if (!setupStatus.completed && pdcaState?.activeFeature) {
        // Setup not done but has active work — show active work anyway
        const feat = pdcaState.features?.[pdcaState.activeFeature];
        if (feat) {
            ctx.push(`## Active Work`);
            ctx.push(`Feature: ${pdcaState.activeFeature} | Stage: ${feat.currentStage || 'plan'} | Iteration: ${feat.iteration || 0}/${config.pdca.maxIterations}`);
            ctx.push('');
        }
    }
    // === Persistent Mode Resume ===
    try {
        const persistentMode = await getPersistentModeState(projectDir);
        if (persistentMode?.active) {
            ctx.push(`## Persistent Mode Active`);
            ctx.push(`Mode: ${persistentMode.mode} | Reason: ${persistentMode.reason} | Started: ${persistentMode.startedAt}`);
            ctx.push(`\uD83D\uDD04 [${persistentMode.mode}] \uBAA8\uB4DC \uC9C4\uD589 \uC911 \u2014 \uC774\uC804 \uC138\uC158\uC758 \uC791\uC5C5\uC744 \uC774\uC5B4\uC11C \uC9C4\uD589\uD558\uC138\uC694.`);
            ctx.push('');
        }
    }
    catch (_e) { /* persistent mode check is best-effort */ }
    // === Session GC: cleanup stale state files ===
    try {
        const teamSessionPath = join(projectDir, '.aing', 'state', 'team-session.json');
        const teamSession = readStateOrDefault(teamSessionPath, null);
        if (teamSession) {
            const stage = teamSession.currentStage;
            const terminalStages = ['completion', 'completed', 'cancelled', 'failed'];
            if (stage && terminalStages.includes(stage)) {
                // Clear completed team session to prevent stale resume prompts
                writeState(teamSessionPath, {});
            }
        }
        // Clear stale plan-state (active:true but older than 24 hours = crashed session)
        const planStatePath = join(projectDir, '.aing', 'state', 'plan-state.json');
        const planState = readStateOrDefault(planStatePath, null);
        if (planState && planState.active === true && planState.startedAt) {
            const ageMs = Date.now() - new Date(planState.startedAt).getTime();
            if (ageMs > 24 * 60 * 60 * 1000) {
                writeState(planStatePath, { ...planState, active: false, terminated: true, reason: 'session-start-gc: stale >24h', terminatedAt: new Date().toISOString() });
                log.info('Stale plan-state auto-deactivated (>24h)');
            }
        }
        const persistentModePath = join(projectDir, '.aing', 'state', 'persistent-mode.json');
        const persistMode = readStateOrDefault(persistentModePath, null);
        if (persistMode && persistMode.active) {
            const startedAt = persistMode.startedAt;
            if (startedAt) {
                const ageMs = Date.now() - new Date(startedAt).getTime();
                // Auto-deactivate persistent mode after 30 minutes
                if (ageMs > 30 * 60 * 1000) {
                    const { writeState: ws } = await import('../scripts/core/state.js');
                    ws(persistentModePath, { ...persistMode, active: false, deactivatedAt: new Date().toISOString(), reason: 'session-start-gc: 30min timeout' });
                    log.info('Persistent mode auto-deactivated (30min timeout)');
                }
            }
        }
    }
    catch (_e) { /* session GC is best-effort */ }
    // === Previous session ===
    const progress = getProgressSummary(projectDir);
    if (progress) {
        ctx.push(`## Previous Session`);
        ctx.push(progress);
        ctx.push('');
    }
    // === Project Memory ===
    if (memory) {
        const sections = Object.keys(memory).filter((k) => memory[k] && Object.keys(memory[k]).length > 0);
        if (sections.length > 0) {
            ctx.push(`## Project Memory: ${sections.join(', ')}`);
            ctx.push('');
        }
    }
    // === Priority Notepad (survives compaction) ===
    try {
        const notepad = await readNotepad(projectDir);
        if (notepad.priority.length > 0) {
            ctx.push(`## Priority Notes`);
            for (const entry of notepad.priority) {
                ctx.push(`- ${entry.content}`);
            }
            ctx.push('');
        }
        // Clean stale working entries on session start (best-effort)
        await pruneWorking(projectDir);
    }
    catch (_e) { /* notepad is best-effort */ }
    // === Agent Team ===
    ctx.push(`## aing Agent Team`);
    ctx.push(`Sam(CTO/opus) Able(PM/sonnet) Klay(Architect/opus) Jay(Backend/sonnet) Jerry(DB/sonnet) Milla(Security/sonnet) Willji(Design/sonnet) Derek(Frontend/sonnet) Rowan(Motion/sonnet) Iron(Wizard/sonnet)`);
    ctx.push('');
    // === MANDATORY RULES — Tiered Injection ===
    const injectionMode = process.env.AING_FULL_INJECT === '1' ? 'full' : (config.context?.injectionMode || 'compact');
    if (injectionMode === 'compact') {
        ctx.push(`## aing Mandatory Rules (compact)`);
        ctx.push('');
        ctx.push(`### Team + Visibility + Entrance`);
        ctx.push(`1. Analyze task complexity -> recommend team: Solo(1) Jay | Duo(2) Jay+Milla | Squad(4) Able+Jay+Derek+Sam | Full(7) all agents.`);
        ctx.push(`2. Every Agent() call MUST have \`description: "{Name}: {task summary}"\`. Show deployment table for multi-agent spawns.`);
        ctx.push(`3. Each agent announces entrance: "{Name} {greeting}" (e.g. "Jay reporting! Backend, going TDD.").`);
        ctx.push('');
        ctx.push(`### Evidence Required`);
        ctx.push(`Never claim "done" without evidence. Run tests, build, or lint to prove completion.`);
        ctx.push(`Exception: trivial changes (≤2 files, ≤10 lines) may skip evidence.`);
        ctx.push('');
        ctx.push(`> Completion Report, Completeness Score, TDD, AskUser, Voice rules -> see agent .md files`);
        ctx.push('');
    }
    else {
        ctx.push(`## aing Mandatory Rules`);
        ctx.push('');
        ctx.push(`### Rule 1: Team Analysis (Required for every task)`);
        ctx.push(`When the user describes a task, ALWAYS analyze complexity and recommend a team:`);
        ctx.push(`- Solo(1): bug fix, single file -> Jay alone`);
        ctx.push(`- Duo(2): mid feature, API -> Jay + Milla`);
        ctx.push(`- Squad(4): fullstack, multi-domain -> Able + Jay + Derek + Sam`);
        ctx.push(`- Full(7): architecture, security -> Able + Klay + Jay + Jerry + Milla + Derek + Sam`);
        ctx.push('');
        ctx.push(`### Rule 2: Agent Visibility (MANDATORY)`);
        ctx.push(`When spawning ANY agent, ALWAYS include the \`description\` parameter in Agent() calls.`);
        ctx.push(`Format: description: "{Name}: {specific task summary}" (3-5 words)`);
        ctx.push(`This makes Claude Code automatically display:`);
        ctx.push('```');
        ctx.push(`aing:klay(Klay: architecture exploration + structural analysis) Opus`);
        ctx.push(`  Done (9 tool uses, 83.6k tokens, 2m 10s)`);
        ctx.push('```');
        ctx.push(`For multi-agent spawns, also show the deployment table before spawning.`);
        ctx.push(`Never spawn agents without description. The user must ALWAYS see who is doing what.`);
        ctx.push('');
        ctx.push(`### Rule 3: Agent Entrance (Required when agent starts working)`);
        ctx.push(`Each agent shows their entrance banner when they start:`);
        ctx.push('```');
        ctx.push(`Sam: "Sam reporting. I will review and decide."`);
        ctx.push(`Able: "Able here! I will create a clean plan."`);
        ctx.push(`Klay: "Klay deployed. Starting architecture analysis..."`);
        ctx.push(`Jay: "Jay here! Backend, going TDD."`);
        ctx.push(`Jerry: "Jerry on scene. I will handle the database."`);
        ctx.push(`Milla: "Milla checking in. Starting security review."`);
        ctx.push(`Willji: "Willji ready! I will design something great."`);
        ctx.push(`Derek: "Derek on it! Starting frontend implementation."`);
        ctx.push(`Rowan: "Rowan here! Let me work some interaction magic."`);
        ctx.push(`Iron: "Iron online. What shall we build today?"`);
        ctx.push('```');
        ctx.push('');
        ctx.push(`### Rule 4: Completion Report (Required at task end)`);
        ctx.push(`At the end of every completed task, show this report:`);
        ctx.push('```');
        ctx.push(`aing Report`);
        ctx.push(`---`);
        ctx.push(`Team: {preset} ({N} members)`);
        ctx.push(`Agents: {list of agents that worked}`);
        ctx.push(`{Agent} - {role} - {what they did}`);
        ctx.push(`Completeness: {X}/10`);
        ctx.push(`Evidence: {test/build/lint results}`);
        ctx.push(`Verdict: ACHIEVED / COMPLETED BUT INCOMPLETE / FAILED`);
        ctx.push(`---`);
        ctx.push('```');
        ctx.push('');
        ctx.push(`### Rule 4a: Completeness Score`);
        ctx.push(`10=all conditions+edge cases+tests, 7=happy path+basic tests, 5=core works/tests lacking, 3=partial impl`);
        ctx.push(`Score 8+ -> ACHIEVED, 5-7 -> COMPLETED BUT INCOMPLETE, <5 -> FAILED`);
        ctx.push('');
        ctx.push(`### Rule 5: TDD Enforcement`);
        ctx.push(`All code implementation MUST follow TDD: write test first (RED), implement (GREEN), refactor (REFACTOR).`);
        ctx.push('');
        ctx.push(`### Rule 6: Evidence Required`);
        ctx.push(`Never claim "done" without evidence. Run tests, build, or lint to prove completion.`);
        ctx.push(`Exception: trivial changes (≤2 files, ≤10 lines, e.g. typo fix, comment update) may skip evidence collection.`);
        ctx.push('');
        ctx.push(`### Rule 7: AskUserQuestion Format (Required for all user questions)`);
        ctx.push(`When asking the user a question, use this structured format:`);
        ctx.push(`1. **Re-ground**: State project, branch, current task in 1 line`);
        ctx.push(`2. **Simplify**: Summarize situation so a 16-year-old understands`);
        ctx.push(`3. **Recommend**: RECOMMENDATION: Choose [X] because [reason] + Completeness: X/10`);
        ctx.push(`4. **Options**: Letter options, each with estimated time (human: ~X / CC: ~Y)`);
        ctx.push('');
        ctx.push(`### Rule 8: Voice Directive (Global)`);
        ctx.push(`Banned words: delve, crucial, robust, comprehensive, nuanced, leverage, utilize, facilitate, game-changer, cutting-edge`);
        ctx.push(`Banned phrases: "here's the kicker", "let me break this down", "it's worth noting that"`);
        ctx.push(`Use commas or periods instead of em dash. Be direct and specific.`);
        ctx.push('');
    }
    // === Status Line Setup (now handled by /aing start wizard) ===
    if (!setupStatus.completed) {
        const hudSetupFlag = join(projectDir, '.aing', 'state', 'hud-setup-done');
        if (!existsSync(hudSetupFlag)) {
            try {
                const stateDir = join(projectDir, '.aing', 'state');
                if (!existsSync(stateDir))
                    mkdirSync(stateDir, { recursive: true });
                writeFileSync(hudSetupFlag, new Date().toISOString());
            }
            catch {
                // Silent failure
            }
        }
    }
    // === External AI Detection ===
    try {
        const { detectCodexTier, getAvailableBridges } = await import('../scripts/multi-ai/cli-bridge.js');
        const codexInfo = detectCodexTier();
        const bridges = getAvailableBridges();
        if (codexInfo.tier !== 'none' || bridges.length > 0) {
            ctx.push(`## External AI`);
            if (codexInfo.tier === 'plugin') {
                ctx.push(`Codex: plugin installed (${codexInfo.pluginCommands.join(', ')})`);
                ctx.push(`Review/기획 리뷰 시 Codex 위임을 제안합니다.`);
            }
            else if (codexInfo.tier === 'cli') {
                ctx.push(`Codex: CLI available (cli-bridge)`);
            }
            const otherBridges = bridges.filter(b => b.name !== 'codex');
            for (const b of otherBridges) {
                ctx.push(`${b.name}: CLI available`);
            }
            ctx.push('');
        }
    }
    catch (_e) { /* external AI detection is best-effort */ }
    // === Commands ===
    ctx.push(`## Commands`);
    ctx.push(`/aing start|status|next|reset|auto|tdd|task|explore|plan|execute|review|verify|wizard|rollback|learn|help`);
    // === State GC (automatic cleanup of zombie features) ===
    try {
        const { runGC } = await import(join(pluginRoot, 'scripts/pdca/state-gc.mjs'));
        const gcResult = runGC(projectDir);
        if (gcResult.removed > 0) {
            ctx.push('');
            ctx.push(`[State GC] ${gcResult.removed} zombie features cleaned: ${gcResult.archived.join(', ')}`);
        }
    }
    catch (_e) { /* GC failure does not block session start */ }
    // === STATUS.md update ===
    try {
        const { generateStatusView } = await import(join(pluginRoot, 'scripts/pdca/status-view.mjs'));
        generateStatusView(projectDir);
    }
    catch (_e) { /* View generation failure does not block session start */ }
    const context = ctx.join('\n');
    const maxTokens = config.context.maxSessionStartTokens;
    const trimmed = trimToTokenBudget(context, maxTokens);
    trackInjection('session-start', trimmed);
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: { additionalContext: trimmed }
    }));
    log.info('Session started', { pdcaActive: !!pdcaState?.activeFeature, memoryLoaded: !!memory });
}
catch (err) {
    log.error('Session start failed', { error: err.message });
    // Fallback: inject static CLAUDE.md rules when dynamic injection fails
    let wroteOutput = false;
    try {
        const { dirname: dn, join: jn } = await import('node:path');
        const { fileURLToPath: ftu } = await import('node:url');
        const { existsSync: ex, readFileSync: rf } = await import('node:fs');
        const root = dn(ftu(import.meta.url)).replace(/[\\/]hooks-handlers$/, '');
        const claudeMdPath = jn(root, 'CLAUDE.md');
        if (ex(claudeMdPath)) {
            const staticRules = rf(claudeMdPath, 'utf-8');
            process.stdout.write(JSON.stringify({
                hookSpecificOutput: {
                    additionalContext: `[aing fallback] 동적 세션 주입에 실패했습니다. 정적 CLAUDE.md 규칙을 따르세요.\n\n${staticRules}`
                }
            }));
            wroteOutput = true;
        }
    }
    catch { /* static fallback is also best-effort */ }
    if (!wroteOutput)
        process.stdout.write(JSON.stringify({}));
}
//# sourceMappingURL=session-start.js.map