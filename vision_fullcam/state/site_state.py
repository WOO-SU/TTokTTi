# vision_fullcam/state/site_state.py
# 카메라로 알 수 있는 정보
from dataclasses import dataclass
from typing import Dict

from vision_fullcam.tracking.simple_tracker import Tracked


@dataclass
class SiteState:
    timestamp: float = 0.0
    person_count: int = 0
    any_ladder: bool = False
    any_outtrigger: bool = False

    def update(self, tracked: Dict[int, Tracked], now: float):
        """
        tracked: tracker 결과 (id -> Tracked)
        now: timestamp
        """
        self.timestamp = now

        person_count = 0
        any_ladder = False
        any_outtrigger = False

        for t in tracked.values():
            if t.label == "person":
                person_count += 1
            elif t.label == "ladder":
                any_ladder = True
            elif t.label == "outtrigger":
                any_outtrigger = True

        self.person_count = person_count
        self.any_ladder = any_ladder
        self.any_outtrigger = any_outtrigger
