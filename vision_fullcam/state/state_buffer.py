# vision/state/state_buffer.py
import time
from typing import Dict, Optional
from vision_fullcam.state.person_state import PersonState
from vision_fullcam.state.ladder_state import LadderState
from vision_fullcam.state.site_state import SiteState
from vision_fullcam.state.ppe_observer import PPEObserver

from typing import Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from vision_fullcam.tracking.simple_tracker import Tracked


class StateBuffer:
    def __init__(self):
        self.persons: Dict[int, PersonState] = {}
        self.ladders: Dict[int, LadderState] = {}

        # 전역 상태 (MVP)
        self.site: SiteState = SiteState()

        # 관측기
        self.ppe_observer : PPEObserver = PPEObserver()

    def update(self, tracked: Dict[int, "Tracked"], frame, now: float):
        """
        tracked : tracker output (id -> Tracked)
        frame   : np.ndarray
        now     : timestamp
        """
        # --------
        # 1) SiteState 업데이트 (프레임 단위 집계)
        # --------
        self.site.timestamp = now
        self.site.person_count = sum(1 for t in tracked.values() if t.label == "person")
        self.site.any_ladder = any(t.label == "ladder" for t in tracked.values())
        self.site.any_outtrigger = any(t.label == "outtrigger" for t in tracked.values())

        # --------
        # 2) Person / Ladder State 업데이트
        # --------
        for tid, t in tracked.items():
            if t.label == "person":
                ps = self.persons.get(tid)
                if ps is None:
                    ps = PersonState(tid)
                    self.persons[tid] = ps

                ps.bbox = t.bbox
                ps.last_seen = now

            elif t.label == "ladder":
                ls = self.ladders.get(tid)
                if ls is None:
                    ls = LadderState(tid)
                    self.ladders[tid] = ls

                ls.bbox = t.bbox
                ls.bbox_hist.append(t.bbox)
                ls.last_seen = now

        # --------
        # 3) 오래 안 보인 객체 정리
        # --------
        self.persons = {
            k: v for k, v in self.persons.items()
            if now - v.last_seen < 3.0
        }
        self.ladders = {
            k: v for k, v in self.ladders.items()
            if now - v.last_seen < 3.0
        }

        # --------
        # 4) PPE 관측 업데이트
        # --------
        self.ppe_observer.update(
            persons=self.persons,
            tracked=tracked,
            frame_shape=frame.shape[:2],
        )