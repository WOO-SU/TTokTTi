import type { BBox } from '../types';
import { CircularBuffer, median } from '../utils';

export class PersonState {
  id: number;
  lastSeen: number;

  helmetHist: CircularBuffer<boolean>;
  vestHist: CircularBuffer<boolean>;
  shoesHist: CircularBuffer<boolean>;
  heightPxHist: CircularBuffer<number>;
  feetVisibleHist: CircularBuffer<boolean>;
  onLadderHist: CircularBuffer<boolean>;
  poseHist: CircularBuffer<Record<string, any>>;

  bbox: BBox | null;
  keypoints: Record<string, any> | null;

  constructor(trackId: number, maxLen: number = 120) {
    this.id = trackId;
    this.lastSeen = Date.now() / 1000;

    this.helmetHist = new CircularBuffer(maxLen);
    this.vestHist = new CircularBuffer(maxLen);
    this.shoesHist = new CircularBuffer(maxLen);
    this.heightPxHist = new CircularBuffer(10);
    this.feetVisibleHist = new CircularBuffer(maxLen);
    this.onLadderHist = new CircularBuffer(maxLen);
    this.poseHist = new CircularBuffer(60);

    this.bbox = null;
    this.keypoints = null;
  }

  get heightPx(): number | null {
    if (this.heightPxHist.length === 0) return null;
    return median(this.heightPxHist.toArray());
  }
}
