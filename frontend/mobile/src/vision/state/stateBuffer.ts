import type { Tracked } from '../types';
import { PersonState } from './personState';
import { LadderState } from './ladderState';
import { SiteState } from './siteState';
import { PPEObserver } from './ppeObserver';

export class StateBuffer {
  site: SiteState;
  persons: Map<number, PersonState>;
  ladders: Map<number, LadderState>;
  ppeObserver: PPEObserver;

  constructor() {
    this.site = new SiteState();
    this.persons = new Map();
    this.ladders = new Map();
    this.ppeObserver = new PPEObserver();
  }

  update(
    tracked: Map<number, Tracked>,
    frameShape: [number, number],
    now: number,
  ): void {
    // 1) site 요약
    this.site.update(tracked, now);

    // 2) person/ladder state 갱신
    for (const [tid, t] of tracked) {
      if (t.label === 'person') {
        if (!this.persons.has(tid)) {
          this.persons.set(tid, new PersonState(tid));
        }
        const p = this.persons.get(tid)!;
        p.bbox = t.bbox;
        p.lastSeen = now;
      } else if (t.label === 'ladder') {
        if (!this.ladders.has(tid)) {
          this.ladders.set(tid, new LadderState(tid));
        }
        const l = this.ladders.get(tid)!;
        l.bbox = t.bbox;
        l.bboxHist.push(t.bbox);
        l.lastSeen = now;
      }
    }

    // 3) 3초 이상 미관측 객체 제거
    for (const [k, v] of this.persons) {
      if (now - v.lastSeen >= 3.0) this.persons.delete(k);
    }
    for (const [k, v] of this.ladders) {
      if (now - v.lastSeen >= 3.0) this.ladders.delete(k);
    }

    // 4) PPE 관측
    this.ppeObserver.update(this.persons, tracked, frameShape);
  }

  reset(): void {
    this.site = new SiteState();
    this.persons = new Map();
    this.ladders = new Map();
  }
}
