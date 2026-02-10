# vision/state/state_buffer.py
import time
from typing import Dict, Optional
from vision.state.person_state import PersonState
from vision.state.ladder_state import LadderState
from vision.detection.classes import DetLabel

class StateBuffer:
    def __init__(self):
        self.persons: Dict[int, PersonState] = {}
        self.ladders: Dict[int, LadderState] = {}

        # 전역 상태 (MVP)
        self.person_count: int = 0
        self.any_ladder: bool = False
        self.any_outtrigger: bool = False

    def update(self, tracked: Dict[int, object], now: float):
        # count
        self.person_count = sum(1 for t in tracked.values() if t.label == DetLabel.PERSON.value)
        self.any_ladder = any(t.label == DetLabel.LADDER.value for t in tracked.values())
        self.any_outtrigger = any(t.label == DetLabel.OUTTRIGGER.value for t in tracked.values())

        # update states
        for tid, t in tracked.items():
            if t.label == DetLabel.PERSON.value:
                ps = self.persons.get(tid) or PersonState(tid)
                ps.last_seen = now
                ps.bbox = t.bbox
                self.persons[tid] = ps
            elif t.label == DetLabel.LADDER.value:
                ls = self.ladders.get(tid) or LadderState(tid)
                ls.last_seen = now
                ls.bbox = t.bbox
                ls.bbox_hist.append(t.bbox)
                self.ladders[tid] = ls

        # prune (사라진 트랙 정리)
        self.persons = {k:v for k,v in self.persons.items() if now - v.last_seen < 3.0}
        self.ladders = {k:v for k,v in self.ladders.items() if now - v.last_seen < 3.0}
