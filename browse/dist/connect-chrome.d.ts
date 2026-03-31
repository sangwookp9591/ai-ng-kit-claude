interface ChromeInfo {
    execPath: string;
    name: string;
}
/**
 * Find installed Chrome/Chromium executables on macOS.
 */
export declare function findChrome(): ChromeInfo | null;
/**
 * Launch Chrome with remote debugging enabled.
 * Returns the CDP (Chrome DevTools Protocol) endpoint URL.
 *
 * Note: Uses execSync with shell deliberately — needs background process launch (&)
 * and curl for CDP endpoint discovery. All arguments are internal constants, not user input.
 */
export declare function launchChromeWithDebug(port?: number, url?: string): {
    pid: number;
    wsEndpoint: string;
};
/**
 * Bring the Chrome window to the foreground (macOS).
 */
export declare function focusChrome(): boolean;
export {};
//# sourceMappingURL=connect-chrome.d.ts.map