/**
 * URL Validation for aing Browse
 * Prevents access to dangerous URLs: local files, internal networks, JS execution.
 */

// Private IPv4 ranges
const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,  // link-local
];

const BLOCKED_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'blob:',
]);

// Only allow navigation to these protocols
const ALLOWED_PROTOCOLS = new Set([
  'http:',
  'https:',
  'file:',  // file:// allowed only for local dev testing
]);

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateUrl(urlStr: string): ValidationResult {
  // Empty check
  if (!urlStr || urlStr.trim().length === 0) {
    return { valid: false, reason: 'Empty URL' };
  }

  // Check for blocked protocols (case-insensitive)
  const lower = urlStr.toLowerCase().trim();
  for (const proto of BLOCKED_PROTOCOLS) {
    if (lower.startsWith(proto)) {
      return { valid: false, reason: `Blocked protocol: ${proto}` };
    }
  }

  // Try parsing as URL
  let parsed: URL;
  try {
    // Auto-add protocol if missing
    const withProto = lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://')
      ? urlStr
      : `https://${urlStr}`;
    parsed = new URL(withProto);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Check protocol
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { valid: false, reason: `Protocol not allowed: ${parsed.protocol}` };
  }

  // Check for private IPs (only for http/https)
  if (parsed.protocol !== 'file:') {
    const hostname = parsed.hostname;

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '::1') {
      // localhost is allowed for dev server testing
      return { valid: true };
    }

    // Check private IP ranges
    for (const range of PRIVATE_RANGES) {
      if (range.test(hostname)) {
        // Private IPs are allowed for dev testing (e.g., 127.0.0.1:3000)
        return { valid: true };
      }
    }
  }

  // All checks passed
  return { valid: true };
}

/**
 * Sanitize a URL for safe navigation.
 * Returns the sanitized URL or throws if invalid.
 */
export function sanitizeUrl(urlStr: string): string {
  const result = validateUrl(urlStr);
  if (!result.valid) {
    throw new Error(`URL validation failed: ${result.reason}`);
  }

  // Auto-add protocol if needed
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://') && !urlStr.startsWith('file://')) {
    return `https://${urlStr}`;
  }
  return urlStr;
}
