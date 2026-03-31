import { chromium } from 'playwright';
import { CircularBuffer } from './buffers.js';
import { buildSnapshot } from './snapshot.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
export class BrowserManager {
    browser = null;
    context = null;
    pages = new Map();
    activeTabId = 0;
    nextTabId = 1;
    refMap = new Map();
    cRefMap = new Map();
    previousSnapshot = '';
    consoleBuffer;
    networkBuffer;
    dialogBuffer;
    customHeaders = {};
    dialogOverride = null;
    currentFrame = null;
    _userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    constructor() {
        this.consoleBuffer = new CircularBuffer(10_000);
        this.networkBuffer = new CircularBuffer(10_000);
        this.dialogBuffer = new CircularBuffer(1_000);
    }
    async launch(headless = true) {
        this.browser = await chromium.launch({
            headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ],
        });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: this._userAgent,
        });
        // Create initial page
        const page = await this.context.newPage();
        const tabId = this.nextTabId++;
        this.pages.set(tabId, page);
        this.activeTabId = tabId;
        this._attachPageListeners(page);
        // Auto-accept dialogs
        this.context.on('page', (newPage) => {
            // Track pages opened by target=_blank etc.
            const newTabId = this.nextTabId++;
            this.pages.set(newTabId, newPage);
            this._attachPageListeners(newPage);
        });
        this.browser.on('disconnected', () => {
            this.browser = null;
            this.context = null;
            this.pages.clear();
        });
    }
    _attachPageListeners(page) {
        // Console capture
        page.on('console', (msg) => {
            this.consoleBuffer.push({
                level: msg.type(),
                message: msg.text(),
                timestamp: Date.now(),
                source: msg.location()?.url,
            });
        });
        // Network capture
        const requestTimings = new Map();
        page.on('request', (req) => {
            requestTimings.set(req.url() + req.method(), Date.now());
        });
        page.on('response', (resp) => {
            const key = resp.url() + resp.request().method();
            const startTime = requestTimings.get(key);
            requestTimings.delete(key);
            this.networkBuffer.push({
                method: resp.request().method(),
                url: resp.url(),
                status: resp.status(),
                timestamp: Date.now(),
                duration: startTime ? Date.now() - startTime : undefined,
            });
        });
        // Dialog handling — configurable via setDialogBehavior
        page.on('dialog', async (dialog) => {
            this.dialogBuffer.push({
                type: dialog.type(),
                message: dialog.message(),
                timestamp: Date.now(),
                defaultValue: dialog.defaultValue(),
            });
            if (this.dialogOverride) {
                const override = this.dialogOverride;
                this.dialogOverride = null; // one-shot
                if (override.action === 'dismiss') {
                    await dialog.dismiss();
                }
                else {
                    await dialog.accept(override.text);
                }
            }
            else {
                await dialog.accept();
            }
        });
        // Clear refs on navigation
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) {
                this.clearRefs();
            }
        });
    }
    async shutdown() {
        if (this.context) {
            await this.context.close().catch(() => { });
        }
        if (this.browser) {
            await this.browser.close().catch(() => { });
        }
        this.browser = null;
        this.context = null;
        this.pages.clear();
    }
    getActivePage() {
        const page = this.pages.get(this.activeTabId);
        if (!page) {
            throw new Error(`No active page (tab ${this.activeTabId})`);
        }
        return page;
    }
    getContext() {
        return this.context;
    }
    async newTab(url) {
        if (!this.context)
            throw new Error('Browser not launched');
        const page = await this.context.newPage();
        const tabId = this.nextTabId++;
        this.pages.set(tabId, page);
        this._attachPageListeners(page);
        this.activeTabId = tabId;
        if (url) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        }
        return tabId;
    }
    async switchTab(id) {
        if (!this.pages.has(id)) {
            throw new Error(`Tab ${id} not found. Available: ${[...this.pages.keys()].join(', ')}`);
        }
        this.activeTabId = id;
        const page = this.pages.get(id);
        await page.bringToFront();
    }
    async closeTab(id) {
        const tabId = id ?? this.activeTabId;
        const page = this.pages.get(tabId);
        if (!page)
            throw new Error(`Tab ${tabId} not found`);
        await page.close();
        this.pages.delete(tabId);
        // Switch to another tab if we closed the active one
        if (tabId === this.activeTabId) {
            const remaining = [...this.pages.keys()];
            if (remaining.length > 0) {
                this.activeTabId = remaining[remaining.length - 1];
            }
            else if (this.context) {
                // No tabs left — open a new blank one
                const newTabId = await this.newTab();
                this.activeTabId = newTabId;
            }
        }
    }
    listTabs() {
        const result = [];
        for (const [id, page] of this.pages) {
            result.push({
                id,
                url: page.url(),
                title: '', // title() is async, we store sync snapshot
            });
        }
        return result;
    }
    async listTabsAsync() {
        const result = [];
        for (const [id, page] of this.pages) {
            result.push({
                id,
                url: page.url(),
                title: await page.title().catch(() => ''),
                active: id === this.activeTabId,
            });
        }
        return result;
    }
    // --- Ref System ---
    async buildRefs(options) {
        const page = this.getActivePage();
        const result = await buildSnapshot(page, options, this.previousSnapshot);
        this.refMap = result.refs;
        if (result.cRefs) {
            this.cRefMap = result.cRefs;
        }
        this.previousSnapshot = result.rawTree;
        return result.tree;
    }
    async resolveRef(ref) {
        const normalized = ref.startsWith('@') ? ref : `@${ref}`;
        const isC = normalized.startsWith('@c');
        const map = isC ? this.cRefMap : this.refMap;
        const entry = map.get(normalized);
        if (!entry) {
            throw new Error(`Ref ${normalized} not found. Run 'snapshot' first.`);
        }
        // Staleness check — verify element still exists (~5ms)
        const count = await entry.locator.count().catch(() => 0);
        if (count === 0) {
            map.delete(normalized);
            throw new Error(`Ref ${normalized} is stale — element no longer exists. Re-run 'snapshot'.`);
        }
        return entry.locator;
    }
    clearRefs() {
        this.refMap.clear();
        this.cRefMap.clear();
    }
    // --- Buffers ---
    getConsoleEntries(errorsOnly = false) {
        const all = this.consoleBuffer.getAll();
        if (errorsOnly) {
            return all.filter((e) => e.level === 'error' || e.level === 'warning');
        }
        return all;
    }
    clearConsole() {
        this.consoleBuffer.clear();
    }
    getNetworkEntries() {
        return this.networkBuffer.getAll();
    }
    clearNetwork() {
        this.networkBuffer.clear();
    }
    getDialogEntries() {
        return this.dialogBuffer.getAll();
    }
    // --- Custom Headers ---
    async setCustomHeader(name, value) {
        this.customHeaders[name] = value;
        if (this.context) {
            await this.context.setExtraHTTPHeaders(this.customHeaders);
        }
    }
    // --- Dialog Override ---
    setDialogBehavior(action, text) {
        this.dialogOverride = { action, text };
    }
    clearDialogs() {
        this.dialogBuffer.clear();
    }
    // --- User Agent ---
    async setUserAgent(ua) {
        this._userAgent = ua;
        // Playwright doesn't allow changing UA on existing context directly.
        // We store it and apply via extra headers as a best-effort approach.
        if (this.context) {
            await this.context.setExtraHTTPHeaders({
                ...this.customHeaders,
                'User-Agent': ua,
            });
        }
    }
    // --- Cookie Import ---
    async importCookies(cookies) {
        if (!this.context)
            throw new Error('Browser not launched');
        const page = this.getActivePage();
        const currentUrl = page.url();
        const normalized = cookies.map((c) => ({
            ...c,
            url: c.url || (c.domain ? undefined : currentUrl),
        }));
        await this.context.addCookies(normalized);
    }
    // --- State Save/Load ---
    get stateDir() {
        const dir = join(homedir(), '.aing', 'browse-states');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    async saveState(name) {
        if (!this.context)
            throw new Error('Browser not launched');
        const cookies = await this.context.cookies();
        const tabs = [];
        for (const [id, page] of this.pages) {
            tabs.push({ url: page.url(), active: id === this.activeTabId });
        }
        const state = { cookies, tabs, savedAt: new Date().toISOString() };
        const filePath = join(this.stateDir, `${name}.json`);
        writeFileSync(filePath, JSON.stringify(state, null, 2));
    }
    async loadState(name) {
        if (!this.context)
            throw new Error('Browser not launched');
        const filePath = join(this.stateDir, `${name}.json`);
        if (!existsSync(filePath)) {
            throw new Error(`State not found: ${name}`);
        }
        const state = JSON.parse(readFileSync(filePath, 'utf-8'));
        // Restore cookies
        if (state.cookies && Array.isArray(state.cookies)) {
            await this.context.addCookies(state.cookies);
        }
        // Restore tabs — navigate active page to the first active URL
        if (state.tabs && Array.isArray(state.tabs)) {
            const activeTab = state.tabs.find((t) => t.active) || state.tabs[0];
            if (activeTab) {
                const page = this.getActivePage();
                await page.goto(activeTab.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
            }
        }
    }
    // --- Frame Navigation ---
    async switchToFrame(target) {
        const page = this.getActivePage();
        if (target.startsWith('--name')) {
            // --name is handled by caller splitting args
            throw new Error('Use switchToFrameByName instead');
        }
        if (target.startsWith('--url')) {
            throw new Error('Use switchToFrameByUrl instead');
        }
        // Selector or @ref
        let frameElement;
        if (target.startsWith('@')) {
            const locator = await this.resolveRef(target);
            frameElement = await locator.first().elementHandle();
        }
        else {
            frameElement = await page.$(target);
        }
        if (!frameElement) {
            throw new Error(`Frame element not found: ${target}`);
        }
        const frame = await frameElement.contentFrame();
        if (!frame) {
            throw new Error(`Element is not an iframe: ${target}`);
        }
        this.currentFrame = frame;
        return frame;
    }
    async switchToFrameByName(name) {
        const page = this.getActivePage();
        const frame = page.frame({ name });
        if (!frame) {
            throw new Error(`Frame not found with name: ${name}`);
        }
        this.currentFrame = frame;
        return frame;
    }
    async switchToFrameByUrl(pattern) {
        const page = this.getActivePage();
        const frame = page.frame({ url: new RegExp(pattern) });
        if (!frame) {
            throw new Error(`Frame not found matching URL pattern: ${pattern}`);
        }
        this.currentFrame = frame;
        return frame;
    }
    switchToMainFrame() {
        this.currentFrame = null;
    }
    getCurrentFrame() {
        return this.currentFrame;
    }
    isLaunched() {
        return this.browser !== null && this.browser.isConnected();
    }
}
//# sourceMappingURL=browser-manager.js.map