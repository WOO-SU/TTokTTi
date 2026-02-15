# vision/state/state_buffer.py
import time
from typing import Dict, Optional, TYPE_CHECKING
from vision_fullcam.state.person_state import PersonState
from vision_fullcam.state.ladder_state import LadderState
from vision_fullcam.state.site_state import SiteState
from vision_fullcam.state.ppe_observer import PPEObserver

from vision_fullcam.detection.classes import DetLabel

if TYPE_CHECKING:
    from vision_fullcam.tracking.simple_tracker import Tracked

class StateBuffer:
    def __init__(self):
        self.site = SiteState()
        self.persons: Dict[int, PersonState] = {}
        self.ladders: Dict[int, LadderState] = {}
        self.ppe_observer = PPEObserver()  
    
    # for context-based rule activation
    def has_person(self):
        return len(self.persons) > 0
    
    def person_on_ladder(self):
        for person in self.persons.values():
            for ladder in self.ladders.values():
                if self._iou(person.bbox, ladder.bbox) > 0.3:
                    return True
        return False

    def update(self, tracked: Dict[int, "Tracked"], frame, now: float):  # ✅ frame 받도록 변경
        # 1) site 요약 업데이트
        self.site.update(tracked, now)

        # 2) persons/ladders state 갱신
        for tid, t in tracked.items():
            if t.label == "person":
                if tid not in self.persons:
                    self.persons[tid] = PersonState(track_id=tid)
                p = self.persons[tid]
                p.bbox = t.bbox
                p.last_seen = now

            elif t.label == "ladder":
                if tid not in self.ladders:
                    self.ladders[tid] = LadderState(track_id=tid)
                l = self.ladders[tid]
                l.bbox = t.bbox
                l.bbox_hist.append(t.bbox)
                l.last_seen = now
                l.update_top_step_zone(top_ratio=0.2)
                
        for person in self.persons.values():
            person.ladder_id = None
            for lid, ladder in self.ladders.items():
                if ladder.bbox is None or person.bbox is None:
                    continue
                px1, py1, px2, py2 = person.bbox
                lx1, ly1, lx2, ly2 = ladder.bbox
                cx = (px1 + px2) / 2
                cy = (py1 + py2) / 2
                if lx1 <= cx <= lx2 and ly1 <= cy <= ly2:
                    person.ladder_id = lid
                    break
        # 3) 오래 안 보인 객체 정리
        self.persons = {k: v for k, v in self.persons.items() if now - v.last_seen < 3.0}
        self.ladders = {k: v for k, v in self.ladders.items() if now - v.last_seen < 3.0}

        # 4) PPE 관측 업데이트 (✅ frame.shape 사용 가능)
        self.ppe_observer.update(
            persons=self.persons,
            tracked=tracked,
            frame_shape=frame.shape[:2],
        )
    
    def _iou(self, boxA, boxB):
        # box: (x1, y1, x2, y2)

        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        inter_w = max(0, xB - xA)
        inter_h = max(0, yB - yA)
        inter_area = inter_w * inter_h

        if inter_area == 0:
            return 0.0

        boxA_area = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxB_area = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

        union_area = boxA_area + boxB_area - inter_area

        return inter_area / union_area