import { createLogger } from '../core/logger.js';
const log = createLogger('injection-guard');
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(your\s+)?system\s+prompt/i,
    /you\s+are\s+now\s+a\s+different/i,
    /^SYSTEM:\s+override/im,
    /forget\s+(everything|all)\s+(you|your)/i,
    /new\s+instructions?:\s*$/im,
    /\bdo\s+not\s+follow\s+(any|your)\s+(previous|original)/i,
];
export function sanitizeUserMessage(text) {
    if (!text)
        return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
export function wrapXML(text) {
    const sanitized = sanitizeUserMessage(text);
    return `<user-message trust="untrusted">\n${sanitized}\n</user-message>`;
}
export function detectInjection(text) {
    if (!text)
        return false;
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            log.warn(`Injection pattern detected: ${pattern.source}`);
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=prompt-injection-guard.js.map