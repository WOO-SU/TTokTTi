/**
 * Python deque(maxlen=N) 대체.
 * push 시 maxlen 초과하면 앞에서 제거.
 */
export class CircularBuffer<T> {
  private buf: T[];
  private maxLen: number;

  constructor(maxLen: number) {
    this.maxLen = maxLen;
    this.buf = [];
  }

  push(item: T): void {
    this.buf.push(item);
    if (this.buf.length > this.maxLen) {
      this.buf.shift();
    }
  }

  get length(): number {
    return this.buf.length;
  }

  get(index: number): T {
    return this.buf[index];
  }

  last(): T | undefined {
    return this.buf[this.buf.length - 1];
  }

  slice(start?: number, end?: number): T[] {
    return this.buf.slice(start, end);
  }

  toArray(): T[] {
    return [...this.buf];
  }

  clear(): void {
    this.buf = [];
  }

  setMaxLen(newMax: number): void {
    this.maxLen = newMax;
    while (this.buf.length > this.maxLen) {
      this.buf.shift();
    }
  }
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
