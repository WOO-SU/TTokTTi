import type { BBox, Tracked } from '../types';

function iou(a: BBox, b: BBox): number {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = Math.max(1, areaA + areaB - inter);
  return inter / union;
}

/**
 * IoU 기반 심플 트래커.
 * Python simple_tracker.py 1:1 포팅.
 */
export class SimpleTracker {
  private iouThr: number;
  private nextId: number;
  private prev: Map<number, Tracked>;

  constructor(iouThr: number = 0.3) {
    this.iouThr = iouThr;
    this.nextId = 1;
    this.prev = new Map();
  }

  update(detections: Tracked[]): Map<number, Tracked> {
    const newPrev = new Map<number, Tracked>();
    const used = new Set<number>();

    // 기존 트랙에 매칭
    for (const [tid, prevT] of this.prev) {
      let bestJ: number | null = null;
      let bestIoU = 0.0;

      for (let j = 0; j < detections.length; j++) {
        if (used.has(j)) continue;
        const d = detections[j];
        if (d.label !== prevT.label) continue;

        const s = iou(prevT.bbox, d.bbox);
        if (s > bestIoU) {
          bestIoU = s;
          bestJ = j;
        }
      }

      if (bestJ !== null && bestIoU >= this.iouThr) {
        used.add(bestJ);
        const d = detections[bestJ];
        newPrev.set(tid, {
          trackId: tid,
          label: d.label,
          bbox: d.bbox,
          score: d.score,
        });
      }
    }

    // 신규 트랙 부여
    for (let j = 0; j < detections.length; j++) {
      if (used.has(j)) continue;
      const d = detections[j];
      const tid = this.nextId++;
      newPrev.set(tid, {
        trackId: tid,
        label: d.label,
        bbox: d.bbox,
        score: d.score,
      });
    }

    this.prev = newPrev;
    return newPrev;
  }

  reset(): void {
    this.prev = new Map();
    this.nextId = 1;
  }
}
