import type { SafetyEvent } from '../types';
import type { VisionConfig } from '../config';
import { Debounce } from './base';
import type { Rule, RuleContext } from './base';
import { median } from '../utils';

export class ExcessiveBodyTiltRule implements Rule {
  name = 'excessive_body_tilt';
  private cfg: VisionConfig;
  private perKey: Map<number, Debounce> = new Map();

  constructor(cfg: VisionConfig) {
    this.cfg = cfg;
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const p of ctx.state.persons.values()) {
      if (p.poseHist.length < 5) continue;

      const lastPose = p.poseHist.last();
      if (!lastPose || lastPose.tilt_deg === undefined) continue;

      const recent = p.poseHist
        .slice(-7)
        .map(h => h.tilt_deg as number)
        .filter(v => v !== undefined);

      if (recent.length === 0) continue;

      const tilt = median(recent);

      if (!this.perKey.has(p.id)) {
        this.perKey.set(
          p.id,
          new Debounce(this.cfg.bodyTiltSec, this.cfg.cooldownSec),
        );
      }
      const db = this.perKey.get(p.id)!;

      if (db.check(now, tilt > this.cfg.bodyTiltDeg)) {
        events.push({
          label: this.name,
          severity: 'medium',
          targetId: p.id,
          ts: now,
          info: { tilt_deg: tilt },
        });
      }
    }
    return events;
  }
}

export class TopStepUsageRule implements Rule {
  name = 'top_step_usage';
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.db = new Debounce(cfg.topStepSec, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const p of ctx.state.persons.values()) {
      if (!p.keypoints) continue;

      const leftAnkle = p.keypoints.left_ankle;
      const rightAnkle = p.keypoints.right_ankle;
      if (!leftAnkle || !rightAnkle) continue;
      if (leftAnkle.score < 0.4 || rightAnkle.score < 0.4) continue;

      // 사다리 위에 있고, 발목이 사다리 상단 20%에 있는지 확인
      if (p.onLadderHist.length === 0 || !p.onLadderHist.last()) continue;

      // 사다리의 상단 영역에 발목이 있는지 확인
      for (const l of ctx.state.ladders.values()) {
        if (l.bbox === null) continue;
        const ladderTop20 = l.bbox[1] + (l.bbox[3] - l.bbox[1]) * 0.2;

        const ankleInTopStep =
          leftAnkle.y < ladderTop20 || rightAnkle.y < ladderTop20;

        if (this.db.check(now, ankleInTopStep)) {
          events.push({
            label: this.name,
            severity: 'medium',
            targetId: p.id,
            ts: now,
            info: {},
          });
        }
      }
    }

    return events;
  }
}
