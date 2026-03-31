/**
 * URL Validation for aing Browse
 * Prevents access to dangerous URLs: local files, internal networks, JS execution.
 */
interface ValidationResult {
    valid: boolean;
    reason?: string;
}
export declare function validateUrl(urlStr: string): ValidationResult;
/**
 * Sanitize a URL for safe navigation.
 * Returns the sanitized URL or throws if invalid.
 */
export declare function sanitizeUrl(urlStr: string): string;
export {};
//# sourceMappingURL=url-validation.d.ts.map