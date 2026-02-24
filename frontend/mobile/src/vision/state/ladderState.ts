import type { BBox } from '../types';
import { CircularBuffer, median } from '../utils';

export class LadderState {
  id: number;
  lastSeen: number;

  bboxHist: CircularBuffer<BBox>;
  tiltHist: CircularBuffer<number>;
  heightMHist: CircularBuffer<number>;
  bbox: BBox | null;

  constructor(trackId: number) {
    this.id = trackId;
    this.lastSeen = Date.now() / 1000;

    this.bboxHist = new CircularBuffer(60);
    this.tiltHist = new CircularBuffer(60);
    this.heightMHist = new CircularBuffer(10);
    this.bbox = null;
  }

  get estHeightM(): number | null {
    if (this.heightMHist.length === 0) return null;
    return median(this.heightMHist.toArray());
  }
}
