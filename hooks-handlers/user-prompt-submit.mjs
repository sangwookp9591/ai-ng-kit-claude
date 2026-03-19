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

  // Always show team recommendation
  parts.push(`[sw-kit Team] ${team.team.name} (${team.team.workers.length}명, ${cost.estimated})`);
  parts.push(`Members: ${team.team.workers.map(w => w.name).join(', ')}`);

  // Intent-specific guidance
  if (intent.isWizardMode) {
    parts.push('Iron wizard mode -- guide step by step.');
  } else if (intent.pdcaStage === 'plan') {
    parts.push('Klay scans -> Able plans -> .sw-kit/plans/ -> "/swkit auto" to execute.');
  } else if (intent.pdcaStage === 'do') {
    parts.push(`Executing with ${team.team.workers.map(w => w.name).join(' + ')}. TDD enforced.`);
  } else if (intent.pdcaStage === 'check') {
    parts.push('Milla security review + Sam evidence chain verification.');
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: parts.join('\n') }
  }));
} catch (err) {
  process.stderr.write(`[sw-kit:user-prompt] ${err.message}\n`);
  process.stdout.write('{}');
}
