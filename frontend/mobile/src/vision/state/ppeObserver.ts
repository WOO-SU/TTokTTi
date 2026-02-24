import type { BBox, Tracked } from '../types';
import type { PersonState } from './personState';

function centerIn(box: BBox, roi: BBox): boolean {
  const cx = (box[0] + box[2]) / 2;
  const cy = (box[1] + box[3]) / 2;
  return roi[0] <= cx && cx <= roi[2] && roi[1] <= cy && cy <= roi[3];
}

function roiHead(pb: BBox): BBox {
  const h = pb[3] - pb[1];
  return [pb[0], pb[1], pb[2], Math.round(pb[1] + 0.35 * h)];
}

function roiTorso(pb: BBox): BBox {
  const h = pb[3] - pb[1];
  return [pb[0], Math.round(pb[1] + 0.20 * h), pb[2], Math.round(pb[1] + 0.75 * h)];
}

function roiFeet(pb: BBox): BBox {
  const h = pb[3] - pb[1];
  return [pb[0], Math.round(pb[1] + 0.70 * h), pb[2], pb[3]];
}

function iou(a: BBox, b: BBox): number {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);
  const areaB = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  const union = Math.max(1, areaA + areaB - inter);
  return inter / union;
}

function roiVisible(
  roi: BBox,
  frameW: number,
  frameH: number,
  minAreaRatio: number = 0.35,
): boolean {
  const ix1 = Math.max(0, roi[0]);
  const iy1 = Math.max(0, roi[1]);
  const ix2 = Math.min(frameW, roi[2]);
  const iy2 = Math.min(frameH, roi[3]);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const area = Math.max(1, (roi[2] - roi[0]) * (roi[3] - roi[1]));
  return inter / area >= minAreaRatio;
}

export class PPEObserver {
  update(
    persons: Map<number, PersonState>,
    tracked: Map<number, Tracked>,
    frameShape: [number, number], // [height, width]
  ): void {
    const [h, w] = frameShape;

    const helmetBoxes: BBox[] = [];
    const vestBoxes: BBox[] = [];
    const shoesBoxes: BBox[] = [];
    const ladderBoxes: BBox[] = [];

    for (const t of tracked.values()) {
      if (t.label === 'helmet') helmetBoxes.push(t.bbox);
      else if (t.label === 'safety_vest') vestBoxes.push(t.bbox);
      else if (t.label === 'safety_shoes') shoesBoxes.push(t.bbox);
      else if (t.label === 'ladder') ladderBoxes.push(t.bbox);
    }

    for (const p of persons.values()) {
      if (p.bbox === null) continue;

      const head = roiHead(p.bbox);
      const torso = roiTorso(p.bbox);
      const feet = roiFeet(p.bbox);

      const hasHelmet = helmetBoxes.some(b => centerIn(b, head));
      const hasVest = vestBoxes.some(b => centerIn(b, torso));

      const feetVisible = roiVisible(feet, w, h, 0.35);

      let hasShoes: boolean;
      if (feetVisible) {
        hasShoes = shoesBoxes.some(b => centerIn(b, feet));
      } else {
        hasShoes = true; // 판단 유예 (오탐 방지)
      }

      p.helmetHist.push(hasHelmet);
      p.vestHist.push(hasVest);
      p.feetVisibleHist.push(feetVisible);
      p.shoesHist.push(hasShoes);

      console.log(
        `[Vision:PPE] person#${p.id} helmet=${hasHelmet} vest=${hasVest} shoes=${hasShoes} feetVisible=${feetVisible}`,
      );

      // 사다리 탑승 여부
      let onLadder = false;
      for (const lb of ladderBoxes) {
        if (iou(feet, lb) > 0.10) {
          onLadder = true;
          break;
        }
      }
      p.onLadderHist.push(onLadder);
    }
  }
}
