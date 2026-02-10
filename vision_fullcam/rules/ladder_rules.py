# vision/rules/ladder_rules.py
from typing import List, Optional
import math
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config
import numpy as np

def bbox_center(b):
    x1,y1,x2,y2 = b
    return ((x1+x2)/2.0, (y1+y2)/2.0)

def bbox_move_px(b1, b2) -> float:
    c1 = bbox_center(b1); c2 = bbox_center(b2)
    return math.hypot(c2[0]-c1[0], c2[1]-c1[1])

def ladder_tilt_deg(bbox):
    x1, y1, x2, y2 = bbox
    w = abs(x2 - x1)
    h = max(1, abs(y2 - y1))
    return abs(math.degrees(math.atan2(w, h)))


class LadderTiltRule(Rule):
    name = "ladder_tilt"
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(cfg.ladder_tilt_sec, cfg.cooldown_sec)
        # 지속 시간 = ladder_tilt_sec, 쿨다운 = cooldown_sec
        # 특정 각도가 지속 시간 이상 유지되면 이벤트 발생
        # 한 번 울리면 쿨다운 동안은 울리지 않도록

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []
        for l in ctx.state.ladders.values(): # state_buffer -> LadderState 객체
            if l.axis_line is None:
                continue

            angle = ladder_tilt_deg(l.bbox)

            l.tilt_hist.append(angle)
            angle = np.median(l.tilt_hist[-7:])

            db = self.db.setdefault(
                l.id,
                Debounce(self.cfg.ladder_tilt_sec, self.cfg.cooldown_sec)
            )

            if angle > self.cfg.ladder_tilt_danger_deg:
                if db.fire_immediate(now):   # 즉시 위험 알림: 지속 시간 필요 X
                    events.append(Event(
                        self.name, "high", l.id, now,
                        {"tilt_deg": angle}
                    ))
                continue
            # warn
            if db.check(now, angle > self.cfg.ladder_tilt_warn_deg): # 지속 시간 check
                events.append(Event(
                    self.name, "medium", l.id, now,
                    {"tilt_deg": angle}
                ))

        return events

class LadderMovementWithPersonRule(Rule):
    name = "ladder_movement_with_person"
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(cfg.ladder_move_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []
        # MVP: "사람이 사다리 위" 판정은 2차에서 포즈/ROI로 강화
        # 1차: 사다리 존재 + 사람 존재 상태에서 사다리가 움직이면 일단 기록
        for l in ctx.state.ladders.values():
            if len(l.bbox_hist) < 2:
                continue
            b1 = l.bbox_hist[-2]
            b2 = l.bbox_hist[-1]
            move_px = bbox_move_px(b1, b2)
            cond = (ctx.state.person_count > 0) and (move_px > self.cfg.ladder_move_px)
            if self.db.check(now, cond):
                events.append(Event(self.name, "high", l.id, now, {"move_px": move_px}))
        return events
