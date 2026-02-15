from typing import List, Tuple
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config
import numpy as np

class ExcessiveBodyTiltRule(Rule):
    name = "excessive_body_tilt"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db_dict = {}  # person별 debounce 관리
    
    def is_active(self, ctx):
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []

        for p in ctx.state.persons.values():

            if len(p.pose_hist) < 5:
                continue

            # 최근 7개 Pose 객체에서 body_tilt_deg 추출
            recent = [
                h.body_tilt_deg
                for h in list(p.pose_hist)[-7:]
                if h.body_tilt_deg is not None
            ]
            if not recent:
                continue

            tilt = float(np.median(recent))

            # 조건 판단
            cond = tilt > self.cfg.body_tilt_deg

            # track_id(p.id)로 Debounce 객체 가져오기
            db = self.db_dict.setdefault(
                p.id,
                Debounce(self.cfg.body_tilt_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, cond):
                events.append(
                    Event(
                        self.name,
                        "medium",
                        p.id,
                        now,
                        {"tilt_deg": tilt},
                    )
                )

        return events

class TopStepUsageRule(Rule):
    name = "top_step_usage"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db_dict = {}  # ladder별 debounce 관리
    
    def is_active(self, ctx):
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []

        for person in ctx.state.persons.values():
            if not person.pose_hist:
                continue

            latest_pose = person.pose_hist[-1]

            left_ankle = latest_pose.keypoints.get("left_ankle")
            right_ankle = latest_pose.keypoints.get("right_ankle")
            if not left_ankle or not right_ankle:
                continue

            # ladder_id가 없는 경우 skip
            if not hasattr(person, "ladder_id") or person.ladder_id not in ctx.state.ladders:
                continue

            ladder = ctx.state.ladders[person.ladder_id]

            left_point = (left_ankle.x, left_ankle.y)
            right_point = (right_ankle.x, right_ankle.y)

            db = self.db_dict.setdefault(
                ladder.id,
                Debounce(self.cfg.top_step_sec, self.cfg.cooldown_sec)
            )

            if (self._in_zone(left_point, ladder.top_step_zone) or
                self._in_zone(right_point, ladder.top_step_zone)):
                if db.check(now, True):
                    events.append(Event(self.name, "top_step_usage", person.id, now, {}))
            else:
                db.reset(now)

        return events

    @staticmethod
    def _in_zone(
        point: Tuple[float, float],
        zone: Tuple[float, float, float, float],
    ) -> bool:
        x, y = point
        x1, y1, x2, y2 = zone
        return x1 <= x <= x2 and y1 <= y <= y2