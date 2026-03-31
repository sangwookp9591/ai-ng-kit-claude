export interface ImportedCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    expires?: number;
}
/**
 * List installed browsers that have accessible cookie databases.
 */
export declare function listAvailableBrowsers(): string[];
/**
 * Import cookies from a browser's SQLite database.
 * Uses sqlite3 CLI tool (ships with macOS).
 *
 * NOTE: The browser must be closed for the cookie DB to be readable,
 * or we copy it first to avoid locking issues.
 */
export declare function importCookiesFromBrowser(browserName: string, domain?: string): ImportedCookie[];
//# sourceMappingURL=cookie-import-browser.d.ts.map