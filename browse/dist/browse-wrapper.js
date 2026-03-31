/**
 * Browse Wrapper — Programmatic API over the aing-browse daemon.
 *
 * Provides a typed interface with ref system (@e1, @e2, ...),
 * state tracking, and structured Result<T> returns. All communication
 * goes through the daemon's HTTP command endpoint.
 *
 * Zero external deps — uses Node.js built-in http only.
 * @module browse/src/browse-wrapper
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// ---------------------------------------------------------------------------
// BrowseWrapper
// ---------------------------------------------------------------------------
export class BrowseWrapper {
    daemonState = null;
    pageState = {
        url: '',
        title: '',
        lastSnapshotAt: 0,
        lastSnapshotTree: '',
        refs: [],
    };
    stateFile;
    timeout;
    constructor(projectRoot, options) {
        const stateDir = join(projectRoot, '.aing');
        this.stateFile = join(stateDir, 'browse.json');
        this.timeout = options?.timeout ?? 30_000;
    }
    // -------------------------------------------------------------------------
    // Connection
    // -------------------------------------------------------------------------
    /** Connect to existing daemon or fail. Does NOT start a daemon. */
    async connect() {
        const state = this.readDaemonState();
        if (!state) {
            return { ok: false, error: 'Browse daemon not running. Start with: aing-browse status' };
        }
        const alive = await this.healthCheck(state);
        if (!alive) {
            return { ok: false, error: 'Browse daemon state file exists but daemon is not responding.' };
        }
        this.daemonState = state;
        return { ok: true, data: state };
    }
    /** Check if connected to a live daemon */
    isConnected() {
        return this.daemonState !== null;
    }
    /** Get current page state */
    getPageState() {
        return { ...this.pageState };
    }
    // -------------------------------------------------------------------------
    // Navigation
    // -------------------------------------------------------------------------
    async goto(url) {
        const result = await this.send('goto', [url]);
        if (result.ok) {
            this.pageState.url = url;
            const titleMatch = result.data.match(/\u2014\s*(.+)$/);
            if (titleMatch) {
                this.pageState.title = titleMatch[1];
            }
        }
        return result;
    }
    async back() {
        return this.send('back');
    }
    async forward() {
        return this.send('forward');
    }
    async reload() {
        return this.send('reload');
    }
    async waitFor(target) {
        return this.send('wait', [target]);
    }
    // -------------------------------------------------------------------------
    // Snapshot & Ref System
    // -------------------------------------------------------------------------
    /**
     * Take an accessibility snapshot and populate refs (@e1, @e2, ...).
     * Returns the formatted tree with refs assigned.
     */
    async snapshot(flags) {
        const args = buildSnapshotArgs(flags);
        const result = await this.send('snapshot', args);
        if (!result.ok) {
            return result;
        }
        const tree = result.data;
        const refs = parseRefsFromTree(tree);
        this.pageState.lastSnapshotAt = Date.now();
        this.pageState.lastSnapshotTree = tree;
        this.pageState.refs = refs;
        return { ok: true, data: { tree, refs } };
    }
    /**
     * Resolve a ref (@eN) to its role and name from the last snapshot.
     * The daemon itself tracks locators; this gives the caller metadata.
     */
    resolveRef(ref) {
        const normalized = ref.startsWith('@') ? ref : `@${ref}`;
        const entry = this.pageState.refs.find((r) => r.ref === normalized);
        if (!entry) {
            return {
                ok: false,
                error: `Ref ${normalized} not found. ${this.pageState.refs.length} refs available. Run snapshot first.`,
            };
        }
        return { ok: true, data: entry };
    }
    /** List all current refs */
    listRefs() {
        return [...this.pageState.refs];
    }
    // -------------------------------------------------------------------------
    // Interaction
    // -------------------------------------------------------------------------
    async click(target) {
        return this.send('click', [target]);
    }
    async fill(target, value) {
        return this.send('fill', [target, value]);
    }
    async select(target, value) {
        return this.send('select', [target, value]);
    }
    async hover(target) {
        return this.send('hover', [target]);
    }
    async type(text) {
        return this.send('type', [text]);
    }
    async press(key) {
        return this.send('press', [key]);
    }
    async scroll(target) {
        return this.send('scroll', target ? [target] : []);
    }
    // -------------------------------------------------------------------------
    // Reading
    // -------------------------------------------------------------------------
    async text() {
        return this.send('text');
    }
    async url() {
        const result = await this.send('url');
        if (result.ok) {
            this.pageState.url = result.data;
        }
        return result;
    }
    async evaluate(expr) {
        return this.send('js', [expr]);
    }
    async is(state, selector) {
        const result = await this.send('is', [state, selector]);
        if (!result.ok)
            return result;
        return {
            ok: true,
            data: {
                state,
                selector,
                result: result.data.trim() === 'true',
            },
        };
    }
    async console(errorsOnly) {
        const args = errorsOnly ? ['--errors'] : [];
        const result = await this.send('console', args);
        if (!result.ok)
            return result;
        if (result.data === '(no console messages)') {
            return { ok: true, data: [] };
        }
        const entries = result.data.split('\n').filter(Boolean).map((line) => {
            const match = line.match(/^\[(\w+)\]\s+(.+?)(?:\s+\((.+)\))?$/);
            if (match) {
                return { level: match[1], message: match[2], source: match[3] };
            }
            return { level: 'unknown', message: line };
        });
        return { ok: true, data: entries };
    }
    async network() {
        const result = await this.send('network');
        if (!result.ok)
            return result;
        if (result.data === '(no network requests)') {
            return { ok: true, data: [] };
        }
        const entries = result.data.split('\n').filter(Boolean).map((line) => {
            const match = line.match(/^(\w+)\s+(\d+)\s+(.+?)(?:\s+\((\d+)ms\))?$/);
            if (match) {
                return {
                    method: match[1],
                    status: parseInt(match[2], 10),
                    url: match[3],
                    duration: match[4] ? parseInt(match[4], 10) : undefined,
                };
            }
            return { method: 'GET', status: 0, url: line };
        });
        return { ok: true, data: entries };
    }
    async perf() {
        return this.send('perf');
    }
    // -------------------------------------------------------------------------
    // Visual
    // -------------------------------------------------------------------------
    async screenshot(outputPath) {
        const args = outputPath ? [outputPath] : [];
        const result = await this.send('screenshot', args);
        if (!result.ok)
            return result;
        const pathMatch = result.data.match(/Screenshot saved:\s*(.+)/);
        const savedPath = pathMatch ? pathMatch[1] : outputPath ?? '/tmp/browse-screenshot.png';
        return { ok: true, data: savedPath };
    }
    async responsive(prefix) {
        const args = prefix ? [prefix] : [];
        const result = await this.send('responsive', args);
        if (!result.ok)
            return result;
        const paths = result.data
            .split('\n')
            .filter((line) => line.match(/\.png$/i))
            .map((line) => line.trim());
        return { ok: true, data: paths };
    }
    // -------------------------------------------------------------------------
    // Tabs
    // -------------------------------------------------------------------------
    async listTabs() {
        return this.send('tabs');
    }
    async switchTab(id) {
        return this.send('tab', [String(id)]);
    }
    async newTab(url) {
        return this.send('newtab', url ? [url] : []);
    }
    async closeTab(id) {
        return this.send('closetab', id !== undefined ? [String(id)] : []);
    }
    // -------------------------------------------------------------------------
    // Chain Execution
    // -------------------------------------------------------------------------
    /**
     * Execute multiple commands in sequence. Stops on first error.
     */
    async chain(commands) {
        const results = [];
        for (const c of commands) {
            const result = await this.send(c.cmd, c.args);
            results.push({ cmd: c.cmd, result });
            if (!result.ok) {
                return { ok: true, data: results };
            }
        }
        return { ok: true, data: results };
    }
    // -------------------------------------------------------------------------
    // Internal — daemon communication
    // -------------------------------------------------------------------------
    async send(cmd, args = []) {
        if (!this.daemonState) {
            const conn = await this.connect();
            if (!conn.ok)
                return conn;
        }
        try {
            const response = await this.postCommand(this.daemonState, cmd, args);
            if (response.success) {
                return { ok: true, data: response.output };
            }
            return { ok: false, error: response.error ?? 'Command failed' };
        }
        catch (err) {
            this.daemonState = null;
            return { ok: false, error: `Daemon communication error: ${err.message}` };
        }
    }
    postCommand(state, cmd, args) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({ cmd, args });
            const req = http.request({
                hostname: '127.0.0.1',
                port: state.port,
                path: '/command',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    Authorization: `Bearer ${state.token}`,
                },
                timeout: this.timeout,
            }, (res) => {
                let body = '';
                res.on('data', (c) => (body += c.toString()));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        resolve({ success: false, output: '', error: `Invalid response: ${body}` });
                    }
                });
            });
            req.on('error', (e) => reject(e));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Command '${cmd}' timed out after ${this.timeout}ms`));
            });
            req.write(payload);
            req.end();
        });
    }
    healthCheck(state) {
        return new Promise((resolve) => {
            const req = http.get(`http://127.0.0.1:${state.port}/health`, { timeout: 3_000 }, (res) => {
                let body = '';
                res.on('data', (c) => (body += c.toString()));
                res.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        resolve(data.status === 'ok');
                    }
                    catch {
                        resolve(false);
                    }
                });
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }
    readDaemonState() {
        if (!existsSync(this.stateFile))
            return null;
        try {
            const raw = readFileSync(this.stateFile, 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
}
// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------
/** Build CLI-style snapshot flag args from a flags object. */
export function buildSnapshotArgs(flags) {
    if (!flags)
        return [];
    const args = [];
    if (flags.interactive)
        args.push('-i');
    if (flags.compact)
        args.push('-c');
    if (flags.diff)
        args.push('-D');
    if (flags.annotate)
        args.push('-a');
    if (flags.cursorInteractive)
        args.push('-C');
    if (flags.depth !== undefined) {
        args.push('-d', String(flags.depth));
    }
    if (flags.selector) {
        args.push('-s', flags.selector);
    }
    if (flags.outputPath) {
        args.push('-o', flags.outputPath);
    }
    return args;
}
/**
 * Parse @eN refs from a snapshot tree output.
 * Lines look like: `  - button "Submit" @e1` or `  - link "Home" @e3 @c1`
 */
export function parseRefsFromTree(tree) {
    const refs = [];
    const lines = tree.split('\n');
    for (const line of lines) {
        const match = line.match(/-\s+(\w+)\s*(?:"([^"]*)")?\s+(@e\d+)/);
        if (match) {
            refs.push({
                ref: match[3],
                role: match[1],
                name: match[2] ?? '',
            });
        }
    }
    return refs;
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Create a BrowseWrapper connected to the daemon.
 * Convenience factory that auto-connects.
 */
export async function createBrowse(projectRoot, options) {
    const wrapper = new BrowseWrapper(projectRoot, options);
    const conn = await wrapper.connect();
    if (!conn.ok)
        return conn;
    return { ok: true, data: wrapper };
}
//# sourceMappingURL=browse-wrapper.js.map