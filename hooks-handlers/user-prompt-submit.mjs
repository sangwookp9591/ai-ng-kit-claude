/**
 * sw-kit UserPromptSubmit Hook v1.5.1
 * Intent detection + Team size recommendation + Agent guidance.
 */
import { readStdinJSON } from '../scripts/core/stdin.mjs';
import { detectIntent } from '../scripts/i18n/intent-detector.mjs';
import { selectTeam, estimateTeamCost } from '../scripts/pipeline/team-orchestrator.mjs';

try {
  const parsed = await readStdinJSON();
  const prompt = parsed.prompt || parsed.user_prompt || parsed.content || '';

  if (!prompt) { process.stdout.write('{}'); process.exit(0); }

  const intent = detectIntent(prompt);
  const parts = [];

  // Estimate task complexity from prompt signals
  const lower = prompt.toLowerCase();
  const signals = {
    fileCount: Math.max((prompt.match(/\.(tsx?|jsx?|py|java|go|rs|vue|svelte)/gi) || []).length, 1),
    domainCount: new Set([
      /backend|api|server|백엔드|서버|엔드포인트/i.test(prompt) ? 'be' : null,
      /frontend|ui|page|component|프론트|화면|페이지|컴포넌트|\.tsx|\.jsx/i.test(prompt) ? 'fe' : null,
      /db|database|schema|migration|데이터베이스|스키마|마이그레이션/i.test(prompt) ? 'db' : null,
      /design|css|style|디자인|스타일|레이아웃|figma/i.test(prompt) ? 'design' : null,
      /auth|security|login|인증|보안|로그인|jwt|token/i.test(prompt) ? 'security' : null,
      /test|tdd|검증|테스트/i.test(prompt) ? 'test' : null,
    ].filter(Boolean)).size,
    hasSecurity: /auth|security|login|token|jwt|password|encrypt|인증|보안|로그인/i.test(prompt),
    hasTests: /test|tdd|spec|jest|vitest|테스트|검증/i.test(prompt),
    hasArchChange: /architect|refactor|migration|restructure|아키텍처|리팩토링|마이그레이션/i.test(prompt),
    lineCount: prompt.length > 200 ? 200 : prompt.length > 100 ? 80 : prompt.length > 50 ? 30 : 10,
  };

  const team = selectTeam(signals);
  const cost = estimateTeamCost(team.preset);

  // Always show team recommendation with agent deployment table
  parts.push(`━━━ sw-kit Team Deployment ━━━`);
  parts.push(`${team.team.name} (${team.team.workers.length}명, ${cost.estimated})`);
  parts.push('');
  parts.push('  Agent        Role                    Model    Task');
  parts.push('  ─────        ────                    ─────    ────');
  for (const w of team.team.workers) {
    const name = w.name.charAt(0).toUpperCase() + w.name.slice(1);
    const padName = name.padEnd(12);
    const padRole = w.role.replace(/^[^\s]+\s/, '').padEnd(23); // strip emoji prefix
    const padModel = w.model.padEnd(8);
    const taskHint = {
      planner: '작업 분해 + 계획 수립',
      executor: '코드 구현 (TDD)',
      reviewer: '보안/품질 리뷰',
      sam: '증거 수집 + 최종 판정',
    }[w.agent] || w.agent;
    parts.push(`  ${padName} ${padRole} ${padModel} ${taskHint}`);
  }
  parts.push('');

  // Pipeline summary — one-line routing preview
  const pipeline = team.team.workers.map(w => {
    const name = w.name.charAt(0).toUpperCase() + w.name.slice(1);
    const shortRole = w.role.includes('—') ? w.role.split('—')[1].trim().split(/\s+/)[0] : w.role.split(' ').pop();
    return `${name}(${shortRole})`;
  }).join(' → ');
  parts.push(`  Pipeline: ${pipeline}`);
  parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Intent-specific guidance
  if (intent.isWizardMode) {
    parts.push('Iron(Wizard) 마법사 모드 — 질문-응답으로 단계별 진행합니다.');
  } else if (intent.pdcaStage === 'plan') {
    parts.push('Klay(Architect)가 코드 탐색 → Able(PM)이 계획 수립 → .sw-kit/plans/ 저장 → "/swkit auto"로 실행.');
  } else if (intent.pdcaStage === 'do') {
    parts.push(`${pipeline} 투입하여 TDD 기반 구현 진행.`);
  } else if (intent.pdcaStage === 'check') {
    parts.push('Milla(Security)가 보안 리뷰 + Sam(CTO)이 증거 체인 검증.');
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: parts.join('\n') }
  }));
} catch (err) {
  process.stderr.write(`[sw-kit:user-prompt] ${err.message}\n`);
  process.stdout.write('{}');
}
