import type { SafetyEvent } from '../types';
import type { VisionConfig } from '../config';
import { Debounce } from './base';
import type { Rule, RuleContext } from './base';

export class HeightLadderViolationRule implements Rule {
  name = 'height_ladder_violation';
  private cfg: VisionConfig;
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.cfg = cfg;
    this.db = new Debounce(0.5, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const l of ctx.state.ladders.values()) {
      const h = l.estHeightM;
      if (h === null) continue;

      if (this.db.check(now, h >= this.cfg.ladderHeightThresholdM)) {
        events.push({
          label: this.name,
          severity: 'medium',
          targetId: l.id,
          ts: now,
          info: {
            estimated_height_m: Math.round(h * 100) / 100,
            assumed_person_height_m: 1.7,
          },
        });
      }
    }

    return events;
  }
}
