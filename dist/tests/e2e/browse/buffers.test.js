import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
describe('CircularBuffer', () => {
    it('should store and retrieve items', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(5);
        buf.push(1);
        buf.push(2);
        buf.push(3);
        assert.deepEqual(buf.getAll(), [1, 2, 3]);
        assert.equal(buf.length, 3);
    });
    it('should handle single item', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(10);
        buf.push('only');
        assert.deepEqual(buf.getAll(), ['only']);
        assert.equal(buf.length, 1);
    });
    it('should fill to exact capacity', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(3);
        buf.push(1);
        buf.push(2);
        buf.push(3);
        assert.equal(buf.length, 3);
        assert.deepEqual(buf.getAll(), [1, 2, 3]);
    });
    it('should handle overflow correctly', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(3);
        buf.push(1);
        buf.push(2);
        buf.push(3);
        buf.push(4); // overwrites 1
        assert.equal(buf.length, 3);
        const items = buf.getAll();
        assert.deepEqual(items, [2, 3, 4]);
    });
    it('should handle multiple overflows', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(3);
        buf.push(1);
        buf.push(2);
        buf.push(3);
        buf.push(4);
        buf.push(5);
        buf.push(6);
        assert.equal(buf.length, 3);
        assert.deepEqual(buf.getAll(), [4, 5, 6]);
    });
    it('should wrap around twice', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(2);
        buf.push(1);
        buf.push(2);
        buf.push(3);
        buf.push(4);
        buf.push(5);
        assert.equal(buf.length, 2);
        assert.deepEqual(buf.getAll(), [4, 5]);
    });
    it('should clear correctly', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(5);
        buf.push('a');
        buf.push('b');
        buf.clear();
        assert.equal(buf.length, 0);
        assert.deepEqual(buf.getAll(), []);
    });
    it('should work after clear and re-push', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(3);
        buf.push(1);
        buf.push(2);
        buf.clear();
        buf.push(10);
        buf.push(20);
        assert.equal(buf.length, 2);
        assert.deepEqual(buf.getAll(), [10, 20]);
    });
    it('should handle empty buffer', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(5);
        assert.deepEqual(buf.getAll(), []);
        assert.equal(buf.length, 0);
    });
    it('should handle capacity of 1', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(1);
        buf.push('a');
        assert.deepEqual(buf.getAll(), ['a']);
        buf.push('b');
        assert.deepEqual(buf.getAll(), ['b']);
        assert.equal(buf.length, 1);
    });
    it('should use default capacity when none provided', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer();
        // Default is 50_000 — push a few items and verify it works
        buf.push(1);
        buf.push(2);
        assert.equal(buf.length, 2);
        assert.deepEqual(buf.getAll(), [1, 2]);
    });
    it('should handle large buffers with overflow', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(10_000);
        for (let i = 0; i < 15_000; i++) {
            buf.push(i);
        }
        assert.equal(buf.length, 10_000);
        const items = buf.getAll();
        assert.equal(items[0], 5_000);
        assert.equal(items[items.length - 1], 14_999);
        assert.equal(items.length, 10_000);
    });
    it('should preserve insertion order within capacity', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(5);
        buf.push('first');
        buf.push('second');
        buf.push('third');
        const items = buf.getAll();
        assert.equal(items[0], 'first');
        assert.equal(items[1], 'second');
        assert.equal(items[2], 'third');
    });
    it('should work with complex object types', async () => {
        const { CircularBuffer } = await import('../../../browse/dist/buffers.js');
        const buf = new CircularBuffer(3);
        buf.push({ id: 1, msg: 'hello' });
        buf.push({ id: 2, msg: 'world' });
        const items = buf.getAll();
        assert.equal(items.length, 2);
        assert.equal(items[0].id, 1);
        assert.equal(items[1].msg, 'world');
    });
});
//# sourceMappingURL=buffers.test.js.map