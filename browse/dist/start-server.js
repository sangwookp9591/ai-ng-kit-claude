#!/usr/bin/env node
/**
 * Server entry point — spawned by CLI as a detached background process.
 * Usage: node start-server.js <port> <token> <headless|headed>
 */
import { BrowserManager } from './browser-manager.js';
import { startServer } from './server.js';
async function main() {
    const port = parseInt(process.argv[2], 10);
    const token = process.argv[3];
    const mode = process.argv[4] ?? 'headless';
    if (!port || !token) {
        console.error('Usage: start-server <port> <token> [headless|headed]');
        process.exit(1);
    }
    const headless = mode !== 'headed';
    const bm = new BrowserManager();
    try {
        await bm.launch(headless);
        console.log(`[browse] Browser launched (${mode})`);
        startServer(port, token, bm);
    }
    catch (e) {
        console.error(`[browse] Failed to start: ${e.message}`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=start-server.js.map