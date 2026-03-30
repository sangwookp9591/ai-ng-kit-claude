import { chromium, Browser, BrowserContext, Page, Locator, Frame } from 'playwright';
import { CircularBuffer, LogEntry, NetworkEntry, DialogEntry } from './buffers.js';
import { buildSnapshot } from './snapshot.js';
import type { SnapshotOptions } from './types.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<number, Page> = new Map();
  private activeTabId: number = 0;
  private nextTabId: number = 1;
  private refMap: Map<string, { locator: Locator; role: string; name: string }> = new Map();
  private cRefMap: Map<string, { locator: Locator; role: string; name: string }> = new Map();
  private previousSnapshot: string = '';
  private consoleBuffer: CircularBuffer<LogEntry>;
  private networkBuffer: CircularBuffer<NetworkEntry>;
  private dialogBuffer: CircularBuffer<DialogEntry>;
  private customHeaders: Record<string, string> = {};
  private dialogOverride: { action: 'accept' | 'dismiss'; text?: string } | null = null;
  private currentFrame: Frame | null = null;
  private _userAgent: string = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  constructor() {
    this.consoleBuffer = new CircularBuffer<LogEntry>(10_000);
    this.networkBuffer = new CircularBuffer<NetworkEntry>(10_000);
    this.dialogBuffer = new CircularBuffer<DialogEntry>(1_000);
  }

  async launch(headless: boolean = true): Promise<void> {
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

  private _attachPageListeners(page: Page): void {
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
    const requestTimings = new Map<string, number>();
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
        } else {
          await dialog.accept(override.text);
        }
      } else {
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

  async shutdown(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    this.browser = null;
    this.context = null;
    this.pages.clear();
  }

  getActivePage(): Page {
    const page = this.pages.get(this.activeTabId);
    if (!page) {
      throw new Error(`No active page (tab ${this.activeTabId})`);
    }
    return page;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  async newTab(url?: string): Promise<number> {
    if (!this.context) throw new Error('Browser not launched');
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

  async switchTab(id: number): Promise<void> {
    if (!this.pages.has(id)) {
      throw new Error(`Tab ${id} not found. Available: ${[...this.pages.keys()].join(', ')}`);
    }
    this.activeTabId = id;
    const page = this.pages.get(id)!;
    await page.bringToFront();
  }

  async closeTab(id?: number): Promise<void> {
    const tabId = id ?? this.activeTabId;
    const page = this.pages.get(tabId);
    if (!page) throw new Error(`Tab ${tabId} not found`);
    await page.close();
    this.pages.delete(tabId);

    // Switch to another tab if we closed the active one
    if (tabId === this.activeTabId) {
      const remaining = [...this.pages.keys()];
      if (remaining.length > 0) {
        this.activeTabId = remaining[remaining.length - 1];
      } else if (this.context) {
        // No tabs left — open a new blank one
        const newTabId = await this.newTab();
        this.activeTabId = newTabId;
      }
    }
  }

  listTabs(): Array<{ id: number; url: string; title: string }> {
    const result: Array<{ id: number; url: string; title: string }> = [];
    for (const [id, page] of this.pages) {
      result.push({
        id,
        url: page.url(),
        title: '', // title() is async, we store sync snapshot
      });
    }
    return result;
  }

  async listTabsAsync(): Promise<Array<{ id: number; url: string; title: string; active: boolean }>> {
    const result: Array<{ id: number; url: string; title: string; active: boolean }> = [];
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

  async buildRefs(options: SnapshotOptions): Promise<string> {
    const page = this.getActivePage();
    const result = await buildSnapshot(page, options, this.previousSnapshot);
    this.refMap = result.refs;
    if (result.cRefs) {
      this.cRefMap = result.cRefs;
    }
    this.previousSnapshot = result.rawTree;
    return result.tree;
  }

  async resolveRef(ref: string): Promise<Locator> {
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

  clearRefs(): void {
    this.refMap.clear();
    this.cRefMap.clear();
  }

  // --- Buffers ---

  getConsoleEntries(errorsOnly: boolean = false): LogEntry[] {
    const all = this.consoleBuffer.getAll();
    if (errorsOnly) {
      return all.filter((e) => e.level === 'error' || e.level === 'warning');
    }
    return all;
  }

  clearConsole(): void {
    this.consoleBuffer.clear();
  }

  getNetworkEntries(): NetworkEntry[] {
    return this.networkBuffer.getAll();
  }

  clearNetwork(): void {
    this.networkBuffer.clear();
  }

  getDialogEntries(): DialogEntry[] {
    return this.dialogBuffer.getAll();
  }

  // --- Custom Headers ---

  async setCustomHeader(name: string, value: string): Promise<void> {
    this.customHeaders[name] = value;
    if (this.context) {
      await this.context.setExtraHTTPHeaders(this.customHeaders);
    }
  }

  // --- Dialog Override ---

  setDialogBehavior(action: 'accept' | 'dismiss', text?: string): void {
    this.dialogOverride = { action, text };
  }

  clearDialogs(): void {
    this.dialogBuffer.clear();
  }

  // --- User Agent ---

  async setUserAgent(ua: string): Promise<void> {
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

  async importCookies(cookies: Array<{ name: string; value: string; domain?: string; path?: string; url?: string; [key: string]: any }>): Promise<void> {
    if (!this.context) throw new Error('Browser not launched');
    const page = this.getActivePage();
    const currentUrl = page.url();
    const normalized = cookies.map((c) => ({
      ...c,
      url: c.url || (c.domain ? undefined : currentUrl),
    }));
    await this.context.addCookies(normalized as any);
  }

  // --- State Save/Load ---

  private get stateDir(): string {
    const dir = join(homedir(), '.aing', 'browse-states');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async saveState(name: string): Promise<void> {
    if (!this.context) throw new Error('Browser not launched');
    const cookies = await this.context.cookies();
    const tabs: Array<{ url: string; active: boolean }> = [];
    for (const [id, page] of this.pages) {
      tabs.push({ url: page.url(), active: id === this.activeTabId });
    }
    const state = { cookies, tabs, savedAt: new Date().toISOString() };
    const filePath = join(this.stateDir, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  async loadState(name: string): Promise<void> {
    if (!this.context) throw new Error('Browser not launched');
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
      const activeTab = state.tabs.find((t: any) => t.active) || state.tabs[0];
      if (activeTab) {
        const page = this.getActivePage();
        await page.goto(activeTab.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      }
    }
  }

  // --- Frame Navigation ---

  async switchToFrame(target: string): Promise<Frame> {
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
    } else {
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

  async switchToFrameByName(name: string): Promise<Frame> {
    const page = this.getActivePage();
    const frame = page.frame({ name });
    if (!frame) {
      throw new Error(`Frame not found with name: ${name}`);
    }
    this.currentFrame = frame;
    return frame;
  }

  async switchToFrameByUrl(pattern: string): Promise<Frame> {
    const page = this.getActivePage();
    const frame = page.frame({ url: new RegExp(pattern) });
    if (!frame) {
      throw new Error(`Frame not found matching URL pattern: ${pattern}`);
    }
    this.currentFrame = frame;
    return frame;
  }

  switchToMainFrame(): void {
    this.currentFrame = null;
  }

  getCurrentFrame(): Frame | null {
    return this.currentFrame;
  }

  isLaunched(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}
