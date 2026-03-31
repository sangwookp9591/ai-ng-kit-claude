/**
 * Unit tests for scripts/core/state.ts
 * Covers: readState, writeState, deleteState, readStateOrDefault, updateState
 *
 * Note: The compiled state module includes an advisory file-lock layer and a
 * read-cache with 5s TTL. Tests use unique file paths to avoid cache collisions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock node:fs — include statSync required by the lock layer
vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    statSync: vi.fn(),
}));
vi.mock('node:crypto', () => ({
    randomBytes: vi.fn(() => ({ toString: () => 'abc123def456' })),
}));
import { readState, writeState, deleteState, readStateOrDefault, updateState, } from '../../../scripts/core/state.js';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync, } from 'node:fs';
const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockRenameSync = vi.mocked(renameSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockUnlinkSync = vi.mocked(unlinkSync);
/** Counter to generate unique paths per test, avoiding cache collisions. */
let pathCounter = 0;
function uniquePath(prefix = '/tmp/state-test') {
    return `${prefix}-${++pathCounter}-${Date.now()}.json`;
}
/**
 * Configure mocks so that lock acquisition succeeds.
 * Lock files (.lock) are treated as non-existing so the wx-flag write succeeds.
 */
function setupLockSuccess(dataExistsFn) {
    mockExistsSync.mockImplementation((p) => {
        const path = String(p);
        if (path.endsWith('.lock'))
            return false;
        if (dataExistsFn)
            return dataExistsFn(path);
        return false;
    });
}
beforeEach(() => {
    vi.resetAllMocks();
});
// ---------------------------------------------------------------------------
// readState
// ---------------------------------------------------------------------------
describe('readState', () => {
    it('returns ok:true with parsed data when file exists', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{"count":42}');
        const result = readState(fp);
        expect(result).toEqual({ ok: true, data: { count: 42 } });
    });
    it('returns ok:false when file does not exist', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(false);
        const result = readState(fp);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('File not found');
        }
    });
    it('returns ok:false on corrupted JSON', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{not valid json');
        const result = readState(fp);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Failed to read');
        }
    });
    it('returns ok:false when readFileSync throws', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockImplementation(() => { throw new Error('EACCES'); });
        const result = readState(fp);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('EACCES');
        }
    });
    it('handles empty JSON object', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{}');
        const result = readState(fp);
        expect(result).toEqual({ ok: true, data: {} });
    });
    it('handles arrays in JSON', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('[1,2,3]');
        const result = readState(fp);
        expect(result).toEqual({ ok: true, data: [1, 2, 3] });
    });
});
// ---------------------------------------------------------------------------
// writeState
// ---------------------------------------------------------------------------
describe('writeState', () => {
    it('writes atomically via temp file + rename', () => {
        const fp = uniquePath();
        setupLockSuccess();
        const result = writeState(fp, { hello: 'world' });
        expect(result).toEqual({ ok: true });
        expect(mockMkdirSync).toHaveBeenCalled();
        const writeCalls = mockWriteFileSync.mock.calls;
        const dataWrite = writeCalls.find(c => String(c[0]).includes('.tmp'));
        expect(dataWrite).toBeDefined();
        expect(mockRenameSync).toHaveBeenCalled();
    });
    it('returns ok:false when data write throws', () => {
        const fp = uniquePath();
        setupLockSuccess();
        mockWriteFileSync.mockImplementation((...args) => {
            const path = String(args[0]);
            if (path.endsWith('.lock'))
                return undefined;
            if (path.endsWith('.tmp'))
                throw new Error('ENOSPC');
            return undefined;
        });
        const result = writeState(fp, { data: true });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Failed to write');
        }
    });
    it('handles rename failure gracefully', () => {
        const fp = uniquePath();
        setupLockSuccess();
        mockWriteFileSync.mockImplementation(() => undefined);
        mockRenameSync.mockImplementation(() => { throw new Error('EXDEV'); });
        const result = writeState(fp, {});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Failed to write');
        }
    });
    it('creates parent directories recursively', () => {
        const fp = '/deep/nested/dir/file-' + Date.now() + '.json';
        setupLockSuccess();
        writeState(fp, {});
        expect(mockMkdirSync).toHaveBeenCalledWith('/deep/nested/dir', { recursive: true });
    });
    it('returns ok:false when lock cannot be acquired', () => {
        const fp = uniquePath();
        // Lock file always exists and is not stale (mock statSync to return recent mtime)
        mockExistsSync.mockReturnValue(true);
        const result = writeState(fp, {});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('lock');
        }
    });
});
// ---------------------------------------------------------------------------
// deleteState
// ---------------------------------------------------------------------------
describe('deleteState', () => {
    it('deletes file when it exists', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        const result = deleteState(fp);
        expect(result).toEqual({ ok: true });
        expect(mockUnlinkSync).toHaveBeenCalledWith(fp);
    });
    it('returns ok:true when file does not exist (no-op)', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(false);
        const result = deleteState(fp);
        expect(result).toEqual({ ok: true });
        expect(mockUnlinkSync).not.toHaveBeenCalled();
    });
    it('returns ok:false when unlink throws', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        mockUnlinkSync.mockImplementation(() => { throw new Error('EPERM'); });
        const result = deleteState(fp);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('EPERM');
        }
    });
});
// ---------------------------------------------------------------------------
// readStateOrDefault
// ---------------------------------------------------------------------------
describe('readStateOrDefault', () => {
    it('returns parsed data when file exists', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{"x":1}');
        const result = readStateOrDefault(fp, { x: 0 });
        expect(result).toEqual({ x: 1 });
    });
    it('returns default value when file is missing', () => {
        const fp = uniquePath();
        mockExistsSync.mockReturnValue(false);
        const result = readStateOrDefault(fp, { x: 0 });
        expect(result).toEqual({ x: 0 });
    });
});
// ---------------------------------------------------------------------------
// updateState
// ---------------------------------------------------------------------------
describe('updateState', () => {
    it('reads, mutates, and writes back', () => {
        const fp = uniquePath();
        setupLockSuccess(p => p === fp);
        mockReadFileSync.mockReturnValue('{"count":5}');
        const result = updateState(fp, {}, (data) => {
            const d = data;
            d.count += 1;
            return d;
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data).toEqual({ count: 6 });
        }
    });
    it('uses default value when file does not exist', () => {
        const fp = uniquePath();
        setupLockSuccess();
        const result = updateState(fp, { items: [] }, (data) => {
            const d = data;
            d.items.push('first');
            return d;
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data).toEqual({ items: ['first'] });
        }
    });
    it('uses function default value when provided', () => {
        const fp = uniquePath();
        setupLockSuccess();
        const result = updateState(fp, () => ({ val: 100 }), (data) => {
            return data;
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data).toEqual({ val: 100 });
        }
    });
});
//# sourceMappingURL=state.test.js.map