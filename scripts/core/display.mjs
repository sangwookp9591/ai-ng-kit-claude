/**
 * aing Display — Colorful terminal output with cute team visualization
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

  // Status
  red: '\x1b[31m',

  // Backgrounds
  bgPurple: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
};

// ANSI text icons (no emoji — terminal-safe, Willji design)
const icon = {
  star:   `${C.purple}*${C.reset}`,
  target: `${C.blue}@${C.reset}`,
  tri:    `${C.sky}^${C.reset}`,
  gear:   `${C.orange}~${C.reset}`,
  db:     `${C.yellow}#${C.reset}`,
  lock:   `${C.green}+${C.reset}`,
  pen:    `${C.pink}%%${C.reset}`,
  screen: `${C.cyan}[]${C.reset}`,
  spark:  `${C.lime}**${C.reset}`,
  wand:   `${C.magenta}~*${C.reset}`,
  chart:  `${C.cyan}|#|${C.reset}`,
  brain:  `${C.purple}{o}${C.reset}`,
  route:  `${C.orange}>>>${C.reset}`,
  chain:  `${C.green}<->${C.reset}`,
  heart:  `${C.lime}<3${C.reset}`,
};

const AGENTS = {
  sam:     { icon: icon.star,   color: C.purple, name: 'Sam', role: 'CTO / Lead', desc: 'Project oversight, final review, evidence chain', model: 'opus' },
  able:    { icon: icon.target, color: C.blue, name: 'Able', role: 'PM / Planning', desc: 'Requirements analysis, task decomposition', model: 'sonnet' },
  klay:    { icon: icon.tri,    color: C.sky, name: 'Klay', role: 'Architect / Explorer', desc: 'System design, codebase scanning', model: 'opus' },
  jay:     { icon: icon.gear,   color: C.orange, name: 'Jay', role: 'Backend / API', desc: 'API and server logic implementation', model: 'sonnet' },
  jerry:   { icon: icon.db,     color: C.yellow, name: 'Jerry', role: 'Backend / DB', desc: 'Database and infrastructure', model: 'sonnet' },
  milla:   { icon: icon.lock,   color: C.green, name: 'Milla', role: 'Security / Review', desc: 'Security audit and code review', model: 'sonnet' },
  willji:  { icon: icon.pen,    color: C.pink, name: 'Willji', role: 'Designer / UI-UX', desc: 'Component design, layout, design tokens', model: 'sonnet' },
  derek:   { icon: icon.screen, color: C.cyan, name: 'Derek', role: 'Frontend / Build', desc: 'Screen implementation, state management', model: 'sonnet' },
  rowan:   { icon: icon.spark,  color: C.lime, name: 'Rowan', role: 'Frontend / Motion', desc: 'Animations, micro-interactions, UX polish', model: 'sonnet' },
  iron:    { icon: icon.wand,   color: C.magenta, name: 'Iron', role: 'Wizard', desc: 'Guided magic for non-developers', model: 'sonnet' },
};

const INNOVATIONS = [
  { icon: icon.chart, name: 'Context Budget', color: C.cyan, desc: 'Token tracking and optimization' },
  { icon: icon.brain, name: 'Cross-Session Learning', color: C.purple, desc: 'Success pattern auto-capture' },
  { icon: icon.route, name: 'Adaptive Routing', color: C.orange, desc: 'Complexity-based model selection' },
  { icon: icon.chain, name: 'Evidence Chain', color: C.green, desc: 'Structured completion proof' },
  { icon: icon.heart, name: 'Self-Healing', color: C.lime, desc: 'Auto failure detection and recovery' },
];

/**
 * Generate the aing banner
 */
export function banner() {
  return `
${C.bold}${C.purple}  ┌─────────────────────────────────────────────┐${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.bold}${C.pink}aing${C.reset} ${C.dim}v2.3.1${C.reset}  ${C.italic}Harness Engineering Agent${C.reset}  ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}                                             ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.dim}개발자에게는 최고의 도우미${C.reset}                ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.dim}비개발자에게는 최고의 마술사${C.reset} ${C.magenta}~*${C.reset}          ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  └─────────────────────────────────────────────┘${C.reset}`;
}

/**
 * Generate the team visualization (grouped by department)
 */
