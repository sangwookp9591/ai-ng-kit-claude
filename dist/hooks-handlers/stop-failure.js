/**
 * aing StopFailure Hook v1.3.2
 */
import { readStdinJSON } from '../scripts/core/stdin.js';
import { norchError } from '../scripts/core/norch-bridge.js';
import { readState, writeState } from '../scripts/core/state.js';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const CATS = {
    rate_limit: { p: /rate.?limit|429|too many/i, r: 'Wait 1-2 min and retry.' },
    auth: { p: /auth|401|403|unauthorized/i, r: 'Check API key/token.' },
    server: { p: /500|502|503|504|internal/i, r: 'Server error. Retry shortly.' },
    overload: { p: /overloaded|capacity|busy/i, r: 'Overloaded. Wait a few min.' },
    timeout: { p: /timeout|timed?.?out/i, r: 'Timed out. Split into smaller tasks.' },
    context: { p: /context|token.?limit|too.?long/i, r: 'Context limit. Use /compact.' }
};
const parsed = await readStdinJSON();
try {
    const msg = parsed.error || parsed.message || '';
    const dir = process.env.PROJECT_DIR || process.cwd();
    let cat = 'unknown';
    let rec = 'Unexpected error. Restart session.';
    for (const [k, { p, r }] of Object.entries(CATS)) {
        if (p.test(msg)) {
            cat = k;
            rec = r;
            break;
        }
    }
    norchError('session', 'unknown', `${cat}: ${msg.slice(0, 100)}`);
    const sf = join(dir, '.aing', 'state', 'pdca-status.json');
    const sr = readState(sf);
    if (sr.ok) {
        writeState(join(dir, '.aing', 'state', 'pdca-emergency-backup.json'), {
            backupAt: new Date().toISOString(), reason: cat, state: sr.data
        });
    }
    try {
        const ld = join(dir, '.aing', 'logs');
        mkdirSync(ld, { recursive: true });
        appendFileSync(join(ld, 'errors.jsonl'), JSON.stringify({ ts: new Date().toISOString(), category: cat, message: msg.slice(0, 500), recovery: rec }) + '\n');
    }
    catch (_) { }
    process.stdout.write(JSON.stringify({
        stopReason: `[aing Self-Healing] ${cat} -- ${rec}`
    }));
}
catch (err) {
    process.stderr.write(`[aing:stop-failure] ${err.message}\n`);
    process.stdout.write('{}');
}
//# sourceMappingURL=stop-failure.js.map