# vision_fullcam/rules/vehicle_rules.py
from typing import List
import math
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

def bbox_center(b):
    x1, y1, x2, y2 = b
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

def dist_px(b1, b2) -> float:
    c1 = bbox_center(b1); c2 = bbox_center(b2)
    return math.hypot(c2[0] - c1[0], c2[1] - c1[1])

class VehicleProximityRule(Rule):
    name = "vehicle_proximity"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        # config에 없으면 기본값 쓰도록(나중에 cfg에 넣어도 됨)
        self.warn_px = getattr(cfg, "vehicle_proximity_warn_px", 260.0)
        self.danger_px = getattr(cfg, "vehicle_proximity_danger_px", 200.0)
        self.db_sec = getattr(cfg, "vehicle_proximity_sec", 0.6)
        self.cooldown = getattr(cfg, "cooldown_sec", 3.0)

        # 사람별 디바운스 (person track_id 기준)
        self.db = Debounce(self.db_sec, self.cooldown)
        
    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events: List[Event] = []

        if not ctx.state.persons or not getattr(ctx.state, "vehicles", None):
            return events

        for pid, p in ctx.state.persons.items():
            if p.bbox is None:
                continue

            best = None
            best_d = 1e18

            for vid, v in ctx.state.vehicles.items():
                if v.bbox is None:
                    continue
                d = dist_px(p.bbox, v.bbox)
                if d < best_d:
                    best_d = d
                    best = v
                    best_vid = vid

            if best is None:
                continue

            db = self.db.setdefault(pid, Debounce(self.db_sec, self.cooldown))

            # danger: 즉시
            if best_d <= self.danger_px:
                if db.fire_immediate(now):
                    events.append(Event(
                        self.name,
                        "high",
                        pid,
                        now,
                        {"distance_px": best_d, "vehicle_id": best_vid}
                    ))
                continue

            # warn: 지속 조건
            if db.check(now, best_d <= self.warn_px):
                events.append(Event(
                    self.name,
                    "medium",
                    pid,
                    now,
                    {"distance_px": best_d, "vehicle_id": best_vid}
                ))

        return events