export function teamDisplay() {
  const groups = [
    { label: `${C.purple}CTO${C.reset}`, members: ['sam'] },
    { label: `${C.blue}Planning${C.reset}`, members: ['able', 'klay'] },
    { label: `${C.orange}Backend${C.reset}`, members: ['jay', 'jerry', 'milla'] },
    { label: `${C.pink}Design${C.reset}`, members: ['willji'] },
    { label: `${C.cyan}Frontend${C.reset}`, members: ['derek', 'rowan'] },
    { label: `${C.magenta}Magic${C.reset}`, members: ['iron'] },
  ];

  const lines = [
    '',
    `${C.bold}  aing Agent Team${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const group of groups) {
    lines.push(`  ${C.bold}${group.label}${C.reset}`);
    for (const key of group.members) {
      const agent = AGENTS[key];
      if (!agent) continue;
      const modelTag = `${C.dim}[${agent.model}]${C.reset}`;
      lines.push(
        `    ${agent.icon} ${agent.color}${C.bold}${agent.name}${C.reset} ${C.dim}${agent.role}${C.reset} ${modelTag}`
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
    `${C.bold}  5 Innovations${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const inn of INNOVATIONS) {
    lines.push(`  ${inn.icon} ${inn.color}${C.bold}${inn.name}${C.reset} — ${C.dim}${inn.desc}${C.reset}`);
  }

  return lines.join('\n');
}

/**
 * Generate PDCA stage flow visualization
 */
export function pdcaFlow(currentStage) {
  const stages = [
    { key: 'plan', icon: `${C.blue}P${C.reset}`, color: C.blue },
    { key: 'do', icon: `${C.orange}D${C.reset}`, color: C.orange },
    { key: 'check', icon: `${C.cyan}C${C.reset}`, color: C.cyan },
    { key: 'act', icon: `${C.yellow}A${C.reset}`, color: C.yellow },
    { key: 'review', icon: `${C.green}R${C.reset}`, color: C.green },
  ];

  const parts = stages.map(s => {
    const active = s.key === currentStage;
    if (active) {
      return `${s.color}${C.bold}[${s.icon} ${s.key.toUpperCase()}]${C.reset}`;
    }
    return `${C.dim}${s.icon} ${s.key}${C.reset}`;
  });

  return `  ${parts.join(` ${C.dim}→${C.reset} `)}`;
}

/**
 * Generate commands help
 */
export function commandsHelp() {
  const cmds = [
    // Vibe Coding (바이브코딩 — 자연어로 시작)
    { cmd: '/aing do <자연어>', desc: 'Auto-route: 의도 분석 → 최적 파이프라인 자동 선택', icon: icon.route, section: 'Vibe Coding' },
    { cmd: '/aing wizard', desc: 'Iron magic: 비개발자도 자연어로 프로젝트 완성', icon: icon.wand },
    { cmd: '/aing init <프로젝트>', desc: 'Project init: 질문 기반 문맥 수집 → 프로젝트 문서 생성', icon: `${C.blue}(i)${C.reset}` },
    // Pipeline (파이프라인)
    { cmd: '/aing auto <task>', desc: 'Full pipeline: 자동 팀 구성 + 병렬 실행', icon: `${C.green}|>${C.reset}`, section: 'Pipeline' },
    { cmd: '/aing team [agents] <task>', desc: 'Staged: plan→exec→verify→fix 루프 (품질 보장)', icon: `${C.purple}||${C.reset}` },
    { cmd: '/aing plan <task>', desc: 'Able+Klay: 요구사항 분석 → 작업 분해', icon: icon.target },
    { cmd: '/aing explore <target>', desc: 'Klay: 코드베이스 탐색 + 구조 분석', icon: icon.tri },
    // Development (개발)
    { cmd: '/aing start <name>', desc: 'PDCA cycle: Plan→Do→Check→Act→Review', icon: `${C.orange}>>${C.reset}`, section: 'Development' },
    { cmd: '/aing tdd start <feat>', desc: 'TDD: 🔴Red→🟢Green→🔵Refactor', icon: `${C.red}(R)${C.reset}` },
    { cmd: '/aing execute <task>', desc: 'Jay+Derek: Backend + Frontend 구현', icon: icon.gear },
    { cmd: '/aing debug <증상>', desc: 'Scientific debug: 가설→테스트→결론 (영구 상태)', icon: `${C.orange}!${C.reset}` },
    // Quality (품질)
    { cmd: '/aing review', desc: 'Milla: 보안 + 코드 품질 리뷰', icon: icon.lock, section: 'Quality' },
    { cmd: '/aing verify', desc: 'Sam: 증거 체인 + 목표 달성 검증', icon: icon.star },
    { cmd: '/aing cost', desc: 'Cost report: 에이전트별 토큰/비용 추정', icon: icon.chart },
    // Utility
    { cmd: '/aing rollback', desc: 'Git checkpoint 롤백', icon: `${C.orange}<>>${C.reset}`, section: 'Utility' },
    { cmd: '/aing agent-ui', desc: '3D Agent Office 브라우저 오픈', icon: `${C.cyan}{}${C.reset}` },
    { cmd: '/aing status', desc: 'Dashboard (PDCA+TDD+Task)', icon: icon.chart },
    { cmd: '/aing help', desc: 'This help', icon: `${C.sky}[?]${C.reset}` },
  ];

  const lines = [
    '',
    `${C.bold}  Commands${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  let currentSection = '';
  for (const c of cmds) {
    if (c.section && c.section !== currentSection) {
      currentSection = c.section;
      lines.push('');
      lines.push(`  ${C.bold}${C.dim}[ ${currentSection} ]${C.reset}`);
    }
    lines.push(`  ${c.icon} ${C.cyan}${c.cmd}${C.reset}`);
    lines.push(`     ${C.dim}${c.desc}${C.reset}`);
  }

  return lines.join('\n');
}

/**
 * Generate best practices guide
 */
export function bestPracticesGuide() {
  const lines = [
    '',
    `${C.bold}  Best Practices — 이렇게 쓰면 Best${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
    '',
    `  ${C.bold}${C.green}1. 바이브코딩 (처음이라면)${C.reset}`,
    `     ${C.cyan}/aing do "원하는 것을 자연어로"${C.reset}`,
    `     ${C.dim}→ 의도 분석 → auto/plan/team 자동 선택${C.reset}`,
    `     ${C.dim}예: /aing do "로그인 기능 추가해줘"${C.reset}`,
    `     ${C.dim}예: /aing do "src/auth.ts에 JWT 검증 추가"${C.reset}`,
    '',
    `  ${C.bold}${C.magenta}2. 비개발자라면${C.reset}`,
    `     ${C.cyan}/aing wizard${C.reset}`,
    `     ${C.dim}→ Iron이 질문하면 답만 하면 됩니다${C.reset}`,
    '',
    `  ${C.bold}${C.blue}3. 새 프로젝트 시작${C.reset}`,
    `     ${C.cyan}/aing init → /aing do "첫 기능"${C.reset}`,
    `     ${C.dim}→ 프로젝트 문맥 수집 후 바로 개발 시작${C.reset}`,
    '',
    `  ${C.bold}${C.orange}4. 빠른 수정${C.reset}`,
    `     ${C.cyan}/aing auto "구체적 작업"${C.reset}`,
    `     ${C.dim}→ 파일/함수명 포함하면 Solo 모드로 즉시 실행${C.reset}`,
    '',
    `  ${C.bold}${C.purple}5. 대규모 기능${C.reset}`,
    `     ${C.cyan}/aing team "대규모 작업"${C.reset}`,
    `     ${C.dim}→ plan→exec→verify→fix 품질 루프${C.reset}`,
    '',
    `  ${C.bold}${C.red}6. 버그 잡기${C.reset}`,
    `     ${C.cyan}/aing debug "증상 설명"${C.reset}`,
    `     ${C.dim}→ 가설→테스트→결론, 세션 끊겨도 재개 가능${C.reset}`,
    '',
    `  ${C.dim}  Tip: 모르겠으면 /aing do 에 아무거나 써보세요.${C.reset}`,
    `  ${C.dim}  aing이 알아서 최적 경로를 찾아줍니다.${C.reset}`,
  ];
  return lines.join('\n');
}

/**
 * Generate full help output
 */
export function fullHelp() {
  return [
    banner(),
    teamDisplay(),
    bestPracticesGuide(),
    commandsHelp(),
    '',
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
    `  ${C.dim}GitHub: ${C.reset}${C.sky}sangwookp9591/ai-ng-kit-claude${C.reset}`,
    `  ${C.dim}Install: ${C.reset}${C.sky}/plugin marketplace add sangwookp9591/ai-ng-kit-claude${C.reset}`,
    '',
  ].join('\n');
}

export { C, AGENTS, INNOVATIONS };
