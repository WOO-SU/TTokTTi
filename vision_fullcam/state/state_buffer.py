# vision/state/state_buffer.py
import time
from typing import Dict, Optional, TYPE_CHECKING
from vision_fullcam.state.person_state import PersonState
from vision_fullcam.state.ladder_state import LadderState
from vision_fullcam.state.site_state import SiteState
from vision_fullcam.state.ppe_observer import PPEObserver

from vision_fullcam.detection.classes import DetLabel
from vision_fullcam.state.vehicle_state import VehicleState

if TYPE_CHECKING:
    from vision_fullcam.tracking.simple_tracker import Tracked

class StateBuffer:
    def __init__(self):
        self.site = SiteState()
        self.persons: Dict[int, PersonState] = {}
        self.ladders: Dict[int, LadderState] = {}
        self.vehicles: Dict[int, VehicleState] = {}   # ✅ 추가

        self.ppe_observer = PPEObserver()   # ✅ 이 줄 추가

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

            elif t.label in ("vehicle", "car", "truck", "bus", "motorcycle"):
                if tid not in self.vehicles:
                    self.vehicles[tid] = VehicleState(track_id=tid)
                v = self.vehicles[tid]
                v.bbox = t.bbox
                v.bbox_hist.append(t.bbox)
                v.last_seen = now

        # 3) 오래 안 보인 객체 정리
        self.persons = {k: v for k, v in self.persons.items() if now - v.last_seen < 3.0}
        self.ladders = {k: v for k, v in self.ladders.items() if now - v.last_seen < 3.0}
        self.vehicles = {k: v for k, v in self.vehicles.items() if now - v.last_seen < 3.0}  # ✅ 추가

        # 4) PPE 관측 업데이트 (✅ frame.shape 사용 가능)
        self.ppe_observer.update(
            persons=self.persons,
            tracked=tracked,
            frame_shape=frame.shape[:2],
        )