import type { SafetyEvent } from '../types';
import type { StateBuffer } from '../state/stateBuffer';
import type { TaskState } from '../state/taskState';

export interface RuleContext {
  timestamp: number;
  state: StateBuffer;
  task: TaskState;
}

export interface Rule {
  name: string;
  evaluate(ctx: RuleContext): SafetyEvent[];
}

/**
 * condition이 duration만큼 참이면 fire.
 * fire 이후 cooldown 동안 재발화 방지.
 *
 * - check(now, cond): 단일 디바운스
 * - setdefault(key): key별 독립 디바운스
 * - fireImmediate(now): 즉시 1회 발화 + cooldown
 */
export class Debounce {
  private duration: number;
  private cooldown: number;
  private startTs: number | null = null;
  private coolUntil: number = 0;
  private perKey: Map<number, Debounce> = new Map();

  constructor(durationSec: number, cooldownSec: number) {
    this.duration = durationSec;
    this.cooldown = cooldownSec;
  }

  check(now: number, cond: boolean): boolean {
    if (now < this.coolUntil) return false;

    if (cond) {
      if (this.startTs === null) this.startTs = now;
      if (now - this.startTs >= this.duration) {
        this.startTs = null;
        this.coolUntil = now + this.cooldown;
        return true;
      }
    } else {
      this.startTs = null;
    }

    return false;
  }

  fireImmediate(now: number): boolean {
    if (now < this.coolUntil) return false;
    this.startTs = null;
    this.coolUntil = now + this.cooldown;
    return true;
  }

  setdefault(key: number, durationSec: number, cooldownSec: number): Debounce {
    if (!this.perKey.has(key)) {
      this.perKey.set(key, new Debounce(durationSec, cooldownSec));
    }
    return this.perKey.get(key)!;
  }
}
