import type { Tracked } from '../types';

export class SiteState {
  timestamp: number = 0;
  personCount: number = 0;
  anyLadder: boolean = false;
  anyOuttrigger: boolean = false;

  update(tracked: Map<number, Tracked>, now: number): void {
    this.timestamp = now;

    let personCount = 0;
    let anyLadder = false;
    let anyOuttrigger = false;

    for (const t of tracked.values()) {
      if (t.label === 'person') personCount++;
      else if (t.label === 'ladder') anyLadder = true;
      else if (t.label === 'outtrigger') anyOuttrigger = true;
    }

    this.personCount = personCount;
    this.anyLadder = anyLadder;
    this.anyOuttrigger = anyOuttrigger;
  }
}
