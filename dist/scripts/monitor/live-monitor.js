/**
 * aing Live Agent Monitor v1.0.0
 * Watches .aing/state/agent-live.jsonl for real-time agent activity.
 * Run in a separate terminal: node dist/scripts/monitor/live-monitor.js [--dir /path]
 * @module scripts/monitor/live-monitor
 */
import { watch, existsSync, readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const COLORS = {
    jay: '\x1b[34m', // blue
    derek: '\x1b[32m', // green
    klay: '\x1b[33m', // yellow
    iron: '\x1b[36m', // cyan
    milla: '\x1b[31m', // red
    able: '\x1b[35m', // magenta
    ryan: '\x1b[37m', // white
    noa: '\x1b[90m', // gray
    critic: '\x1b[91m', // bright red
    sam: '\x1b[92m', // bright green
    willji: '\x1b[95m', // bright magenta
    rowan: '\x1b[96m', // bright cyan
    jun: '\x1b[93m', // bright yellow
    jerry: '\x1b[94m', // bright blue
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------
function formatEvent(ev) {
    const color = COLORS[ev.agent.toLowerCase()] || '\x1b[37m';
    const time = ev.ts.slice(11, 19);
    const icon = {
        read: '📖', write: '✏️', edit: '🔧', bash: '⚡', glob: '🔍',
        grep: '🔎', test: '🧪', status: '💬', done: '✅', error: '❌',
    }[ev.action] || '▸';
    const agentPad = ev.agent.padEnd(8);
    const targetShort = ev.target.length > 60 ? '...' + ev.target.slice(-57) : ev.target;
    return `${DIM}${time}${RESET} ${color}${BOLD}${agentPad}${RESET} ${icon} ${ev.action.padEnd(6)} ${targetShort}${ev.detail ? ` ${DIM}— ${ev.detail}${RESET}` : ''}`;
}
function printHeader() {
    console.log(`\n${BOLD}━━━ aing live monitor ━━━${RESET}`);
    console.log(`${DIM}Watching agent activity in real-time. Ctrl+C to stop.${RESET}\n`);
}
// ---------------------------------------------------------------------------
// Watcher
// ---------------------------------------------------------------------------
function startWatch(liveFile) {
    let lastSize = 0;
    if (existsSync(liveFile)) {
        lastSize = readFileSync(liveFile).length;
    }
    printHeader();
    // Initial: show last 10 lines if file exists
    if (existsSync(liveFile)) {
        const content = readFileSync(liveFile, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const recent = lines.slice(-10);
        if (recent.length > 0) {
            console.log(`${DIM}... last ${recent.length} events ...${RESET}`);
            for (const line of recent) {
                try {
                    console.log(formatEvent(JSON.parse(line)));
                }
                catch { /* skip malformed */ }
            }
            console.log('');
        }
    }
    // Watch for changes
    const dir = join(liveFile, '..');
    watch(dir, (_eventType, filename) => {
        if (filename !== 'agent-live.jsonl')
            return;
        if (!existsSync(liveFile))
            return;
        const content = readFileSync(liveFile, 'utf-8');
        if (content.length <= lastSize)
            return;
        const newContent = content.slice(lastSize);
        lastSize = content.length;
        const newLines = newContent.trim().split('\n').filter(Boolean);
        for (const line of newLines) {
            try {
                console.log(formatEvent(JSON.parse(line)));
            }
            catch { /* skip malformed */ }
        }
    });
}
// ---------------------------------------------------------------------------
// Public API (for agents to write events)
// ---------------------------------------------------------------------------
/**
 * Write a live event. Called by agent worker prompts via inline node -e.
 */
export function writeLiveEvent(projectDir, event) {
    const dir = join(projectDir, '.aing', 'state');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'agent-live.jsonl');
    const line = JSON.stringify({ ...event, ts: event.ts || new Date().toISOString() }) + '\n';
    appendFileSync(file, line);
}
// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const projectDir = dirIdx >= 0 && args[dirIdx + 1] ? args[dirIdx + 1] : process.cwd();
const liveFile = join(projectDir, '.aing', 'state', 'agent-live.jsonl');
// If --write mode, write an event and exit
if (args[0] === '--write') {
    const event = {
        ts: new Date().toISOString(),
        agent: args[1] || 'unknown',
        action: (args[2] || 'status'),
        target: args[3] || '',
        detail: args[4],
    };
    writeLiveEvent(projectDir, event);
    process.exit(0);
}
// Default: watch mode
mkdirSync(join(projectDir, '.aing', 'state'), { recursive: true });
startWatch(liveFile);
// Keep process alive
setInterval(() => { }, 1000);
// Clean exit
process.on('SIGINT', () => {
    console.log(`\n${DIM}Monitor stopped.${RESET}`);
    process.exit(0);
});
//# sourceMappingURL=live-monitor.js.map