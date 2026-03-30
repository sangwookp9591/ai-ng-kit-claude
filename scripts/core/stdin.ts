/**
 * aing stdin utility — timeout-protected stdin reading.
 * Pattern from OMC (issue #459): prevents indefinite hang on Linux/Windows.
 * @module scripts/core/stdin
 */

/**
 * Read all stdin with timeout to prevent hang.
 */
export async function readStdinJSON(timeoutMs: number = 3000): Promise<Record<string, unknown>> {
  const raw = await readStdinRaw(timeoutMs);
  if (!raw || !raw.trim()) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch (_) { return {}; }
}

/**
 * Read raw stdin with timeout.
 */
export function readStdinRaw(timeoutMs: number = 3000): Promise<string> {
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.stdin.removeAllListeners();
        try { process.stdin.destroy(); } catch (_) {}
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }, timeoutMs);

    process.stdin.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    process.stdin.on('end', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    });

    process.stdin.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve('');
      }
    });

    if (process.stdin.readableEnded) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }
  });
}
