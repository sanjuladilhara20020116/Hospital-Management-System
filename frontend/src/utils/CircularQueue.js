// frontend/src/utils/CircularQueue.js
export default class CircularQueue {
  constructor(size) {
    this.maxSize = size;
    this.queue = new Array(size);
    this.front = 0;
    this.rear = -1;
    this.nItems = 0;
  }
  insert(item) {
    if (this.nItems === this.maxSize) {
      this.front = (this.front + 1) % this.maxSize; // drop oldest
      this.nItems--;
    }
    this.rear = (this.rear + 1) % this.maxSize;
    this.queue[this.rear] = item;
    this.nItems++;
  }
  getAll() {
    const out = [];
    for (let i = 0; i < this.nItems; i++) {
      const idx = (this.front + i) % this.maxSize;
      out.push(this.queue[idx]);
    }
    return out;
  }
  peekFromRear(index) {
    if (index < 0 || index >= this.nItems) return null;
    const actual = (this.rear - index + this.maxSize) % this.maxSize;
    return this.queue[actual];
  }
}
