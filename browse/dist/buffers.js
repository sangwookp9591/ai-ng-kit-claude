export class CircularBuffer {
    capacity;
    buffer;
    head = 0;
    size = 0;
    constructor(capacity = 50_000) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }
    push(item) {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        }
    }
    getAll() {
        if (this.size === 0)
            return [];
        if (this.size < this.capacity) {
            return this.buffer.slice(0, this.size);
        }
        // Buffer is full — head points to the oldest entry
        return [
            ...this.buffer.slice(this.head),
            ...this.buffer.slice(0, this.head),
        ];
    }
    clear() {
        this.head = 0;
        this.size = 0;
        this.buffer = new Array(this.capacity);
    }
    get length() {
        return this.size;
    }
}
//# sourceMappingURL=buffers.js.map