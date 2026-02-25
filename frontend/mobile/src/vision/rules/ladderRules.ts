import type { SafetyEvent, BBox } from '../types';
import type { VisionConfig } from '../config';
import { Debounce } from './base';
import type { Rule, RuleContext } from './base';
import { CircularBuffer, median } from '../utils';

function bboxCenter(b: BBox): [number, number] {
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}

function bboxMovePx(b1: BBox, b2: BBox): number {
  const c1 = bboxCenter(b1);
  const c2 = bboxCenter(b2);
  return Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
}

function bboxCentersDist(b1: BBox, b2: BBox): number {
  const c1 = bboxCenter(b1);
  const c2 = bboxCenter(b2);
  return Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
}

function bboxAspect(b: BBox): number {
  const w = Math.abs(b[2] - b[0]);
  const h = Math.max(1, Math.abs(b[3] - b[1]));
  return w / h;
}

function bboxArea(b: BBox): number {
  return Math.max(0, (b[2] - b[0]) * (b[3] - b[1]));
}

interface Signals {
  centerDelta: number;
  aspectDelta: number;
  areaDeltaR: number;
}

function computeSignals(bOld: BBox, bNew: BBox): Signals {
  const centerDelta = bboxCentersDist(bOld, bNew);
  const aspectDelta = Math.abs(bboxAspect(bNew) - bboxAspect(bOld));
  const areaOld = bboxArea(bOld);
  const areaDeltaR = Math.abs(bboxArea(bNew) - areaOld) / Math.max(1.0, areaOld);

  return { centerDelta, aspectDelta, areaDeltaR };
}

export class LadderInstabilityRule implements Rule {
  name = 'ladder_instability';
  private cfg: VisionConfig;
  private db: Debounce;

  private static readonly MIN_HIST = 5;
  private static readonly SIGNAL_WIN = 7;

  private centerHist: Map<number, CircularBuffer<number>>;
  private aspectHist: Map<number, CircularBuffer<number>>;
  private areaHist: Map<number, CircularBuffer<number>>;

  constructor(cfg: VisionConfig) {
    this.cfg = cfg;
    this.db = new Debounce(0, 0);
    this.centerHist = new Map();
    this.aspectHist = new Map();
    this.areaHist = new Map();
  }

  private getHists(ladderId: number): {
    center: CircularBuffer<number>;
    aspect: CircularBuffer<number>;
    area: CircularBuffer<number>;
  } {
    if (!this.centerHist.has(ladderId)) {
      this.centerHist.set(ladderId, new CircularBuffer(60));
    }
    if (!this.aspectHist.has(ladderId)) {
      this.aspectHist.set(ladderId, new CircularBuffer(60));
    }
    if (!this.areaHist.has(ladderId)) {
      this.areaHist.set(ladderId, new CircularBuffer(60));
    }

    return {
      center: this.centerHist.get(ladderId)!,
      aspect: this.aspectHist.get(ladderId)!,
      area: this.areaHist.get(ladderId)!,
    };
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const ladder of ctx.state.ladders.values()) {
      const bboxHist = ladder.bboxHist.toArray();
      if (bboxHist.length < 2) continue;

      const bOld = bboxHist[bboxHist.length - 2];
      const bNew = bboxHist[bboxHist.length - 1];
      const sig = computeSignals(bOld, bNew);

      const hists = this.getHists(ladder.id);
      hists.center.push(sig.centerDelta);
      hists.aspect.push(sig.aspectDelta);
      hists.area.push(sig.areaDeltaR);

      if (hists.center.length < LadderInstabilityRule.MIN_HIST) continue;

      const centerMedian = median(hists.center.slice(-LadderInstabilityRule.SIGNAL_WIN));
      const aspectMedian = median(hists.aspect.slice(-LadderInstabilityRule.SIGNAL_WIN));
      const areaMedian = median(hists.area.slice(-LadderInstabilityRule.SIGNAL_WIN));

      const db = this.db.setdefault(
        ladder.id,
        this.cfg.ladderUnstableSec,
        this.cfg.cooldownSec,
      );

      // Danger: 즉시 발화
      if (
        centerMedian > this.cfg.ladderDangerCenterPx ||
        aspectMedian > this.cfg.ladderDangerAspect
      ) {
        if (db.fireImmediate(now)) {
          events.push({
            label: this.name,
            severity: 'high',
            targetId: ladder.id,
            ts: now,
            info: {
              center_delta_px: Math.round(centerMedian * 10) / 10,
              aspect_delta: Math.round(aspectMedian * 1000) / 1000,
              area_delta_r: Math.round(areaMedian * 1000) / 1000,
            },
          });
        }
        continue;
      }

      // Warn: 지속 조건
      const warn =
        centerMedian > this.cfg.ladderUnstableCenterPx ||
        aspectMedian > this.cfg.ladderUnstableAspect ||
        areaMedian > this.cfg.ladderUnstableAreaR;

      if (db.check(now, warn)) {
        events.push({
          label: this.name,
          severity: 'medium',
          targetId: ladder.id,
          ts: now,
          info: {
            center_delta_px: Math.round(centerMedian * 10) / 10,
            aspect_delta: Math.round(aspectMedian * 1000) / 1000,
            area_delta_r: Math.round(areaMedian * 1000) / 1000,
          },
        });
      }
    }

    return events;
  }
}

export class LadderMovementWithPersonRule implements Rule {
  name = 'ladder_movement_with_person';
  private cfg: VisionConfig;
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.cfg = cfg;
    this.db = new Debounce(cfg.ladderMoveSec, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    // 사다리 위에 사람이 있는지
    const onLadderAny = Array.from(ctx.state.persons.values()).some(
      p => p.onLadderHist.length > 0 && p.onLadderHist.last() === true,
    );

    if (!onLadderAny) return events;

    for (const l of ctx.state.ladders.values()) {
      if (l.bboxHist.length < 2) continue;

      const b1 = l.bboxHist.get(l.bboxHist.length - 2);
      const b2 = l.bboxHist.last()!;
      const movePx = bboxMovePx(b1, b2);

      if (this.db.check(now, movePx > this.cfg.ladderMovePx)) {
        events.push({
          label: this.name,
          severity: 'high',
          targetId: l.id,
          ts: now,
          info: { move_px: movePx },
        });
      }
    }

    return events;
  }
}
