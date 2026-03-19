/**
 * sw-kit Display — Colorful terminal output with cute team visualization
 * @module scripts/core/display
 */

// ANSI color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

  // Team colors
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[95m',
  orange: '\x1b[38;5;208m',
  pink: '\x1b[38;5;213m',
  lime: '\x1b[38;5;154m',
  sky: '\x1b[38;5;117m',

  // Backgrounds
  bgPurple: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
};

const AGENTS = {
  explorer: { emoji: '🔍', color: C.cyan, name: 'Scout', role: 'Explorer', desc: '코드베이스를 탐색하고 구조를 파악합니다', model: 'haiku' },
  planner: { emoji: '📋', color: C.blue, name: 'Archie', role: 'Planner', desc: '작업을 분해하고 계획을 수립합니다', model: 'sonnet' },
  executor: { emoji: '⚡', color: C.orange, name: 'Bolt', role: 'Executor', desc: '코드를 구현하고 수정합니다', model: 'sonnet/opus' },
  reviewer: { emoji: '🛡️', color: C.green, name: 'Shield', role: 'Reviewer', desc: '코드 품질과 보안을 점검합니다', model: 'sonnet' },
  verifier: { emoji: '✅', color: C.lime, name: 'Proof', role: 'Verifier', desc: '증거 체인으로 완료를 증명합니다', model: 'haiku' },
  wizard: { emoji: '🪄', color: C.magenta, name: 'Iron', role: 'Wizard', desc: '비개발자를 마법처럼 안내합니다', model: 'sonnet' },
};

const INNOVATIONS = [
  { emoji: '📊', name: 'Context Budget', color: C.cyan, desc: '토큰 소비 추적/최적화' },
  { emoji: '🧠', name: 'Cross-Session Learning', color: C.purple, desc: '성공 패턴 자동 학습' },
  { emoji: '🎯', name: 'Adaptive Routing', color: C.orange, desc: '복잡도 기반 모델 자동 선택' },
  { emoji: '🔗', name: 'Evidence Chain', color: C.green, desc: '구조화된 완료 증명' },
  { emoji: '💚', name: 'Self-Healing', color: C.lime, desc: '장애 자동 감지/복구' },
];

/**
 * Generate the sw-kit banner
 */
export function banner() {
  return `
${C.bold}${C.purple}  ┌─────────────────────────────────────────────┐${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.bold}${C.pink}sw-kit${C.reset} ${C.dim}v0.1.0${C.reset}  ${C.italic}Harness Engineering Agent${C.reset}  ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}                                             ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.dim}개발자에게는 최고의 도우미${C.reset}                ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.dim}비개발자에게는 최고의 마술사${C.reset} ${C.magenta}🪄${C.reset}           ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  └─────────────────────────────────────────────┘${C.reset}`;
}

/**
 * Generate the team visualization
 */
export function teamDisplay() {
  const lines = [
    '',
    `${C.bold}  🏠 Agent Team${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const [key, agent] of Object.entries(AGENTS)) {
    const modelTag = `${C.dim}[${agent.model}]${C.reset}`;
    lines.push(
      `  ${agent.emoji} ${agent.color}${C.bold}${agent.name}${C.reset} ${C.dim}(${agent.role})${C.reset} ${modelTag}`
    );
    lines.push(`     ${C.dim}${agent.desc}${C.reset}`);
  }

  return lines.join('\n');
}

/**
 * Generate innovations display
 */
export function innovationsDisplay() {
  const lines = [
    '',
    `${C.bold}  🚀 5 Innovations${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const inn of INNOVATIONS) {
    lines.push(`  ${inn.emoji} ${inn.color}${C.bold}${inn.name}${C.reset} — ${C.dim}${inn.desc}${C.reset}`);
  }

  return lines.join('\n');
}

/**
 * Generate PDCA stage flow visualization
 */
export function pdcaFlow(currentStage) {
  const stages = [
    { key: 'plan', emoji: '📋', color: C.blue },
    { key: 'do', emoji: '⚡', color: C.orange },
    { key: 'check', emoji: '🔍', color: C.cyan },
    { key: 'act', emoji: '🔄', color: C.yellow },
    { key: 'review', emoji: '✅', color: C.green },
  ];

  const parts = stages.map(s => {
    const active = s.key === currentStage;
    if (active) {
      return `${s.color}${C.bold}[${s.emoji} ${s.key.toUpperCase()}]${C.reset}`;
    }
    return `${C.dim}${s.emoji} ${s.key}${C.reset}`;
  });

  return `  ${parts.join(` ${C.dim}→${C.reset} `)}`;
}

/**
 * Generate commands help
 */
export function commandsHelp() {
  const cmds = [
    { cmd: '/swkit start <name>', desc: 'PDCA 사이클 시작', emoji: '🚀' },
    { cmd: '/swkit status', desc: '현재 상태 확인', emoji: '📊' },
    { cmd: '/swkit next', desc: '다음 단계 진행', emoji: '⏭️' },
    { cmd: '/swkit reset <name>', desc: 'PDCA 초기화', emoji: '🔄' },
    { cmd: '/swkit explore <target>', desc: 'Scout로 코드 탐색', emoji: '🔍' },
    { cmd: '/swkit plan <task>', desc: 'Archie로 계획 수립', emoji: '📋' },
    { cmd: '/swkit execute <task>', desc: 'Bolt로 코드 구현', emoji: '⚡' },
    { cmd: '/swkit review', desc: 'Shield로 코드 리뷰', emoji: '🛡️' },
    { cmd: '/swkit verify', desc: 'Proof로 완료 검증', emoji: '✅' },
    { cmd: '/swkit wizard', desc: 'Iron 마술사 모드', emoji: '🪄' },
    { cmd: '/swkit learn show', desc: '학습 기록 조회', emoji: '🧠' },
    { cmd: '/swkit help', desc: '이 도움말 표시', emoji: '❓' },
  ];

  const lines = [
    '',
    `${C.bold}  ⌨️  Commands${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const c of cmds) {
    lines.push(`  ${c.emoji} ${C.cyan}${c.cmd}${C.reset}`);
    lines.push(`     ${C.dim}${c.desc}${C.reset}`);
  }

  return lines.join('\n');
}

/**
 * Generate full help output
 */
export function fullHelp() {
  return [
    banner(),
    teamDisplay(),
    innovationsDisplay(),
    commandsHelp(),
    '',
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
    `  ${C.dim}GitHub: ${C.reset}${C.sky}sangwookp9591/sw-kit-claude${C.reset}`,
    `  ${C.dim}Install: ${C.reset}${C.sky}/plugin marketplace add sangwookp9591/sw-kit-claude${C.reset}`,
    '',
  ].join('\n');
}

export { C, AGENTS, INNOVATIONS };
