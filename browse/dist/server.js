import http from 'node:http';
import { dispatchCommand } from './dispatch.js';
import { COMMANDS } from './commands.js';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export function startServer(port, token, bm) {
    let idleTimer;
    let isShuttingDown = false;
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            console.log('[browse] Idle timeout reached, shutting down.');
            gracefulShutdown();
        }, IDLE_TIMEOUT_MS);
    }
    async function gracefulShutdown() {
        if (isShuttingDown)
            return;
        isShuttingDown = true;
        clearTimeout(idleTimer);
        console.log('[browse] Shutting down...');
        await bm.shutdown().catch(() => { });
        server.close(() => {
            console.log('[browse] Server closed.');
            process.exit(0);
        });
        // Force exit after 5s if server won't close
        setTimeout(() => process.exit(0), 5_000).unref();
    }
    const server = http.createServer(async (req, res) => {
        resetIdleTimer();
        // CORS headers for local usage
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // Health check — no auth required
        if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', browser: bm.isLaunched() }));
            return;
        }
        // Auth check
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${token}`) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        // Command list
        if (req.method === 'GET' && req.url === '/commands') {
            const cmds = Array.from(COMMANDS.values()).map((c) => ({
                name: c.name,
                category: c.category,
                description: c.description,
                args: c.args,
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(cmds, null, 2));
            return;
        }
        // Command dispatch
        if (req.method === 'POST' && req.url === '/command') {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', async () => {
                try {
                    const { cmd, args: cmdArgs } = JSON.parse(body);
                    if (!cmd) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing "cmd" field' }));
                        return;
                    }
                    const result = await dispatchCommand(cmd, cmdArgs ?? [], bm, () => gracefulShutdown());
                    res.writeHead(result.success ? 200 : 400, {
                        'Content-Type': 'application/json',
                    });
                    res.end(JSON.stringify(result));
                }
                catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        output: '',
                        error: e.message || 'Internal server error',
                    }));
                }
            });
            return;
        }
        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    server.listen(port, '127.0.0.1', () => {
        console.log(`[browse] Server listening on http://127.0.0.1:${port}`);
        resetIdleTimer();
    });
    server.on('error', (err) => {
        console.error('[browse] Server error:', err);
        process.exit(1);
    });
    // Graceful shutdown on signals
    process.on('SIGTERM', () => gracefulShutdown());
    process.on('SIGINT', () => gracefulShutdown());
    return server;
}
//# sourceMappingURL=server.js.map