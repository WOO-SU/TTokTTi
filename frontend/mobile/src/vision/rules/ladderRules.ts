import type { SafetyEvent, BBox } from '../types';
import type { VisionConfig } from '../config';
import { Debounce } from './base';
import type { Rule, RuleContext } from './base';
import { median } from '../utils';

function bboxCenter(b: BBox): [number, number] {
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}

function bboxMovePx(b1: BBox, b2: BBox): number {
  const c1 = bboxCenter(b1);
  const c2 = bboxCenter(b2);
  return Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
}

function ladderTiltDeg(bbox: BBox): number {
  const w = Math.abs(bbox[2] - bbox[0]);
  const h = Math.max(1, Math.abs(bbox[3] - bbox[1]));
  return Math.abs((Math.atan2(w, h) * 180) / Math.PI);
}

export class LadderTiltRule implements Rule {
  name = 'ladder_tilt';
  private cfg: VisionConfig;
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.cfg = cfg;
    this.db = new Debounce(0, 0); // per-key container
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const l of ctx.state.ladders.values()) {
      if (l.bbox === null) continue;

      const rawAngle = ladderTiltDeg(l.bbox);
      l.tiltHist.push(rawAngle);

      const hist = l.tiltHist.toArray();
      if (hist.length < 3) continue;

      const angle = median(hist.slice(-7));

      console.log(
        `[Vision:LadderTilt] ladder#${l.id} raw=${rawAngle.toFixed(1)}° median=${angle.toFixed(1)}° (warn>${this.cfg.ladderTiltWarnDeg}° danger>${this.cfg.ladderTiltDangerDeg}°)`,
      );

      const db = this.db.setdefault(
        l.id,
        this.cfg.ladderTiltSec,
        this.cfg.cooldownSec,
      );

      // danger: 즉시
      if (angle > this.cfg.ladderTiltDangerDeg) {
        if (db.fireImmediate(now)) {
          events.push({
            label: this.name,
            severity: 'high',
            targetId: l.id,
            ts: now,
            info: { tilt_deg: angle, tilt_raw_deg: rawAngle },
          });
        }
        continue;
      }

      // warn: 지속 조건
      if (db.check(now, angle > this.cfg.ladderTiltWarnDeg)) {
        events.push({
          label: this.name,
          severity: 'medium',
          targetId: l.id,
          ts: now,
          info: { tilt_deg: angle, tilt_raw_deg: rawAngle },
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
