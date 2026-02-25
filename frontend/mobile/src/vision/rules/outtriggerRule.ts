import type { SafetyEvent } from '../types';
import type { VisionConfig } from '../config';
import { Debounce } from './base';
import type { Rule, RuleContext } from './base';

export class OuttriggerNotDeployedRule implements Rule {
  name = 'outtrigger_not_deployed';
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.db = new Debounce(cfg.outtriggerMissingSec, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;

    if (!ctx.task.outtriggerRequired) return [];

    const cond = !ctx.state.site.anyOuttrigger;

    if (this.db.check(now, cond)) {
      return [
        {
          label: this.name,
          severity: 'medium',
          targetId: null,
          ts: now,
          info: {
            required: true,
            outtrigger_detected: ctx.state.site.anyOuttrigger,
          },
        },
      ];
    }
    return [];
  }
}
