import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('URL Validation', () => {
  it('should allow standard HTTPS URLs', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    assert.ok(validateUrl('https://example.com').valid);
    assert.ok(validateUrl('https://example.com/path?q=1').valid);
    assert.ok(validateUrl('https://sub.domain.example.com').valid);
  });

  it('should allow standard HTTP URLs', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    assert.ok(validateUrl('http://example.com').valid);
    assert.ok(validateUrl('http://example.com:8080/path').valid);
  });

  it('should allow localhost for dev', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    assert.ok(validateUrl('http://localhost:3000').valid);
    assert.ok(validateUrl('http://localhost').valid);
  });

  it('should allow 127.0.0.1 for dev', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    assert.ok(validateUrl('http://127.0.0.1:8080').valid);
    assert.ok(validateUrl('http://127.0.0.1').valid);
  });

  it('should allow private IP ranges for dev testing', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    assert.ok(validateUrl('http://192.168.1.1').valid);
    assert.ok(validateUrl('http://10.0.0.1:3000').valid);
    assert.ok(validateUrl('http://172.16.0.1').valid);
  });

  it('should block javascript: protocol', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    const result1 = validateUrl('javascript:alert(1)');
    assert.ok(!result1.valid);
    assert.ok(result1.reason?.includes('Blocked protocol'));

    const result2 = validateUrl('JavaScript:void(0)');
    assert.ok(!result2.valid);
  });

  it('should block data: protocol', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    const result = validateUrl('data:text/html,<h1>test</h1>');
    assert.ok(!result.valid);
    assert.ok(result.reason?.includes('Blocked protocol'));
  });

  it('should block vbscript: protocol', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    const result = validateUrl('vbscript:msgbox');
    assert.ok(!result.valid);
  });

  it('should block blob: protocol', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    const result = validateUrl('blob:http://example.com/uuid');
    assert.ok(!result.valid);
  });

  it('should reject empty input', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    const result1 = validateUrl('');
    assert.ok(!result1.valid);
    assert.equal(result1.reason, 'Empty URL');

    const result2 = validateUrl('  ');
    assert.ok(!result2.valid);
    assert.equal(result2.reason, 'Empty URL');
  });

  it('should auto-add https when protocol is missing during validation', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    // URLs without protocol should still validate (auto-adds https://)
    assert.ok(validateUrl('example.com').valid);
    assert.ok(validateUrl('example.com/path').valid);
  });

  it('should allow file:// protocol', async () => {
    const { validateUrl } = await import('../../../browse/dist/url-validation.js');
    assert.ok(validateUrl('file:///tmp/test.html').valid);
  });
});

describe('URL Sanitization', () => {
  it('should add https:// to bare domains', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.equal(sanitizeUrl('example.com'), 'https://example.com');
  });

  it('should preserve existing https://', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.equal(sanitizeUrl('https://example.com'), 'https://example.com');
  });

  it('should preserve existing http://', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.equal(sanitizeUrl('http://example.com'), 'http://example.com');
  });

  it('should preserve file:// protocol', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.equal(sanitizeUrl('file:///tmp/test.html'), 'file:///tmp/test.html');
  });

  it('should throw on javascript: URLs', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.throws(() => sanitizeUrl('javascript:alert(1)'), /URL validation failed/);
  });

  it('should throw on data: URLs', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.throws(() => sanitizeUrl('data:text/html,<h1>hi</h1>'), /URL validation failed/);
  });

  it('should throw on empty URLs', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.throws(() => sanitizeUrl(''), /URL validation failed/);
  });

  it('should throw on whitespace-only URLs', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.throws(() => sanitizeUrl('   '), /URL validation failed/);
  });

  it('should handle URLs with paths and query params', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.equal(
      sanitizeUrl('https://example.com/path?key=value&other=1'),
      'https://example.com/path?key=value&other=1',
    );
  });

  it('should handle localhost URLs', async () => {
    const { sanitizeUrl } = await import('../../../browse/dist/url-validation.js');
    assert.equal(sanitizeUrl('http://localhost:3000'), 'http://localhost:3000');
  });
});
