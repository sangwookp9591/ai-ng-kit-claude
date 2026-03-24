/**
 * sw-kit SessionStart Hook v2.0.0
 * Injects harness rules so sw-kit is ALWAYS active without explicit invocation.
 * Detects first-run and prompts for setup via /swkit start.
 */
import { readStateOrDefault } from '../scripts/core/state.mjs';
import { loadConfig } from '../scripts/core/config.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { resetBudget, trackInjection, trimToTokenBudget } from '../scripts/core/context-budget.mjs';
import { getProgressSummary } from '../scripts/guardrail/progress-tracker.mjs';
import { resetTrackers } from '../scripts/guardrail/safety-invariants.mjs';
import { isSetupComplete } from '../scripts/setup/setup-progress.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const pluginRoot = dirname(fileURLToPath(import.meta.url)).replace(/[\\/]hooks-handlers$/, '');

const log = createLogger('session-start');

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const config = loadConfig(projectDir);

  resetBudget();
  resetTrackers(projectDir);

  const setupStatus = isSetupComplete();
  const pdcaState = readStateOrDefault(join(projectDir, '.sw-kit', 'state', 'pdca-status.json'), null);
  const memory = readStateOrDefault(join(projectDir, '.sw-kit', 'project-memory.json'), null);

  const ctx = [];

  // === Header ===
  ctx.push(`# sw-kit v2.1.7 Harness Engineering Agent`);
  ctx.push(`For developers: the ultimate assistant. For everyone: the ultimate magician.`);
  ctx.push('');

  // === Setup Check: First Run Detection ===
  if (!setupStatus.completed) {
    ctx.push(`## First Run — Setup Required`);
    ctx.push(`sw-kit이 아직 초기 설정되지 않았습니다.`);
    ctx.push(`\`/swkit start\`를 실행하여 셋업 위자드를 시작하세요.`);
    ctx.push('');
    ctx.push(`셋업에서 설정하는 것:`);
    ctx.push(`- 스코프 선택 (이 프로젝트만 vs 모든 프로젝트)`);
    ctx.push(`- Status Line HUD (터미널에 활성 에이전트 표시)`);
    ctx.push(`- 기본 실행 모드 (auto / pdca / wizard)`);
    ctx.push('');
    ctx.push(`셋업 없이도 sw-kit 기능은 사용 가능하지만, 셋업하면 더 나은 경험을 제공합니다.`);
    ctx.push('');
  } else {
    // Show setup info compactly
    ctx.push(`Setup: ${setupStatus.configTarget || 'configured'} | HUD: ${setupStatus.hudEnabled ? 'on' : 'off'} | Mode: ${setupStatus.defaultMode || 'auto'}`);
    ctx.push('');
  }

  // === Onboarding: Resume vs New (only when setup is done) ===
  if (setupStatus.completed && pdcaState?.activeFeature) {
    const feat = pdcaState.features?.[pdcaState.activeFeature];
    if (feat) {
      ctx.push(`## Active Work — Resume Available`);
      ctx.push(`Feature: ${pdcaState.activeFeature} | Stage: ${feat.currentStage || 'plan'} | Iteration: ${feat.iteration || 0}/${config.pdca.maxIterations}`);
      ctx.push(`이전 작업을 이어서 진행하려면 \`/swkit next\`를 실행하세요.`);
      ctx.push(`새 작업을 시작하려면 \`/swkit auto <feature> <task>\`를 실행하세요.`);
      ctx.push('');
    }
  } else if (!setupStatus.completed && pdcaState?.activeFeature) {
    // Setup not done but has active work — show active work anyway
    const feat = pdcaState.features?.[pdcaState.activeFeature];
    if (feat) {
      ctx.push(`## Active Work`);
      ctx.push(`Feature: ${pdcaState.activeFeature} | Stage: ${feat.currentStage || 'plan'} | Iteration: ${feat.iteration || 0}/${config.pdca.maxIterations}`);
      ctx.push('');
    }
  }

  // === Previous session ===
  const progress = getProgressSummary(projectDir);
  if (progress) {
    ctx.push(`## Previous Session`);
    ctx.push(progress);
    ctx.push('');
  }

  // === Project Memory ===
  if (memory) {
    const sections = Object.keys(memory).filter(k => memory[k] && Object.keys(memory[k]).length > 0);
    if (sections.length > 0) {
      ctx.push(`## Project Memory: ${sections.join(', ')}`);
      ctx.push('');
    }
  }

  // === Agent Team ===
  ctx.push(`## sw-kit Agent Team`);
  ctx.push(`Sam(CTO/opus) Able(PM/sonnet) Klay(Architect/opus) Jay(Backend/sonnet) Jerry(DB/sonnet) Milla(Security/sonnet) Willji(Design/sonnet) Derek(Frontend/sonnet) Rowan(Motion/sonnet) Iron(Wizard/sonnet)`);
  ctx.push('');

  // === MANDATORY RULES (like bkit's Feature Usage Report) ===
  ctx.push(`## sw-kit Mandatory Rules`);
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
  ctx.push(`Format: description: "{Name}: {구체적 작업 요약}" (3-5 words)`);
  ctx.push(`This makes Claude Code automatically display:`);
  ctx.push('```');
  ctx.push(`⏺ sw-kit:klay(Klay: 아키텍처 탐색 + 구조 분석) Opus`);
  ctx.push(`  ⎿  Done (9 tool uses · 83.6k tokens · 2m 10s)`);
  ctx.push('```');
  ctx.push(`For multi-agent spawns, also show the deployment table before spawning.`);
  ctx.push(`Never spawn agents without description. The user must ALWAYS see who is doing what.`);
  ctx.push('');
  ctx.push(`### Rule 3: Agent Entrance (Required when agent starts working)`);
  ctx.push(`Each agent shows their entrance banner when they start:`);
  ctx.push('```');
  ctx.push(`Sam: "Sam 출동합니다. 제가 검토하고 판단하겠습니다."`);
  ctx.push(`Able: "Able 왔습니다! 깔끔하게 계획 짜드릴게요."`);
  ctx.push(`Klay: "Klay 투입됩니다. 아키텍처 분석 시작합니다..."`);
  ctx.push(`Jay: "Jay 달려왔습니다! 백엔드, TDD로 갑니다."`);
  ctx.push(`Jerry: "Jerry 등장합니다. 데이터베이스는 제가 맡겠습니다."`);
  ctx.push(`Milla: "Milla 체크인합니다. 보안 리뷰 시작합니다."`);
  ctx.push(`Willji: "Willji 준비됐습니다! 멋지게 디자인 해드릴게요."`);
  ctx.push(`Derek: "Derek 나갑니다! 프론트엔드 구현 시작합니다."`);
  ctx.push(`Rowan: "Rowan 등장! 인터랙션 마법을 부려볼게요."`);
  ctx.push(`Iron: "Iron 가동합니다. 오늘 무엇을 만들어볼까요?"`);
  ctx.push('```');
  ctx.push('');
  ctx.push(`### Rule 4: Completion Report (Required at task end)`);
  ctx.push(`At the end of every completed task, show this report:`);
  ctx.push('```');
  ctx.push(`sw-kit Report`);
  ctx.push(`---`);
  ctx.push(`Team: {preset} ({N}명)`);
  ctx.push(`Agents: {list of agents that worked}`);
  ctx.push(`{Agent} - {role} - {what they did}`);
  ctx.push(`Evidence: {test/build/lint results}`);
  ctx.push(`---`);
  ctx.push('```');
  ctx.push('');
  ctx.push(`### Rule 5: TDD Enforcement`);
  ctx.push(`All code implementation MUST follow TDD: write test first (RED), implement (GREEN), refactor (REFACTOR).`);
  ctx.push('');
  ctx.push(`### Rule 6: Evidence Required`);
  ctx.push(`Never claim "done" without evidence. Run tests, build, or lint to prove completion.`);
  ctx.push('');

  // === Status Line Setup (now handled by /swkit start wizard) ===
  // Only show inline HUD prompt if setup was NOT completed (legacy fallback).
  // Once setup is done, HUD config is managed by setup-progress.
  if (!setupStatus.completed) {
    const home = homedir();
    const settingsPath = join(home, '.claude', 'settings.json');
    const hudSetupFlag = join(projectDir, '.sw-kit', 'state', 'hud-setup-done');

    if (!existsSync(hudSetupFlag)) {
      try {
        let needsSetup = true;
        if (existsSync(settingsPath)) {
          const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
          if (settings?.statusLine?.command?.includes('swkit-hud')) {
            needsSetup = false;
          }
        }
        // Don't show inline HUD prompt — /swkit start handles it
        // Just mark as checked so we don't re-check every session
        const stateDir = join(projectDir, '.sw-kit', 'state');
        if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
        writeFileSync(hudSetupFlag, new Date().toISOString());
      } catch {
        // Silent failure
      }
    }
  }

  // === Commands ===
  ctx.push(`## Commands`);
  ctx.push(`/swkit start|status|next|reset|auto|tdd|task|explore|plan|execute|review|verify|wizard|rollback|learn|help`);

  // === State GC (automatic cleanup of zombie features) ===
  try {
    const { runGC } = await import(join(pluginRoot, 'scripts/pdca/state-gc.mjs'));
    const gcResult = runGC(projectDir);
    if (gcResult.removed > 0) {
      ctx.push('');
      ctx.push(`[State GC] ${gcResult.removed}개 좀비 feature 정리됨: ${gcResult.archived.join(', ')}`);
    }
  } catch (_e) { /* GC 실패는 세션 시작을 방해하지 않음 */ }

  // === STATUS.md 갱신 ===
  try {
    const { generateStatusView } = await import(join(pluginRoot, 'scripts/pdca/status-view.mjs'));
    generateStatusView(projectDir);
  } catch (_e) { /* 뷰 생성 실패는 세션 시작을 방해하지 않음 */ }

  const context = ctx.join('\n');
  const maxTokens = config.context.maxSessionStartTokens;
  const trimmed = trimToTokenBudget(context, maxTokens);

  trackInjection('session-start', trimmed);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: trimmed }
  }));

  log.info('Session started', { pdcaActive: !!pdcaState?.activeFeature, memoryLoaded: !!memory });

} catch (err) {
  log.error('Session start failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
