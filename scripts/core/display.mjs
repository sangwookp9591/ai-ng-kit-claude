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
  // 🎯 기획 (Planning)
  able:    { emoji: '🎯', color: C.blue, name: 'Able', role: 'PM / 기획', desc: '제품 기획과 요구사항을 정리합니다', model: 'sonnet' },
  klay:    { emoji: '📐', color: C.sky, name: 'Klay', role: 'Architect / 설계', desc: '시스템 구조를 설계하고 기술 결정을 내립니다', model: 'opus' },

  // 👑 CTO
  sam:     { emoji: '👑', color: C.purple, name: 'Sam', role: 'CTO / 총괄', desc: '프로젝트를 총괄하고 팀을 이끕니다', model: 'opus' },

  // ⚙️ Backend
  jay:     { emoji: '⚙️', color: C.orange, name: 'Jay', role: 'Backend / API', desc: 'API와 서버 로직을 구현합니다', model: 'sonnet' },
  jerry:   { emoji: '🗄️', color: C.yellow, name: 'Jerry', role: 'Backend / DB', desc: '데이터베이스와 인프라를 관리합니다', model: 'sonnet' },
  milla:   { emoji: '🔒', color: C.green, name: 'Milla', role: 'Backend / Security', desc: '보안과 인증 시스템을 담당합니다', model: 'sonnet' },

  // 🎨 Design
  willji:  { emoji: '🎨', color: C.pink, name: 'Willji', role: 'Designer / UI·UX', desc: 'UI/UX 디자인과 컴포넌트를 설계합니다', model: 'sonnet' },

  // 🖥️ Frontend
  derek:   { emoji: '🖥️', color: C.cyan, name: 'Derek', role: 'Frontend / 구현', desc: '프론트엔드 화면을 구현합니다', model: 'sonnet' },
  rowan:   { emoji: '✨', color: C.lime, name: 'Rowan', role: 'Frontend / 인터랙션', desc: '애니메이션과 사용자 인터랙션을 담당합니다', model: 'sonnet' },

  // 🔍 탐색 & 검증
  scout:   { emoji: '🔍', color: C.cyan, name: 'Scout', role: 'Explorer', desc: '코드베이스를 탐색하고 구조를 파악합니다', model: 'haiku' },
  proof:   { emoji: '✅', color: C.lime, name: 'Proof', role: 'Verifier', desc: '증거 체인으로 완료를 증명합니다', model: 'haiku' },

  // 🪄 마법사
  iron:    { emoji: '🪄', color: C.magenta, name: 'Iron', role: 'Wizard', desc: '비개발자를 마법처럼 안내합니다', model: 'sonnet' },
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
 * Generate the team visualization (grouped by department)
 */
export function teamDisplay() {
  const groups = [
    { label: '👑 CTO', members: ['sam'] },
    { label: '🎯 기획', members: ['able', 'klay'] },
    { label: '⚙️ Backend', members: ['jay', 'jerry', 'milla'] },
    { label: '🎨 Design', members: ['willji'] },
    { label: '🖥️ Frontend', members: ['derek', 'rowan'] },
    { label: '🔧 Ops', members: ['scout', 'proof'] },
    { label: '🪄 Magic', members: ['iron'] },
  ];

  const lines = [
    '',
    `${C.bold}  🏠 sw-kit Agent Team${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const group of groups) {
    lines.push(`  ${C.bold}${group.label}${C.reset}`);
    for (const key of group.members) {
      const agent = AGENTS[key];
      if (!agent) continue;
      const modelTag = `${C.dim}[${agent.model}]${C.reset}`;
      lines.push(
        `    ${agent.emoji} ${agent.color}${C.bold}${agent.name}${C.reset} ${C.dim}${agent.role}${C.reset} ${modelTag}`
      );
    }
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
