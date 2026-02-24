import type { SafetyEvent } from '../types';
import type { VisionConfig } from '../config';
import { Debounce } from './base';
import type { Rule, RuleContext } from './base';

export class HelmetNotWornRule implements Rule {
  name = 'helmet_not_worn';
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.db = new Debounce(cfg.ppeMissingSec, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const p of ctx.state.persons.values()) {
      if (p.helmetHist.length < 10) continue;
      const recent = p.helmetHist.slice(-10);
      const missRatio = recent.filter(v => !v).length / recent.length;
      if (this.db.check(now, missRatio > 0.7)) {
        events.push({
          label: this.name,
          severity: 'medium',
          targetId: p.id,
          ts: now,
          info: { miss_ratio: missRatio },
        });
      }
    }
    return events;
  }
}

export class SafetyVestNotWornRule implements Rule {
  name = 'safety_vest_not_worn';
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.db = new Debounce(cfg.ppeMissingSec, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const p of ctx.state.persons.values()) {
      if (p.vestHist.length < 10) continue;
      const recent = p.vestHist.slice(-10);
      const missRatio = recent.filter(v => !v).length / recent.length;
      if (this.db.check(now, missRatio > 0.7)) {
        events.push({
          label: this.name,
          severity: 'medium',
          targetId: p.id,
          ts: now,
          info: { miss_ratio: missRatio },
        });
      }
    }
    return events;
  }
}

export class SafetyShoesNotWornRule implements Rule {
  name = 'safety_shoes_not_worn';
  private db: Debounce;

  constructor(cfg: VisionConfig) {
    this.db = new Debounce(cfg.ppeMissingSec, cfg.cooldownSec);
  }

  evaluate(ctx: RuleContext): SafetyEvent[] {
    const now = ctx.timestamp;
    const events: SafetyEvent[] = [];

    for (const p of ctx.state.persons.values()) {
      if (p.shoesHist.length < 10) continue;
      const recent = p.shoesHist.slice(-10);
      const missRatio = recent.filter(v => !v).length / recent.length;
      if (this.db.check(now, missRatio > 0.7)) {
        events.push({
          label: this.name,
          severity: 'low',
          targetId: p.id,
          ts: now,
          info: { miss_ratio: missRatio },
        });
      }
    }
    return events;
  }
}
