/**
 * aing Display — Colorful terminal output with cute team visualization
 * @module scripts/core/display
 */
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
    star: `${C.purple}*${C.reset}`,
    target: `${C.blue}@${C.reset}`,
    tri: `${C.sky}^${C.reset}`,
    gear: `${C.orange}~${C.reset}`,
    db: `${C.yellow}#${C.reset}`,
    lock: `${C.green}+${C.reset}`,
    pen: `${C.pink}%%${C.reset}`,
    screen: `${C.cyan}[]${C.reset}`,
    spark: `${C.lime}**${C.reset}`,
    wand: `${C.magenta}~*${C.reset}`,
    chart: `${C.cyan}|#|${C.reset}`,
    brain: `${C.purple}{o}${C.reset}`,
    route: `${C.orange}>>>${C.reset}`,
    chain: `${C.green}<->${C.reset}`,
    heart: `${C.lime}<3${C.reset}`,
};
const AGENTS = {
    sam: { icon: icon.star, color: C.purple, name: 'Sam', role: 'CTO / Lead', desc: 'Project oversight, final review, evidence chain', model: 'opus' },
    able: { icon: icon.target, color: C.blue, name: 'Able', role: 'PM / Planning', desc: 'Requirements analysis, task decomposition', model: 'sonnet' },
    klay: { icon: icon.tri, color: C.sky, name: 'Klay', role: 'Architect / Explorer', desc: 'System design, codebase scanning', model: 'opus' },
    jay: { icon: icon.gear, color: C.orange, name: 'Jay', role: 'Backend / API', desc: 'API and server logic implementation', model: 'sonnet' },
    jerry: { icon: icon.db, color: C.yellow, name: 'Jerry', role: 'Backend / DB', desc: 'Database and infrastructure', model: 'sonnet' },
    milla: { icon: icon.lock, color: C.green, name: 'Milla', role: 'Security / Review', desc: 'Security audit and code review', model: 'sonnet' },
    willji: { icon: icon.pen, color: C.pink, name: 'Willji', role: 'Designer / UI-UX', desc: 'Component design, layout, design tokens', model: 'sonnet' },
    derek: { icon: icon.spark, color: C.cyan, name: 'Derek', role: 'UI Motion / Animation', desc: 'Animations, micro-interactions, UX polish', model: 'sonnet' },
    rowan: { icon: icon.screen, color: C.lime, name: 'Rowan', role: 'Mobile / Flutter', desc: 'Flutter, iOS, AOS senior engineer', model: 'sonnet' },
    iron: { icon: icon.wand, color: C.magenta, name: 'Iron', role: 'Web Frontend', desc: 'React/Next.js screen implementation, state management', model: 'sonnet' },
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
${C.bold}${C.purple}  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510${C.reset}
${C.bold}${C.purple}  \u2502${C.reset}  ${C.bold}${C.pink}aing${C.reset} ${C.dim}v2.3.1${C.reset}  ${C.italic}Harness Engineering Agent${C.reset}  ${C.bold}${C.purple}\u2502${C.reset}
${C.bold}${C.purple}  \u2502${C.reset}                                             ${C.bold}${C.purple}\u2502${C.reset}
${C.bold}${C.purple}  \u2502${C.reset}  ${C.dim}\uAC1C\uBC1C\uC790\uC5D0\uAC8C\uB294 \uCD5C\uACE0\uC758 \uB3C4\uC6B0\uBBF8${C.reset}                ${C.bold}${C.purple}\u2502${C.reset}
${C.bold}${C.purple}  \u2502${C.reset}  ${C.dim}\uBE44\uAC1C\uBC1C\uC790\uC5D0\uAC8C\uB294 \uCD5C\uACE0\uC758 \uB9C8\uC220\uC0AC${C.reset} ${C.magenta}~*${C.reset}          ${C.bold}${C.purple}\u2502${C.reset}
${C.bold}${C.purple}  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518${C.reset}`;
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
        { label: `${C.cyan}Frontend${C.reset}`, members: ['iron', 'rowan'] },
        { label: `${C.magenta}Mobile${C.reset}`, members: ['derek'] },
    ];
    const lines = [
        '',
        `${C.bold}  aing Agent Team${C.reset}`,
        `${C.dim}  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${C.reset}`,
    ];
    for (const group of groups) {
        lines.push(`  ${C.bold}${group.label}${C.reset}`);
        for (const key of group.members) {
            const agent = AGENTS[key];
            if (!agent)
                continue;
            const modelTag = `${C.dim}[${agent.model}]${C.reset}`;
            lines.push(`    ${agent.icon} ${agent.color}${C.bold}${agent.name}${C.reset} ${C.dim}${agent.role}${C.reset} ${modelTag}`);
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
        `${C.dim}  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${C.reset}`,
    ];
    for (const inn of INNOVATIONS) {
        lines.push(`  ${inn.icon} ${inn.color}${C.bold}${inn.name}${C.reset} \u2014 ${C.dim}${inn.desc}${C.reset}`);
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
    return `  ${parts.join(` ${C.dim}\u2192${C.reset} `)}`;
}
/**
 * Generate commands help
 */
export function commandsHelp() {
    const cmds = [
        // Vibe Coding
        { cmd: '/aing do <\uC790\uC5F0\uC5B4>', desc: 'Auto-route: \uC758\uB3C4 \uBD84\uC11D \u2192 \uCD5C\uC801 \uD30C\uC774\uD504\uB77C\uC778 \uC790\uB3D9 \uC120\uD0DD', icon: icon.route, section: 'Vibe Coding' },
        { cmd: '/aing wizard', desc: 'Iron: \uBE44\uAC1C\uBC1C\uC790\uB3C4 \uC790\uC5F0\uC5B4\uB85C \uD504\uB85C\uC81D\uD2B8 \uC644\uC131', icon: icon.wand },
        { cmd: '/aing init <\uD504\uB85C\uC81D\uD2B8>', desc: 'Project init: \uC9C8\uBB38 \uAE30\uBC18 \uBB38\uB9E5 \uC218\uC9D1 \u2192 \uD504\uB85C\uC81D\uD2B8 \uBB38\uC11C \uC0DD\uC131', icon: `${C.blue}(i)${C.reset}` },
        // Pipeline
        { cmd: '/aing auto <task>', desc: 'Full pipeline: \uC790\uB3D9 \uD300 \uAD6C\uC131 + \uBCD1\uB82C \uC2E4\uD589', icon: `${C.green}|>${C.reset}`, section: 'Pipeline' },
        { cmd: '/aing team [agents] <task>', desc: 'Staged: plan\u2192exec\u2192verify\u2192fix \uB8E8\uD504 (\uD488\uC9C8 \uBCF4\uC7A5)', icon: `${C.purple}||${C.reset}` },
        { cmd: '/aing plan <task>', desc: 'Able+Klay: \uC694\uAD6C\uC0AC\uD56D \uBD84\uC11D \u2192 \uC791\uC5C5 \uBD84\uD574', icon: icon.target },
        { cmd: '/aing explore <target>', desc: 'Klay: \uCF54\uB4DC\uBCA0\uC774\uC2A4 \uD0D0\uC0C9 + \uAD6C\uC870 \uBD84\uC11D', icon: icon.tri },
        // Development
        { cmd: '/aing start <name>', desc: 'PDCA cycle: Plan\u2192Do\u2192Check\u2192Act\u2192Review', icon: `${C.orange}>>${C.reset}`, section: 'Development' },
        { cmd: '/aing tdd start <feat>', desc: 'TDD: \uD83D\uDD34Red\u2192\uD83D\uDFE2Green\u2192\uD83D\uDD35Refactor', icon: `${C.red}(R)${C.reset}` },
        { cmd: '/aing execute <task>', desc: 'Jay+Derek: Backend + Frontend \uAD6C\uD604', icon: icon.gear },
        { cmd: '/aing debug <\uC99D\uC0C1>', desc: 'Scientific debug: \uAC00\uC124\u2192\uD14C\uC2A4\uD2B8\u2192\uACB0\uB860 (\uC601\uAD6C \uC0C1\uD0DC)', icon: `${C.orange}!${C.reset}` },
        // Quality
        { cmd: '/aing review', desc: 'Milla: \uBCF4\uC548 + \uCF54\uB4DC \uD488\uC9C8 \uB9AC\uBDF0', icon: icon.lock, section: 'Quality' },
        { cmd: '/aing verify', desc: 'Sam: \uC99D\uAC70 \uCCB4\uC778 + \uBAA9\uD45C \uB2EC\uC131 \uAC80\uC99D', icon: icon.star },
        { cmd: '/aing cost', desc: 'Cost report: \uC5D0\uC774\uC804\uD2B8\uBCC4 \uD1A0\uD070/\uBE44\uC6A9 \uCD94\uC815', icon: icon.chart },
        // Utility
        { cmd: '/aing rollback', desc: 'Git checkpoint \uB864\uBC31', icon: `${C.orange}<>>${C.reset}`, section: 'Utility' },
        { cmd: '/aing agent-ui', desc: '3D Agent Office \uBE0C\uB77C\uC6B0\uC800 \uC624\uD508', icon: `${C.cyan}{}${C.reset}` },
        { cmd: '/aing status', desc: 'Dashboard (PDCA+TDD+Task)', icon: icon.chart },
        { cmd: '/aing help', desc: 'This help', icon: `${C.sky}[?]${C.reset}` },
    ];
    const lines = [
        '',
        `${C.bold}  Commands${C.reset}`,
        `${C.dim}  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${C.reset}`,
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
        `${C.bold}  Best Practices \u2014 \uC774\uB807\uAC8C \uC4F0\uBA74 Best${C.reset}`,
        `${C.dim}  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${C.reset}`,
        '',
        `  ${C.bold}${C.green}1. \uBC14\uC774\uBE0C\uCF54\uB529 (\uCC98\uC74C\uC774\uB77C\uBA74)${C.reset}`,
        `     ${C.cyan}/aing do "\uC6D0\uD558\uB294 \uAC83\uC744 \uC790\uC5F0\uC5B4\uB85C"${C.reset}`,
        `     ${C.dim}\u2192 \uC758\uB3C4 \uBD84\uC11D \u2192 auto/plan/team \uC790\uB3D9 \uC120\uD0DD${C.reset}`,
        `     ${C.dim}\uC608: /aing do "\uB85C\uADF8\uC778 \uAE30\uB2A5 \uCD94\uAC00\uD574\uC918"${C.reset}`,
        `     ${C.dim}\uC608: /aing do "src/auth.ts\uC5D0 JWT \uAC80\uC99D \uCD94\uAC00"${C.reset}`,
        '',
        `  ${C.bold}${C.magenta}2. \uBE44\uAC1C\uBC1C\uC790\uB77C\uBA74${C.reset}`,
        `     ${C.cyan}/aing wizard${C.reset}`,
        `     ${C.dim}\u2192 Iron\uC774 \uC9C8\uBB38\uD558\uBA74 \uB2F5\uB9CC \uD558\uBA74 \uB429\uB2C8\uB2E4${C.reset}`,
        '',
        `  ${C.bold}${C.blue}3. \uC0C8 \uD504\uB85C\uC81D\uD2B8 \uC2DC\uC791${C.reset}`,
        `     ${C.cyan}/aing init \u2192 /aing do "\uCCAB \uAE30\uB2A5"${C.reset}`,
        `     ${C.dim}\u2192 \uD504\uB85C\uC81D\uD2B8 \uBB38\uB9E5 \uC218\uC9D1 \uD6C4 \uBC14\uB85C \uAC1C\uBC1C \uC2DC\uC791${C.reset}`,
        '',
        `  ${C.bold}${C.orange}4. \uBE60\uB978 \uC218\uC815${C.reset}`,
        `     ${C.cyan}/aing auto "\uAD6C\uCCB4\uC801 \uC791\uC5C5"${C.reset}`,
        `     ${C.dim}\u2192 \uD30C\uC77C/\uD568\uC218\uBA85 \uD3EC\uD568\uD558\uBA74 Solo \uBAA8\uB4DC\uB85C \uC989\uC2DC \uC2E4\uD589${C.reset}`,
        '',
        `  ${C.bold}${C.purple}5. \uB300\uADDC\uBAA8 \uAE30\uB2A5${C.reset}`,
        `     ${C.cyan}/aing team "\uB300\uADDC\uBAA8 \uC791\uC5C5"${C.reset}`,
        `     ${C.dim}\u2192 plan\u2192exec\u2192verify\u2192fix \uD488\uC9C8 \uB8E8\uD504${C.reset}`,
        '',
        `  ${C.bold}${C.red}6. \uBC84\uADF8 \uC7A1\uAE30${C.reset}`,
        `     ${C.cyan}/aing debug "\uC99D\uC0C1 \uC124\uBA85"${C.reset}`,
        `     ${C.dim}\u2192 \uAC00\uC124\u2192\uD14C\uC2A4\uD2B8\u2192\uACB0\uB860, \uC138\uC158 \uB04A\uACE8\uB3C4 \uC7AC\uAC1C \uAC00\uB2A5${C.reset}`,
        '',
        `  ${C.dim}  Tip: \uBAA8\uB974\uACA0\uC73C\uBA74 /aing do \uC5D0 \uC544\uBB34\uAC70\uB098 \uC368\uBCF4\uC138\uC694.${C.reset}`,
        `  ${C.dim}  aing\uC774 \uC54C\uC544\uC11C \uCD5C\uC801 \uACBD\uB85C\uB97C \uCC3E\uC544\uC90D\uB2C8\uB2E4.${C.reset}`,
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
        `${C.dim}  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${C.reset}`,
        `  ${C.dim}GitHub: ${C.reset}${C.sky}sangwookp9591/ai-ng-kit-claude${C.reset}`,
        `  ${C.dim}Install: ${C.reset}${C.sky}/plugin marketplace add sangwookp9591/ai-ng-kit-claude${C.reset}`,
        '',
    ].join('\n');
}
export { C, AGENTS, INNOVATIONS };
//# sourceMappingURL=display.js.map