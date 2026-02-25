import type { SafetyEvent } from '../types';
import type { VisionConfig } from '../config';
import { Debounce } from './base';
import type { Rule, RuleContext } from './base';

export class InsufficientWorkerCountRule implements Rule {
  name = 'insufficient_worker_count';
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.db = new Debounce(cfg.workerMissingSec, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const cond =
      ctx.state.site.anyLadder && ctx.state.site.personCount < 2;

    if (this.db.check(now, cond)) {
      return [
        {
          label: this.name,
          severity: 'high',
          targetId: null,
          ts: now,
          info: { person_count: ctx.state.site.personCount },
        },
      ];
    }
    return [];
  }
}
