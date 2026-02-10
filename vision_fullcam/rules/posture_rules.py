from typing import List, Tuple
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config
import numpy as np

class ExcessiveBodyTiltRule(Rule):
    name = "excessive_body_tilt"
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = {}

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []
        # pose_hist에 {"tilt_deg": ...} 같은 값을 쌓는다고 가정
        for p in ctx.state.persons.values():
            if len(p.pose_hist) < 5:
                continue
            tilt = p.pose_hist[-1].get("tilt_deg", None)
            if tilt is None:
                continue

            recent = [h["tilt_deg"] for h in list(p.pose_hist)[-7:]]
            tilt = np.median(recent)

            db = self.db.setdefault(
                p.id,
                Debounce(self.cfg.body_tilt_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, tilt > self.cfg.body_tilt_deg):
                events.append(Event(self.name, "medium", p.id, now, {"tilt_deg": float(tilt)}))
        return events

class TopStepUsageRule(Rule):
    name = "top_step_usage"
    def __init__(self, cfg: Config):
        self.db = Debounce(cfg.top_step_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        # Movenet으로 ankle keypoint를 추적
        left_ankle = ctx.keypoints.get("left_ankle", None)
        right_ankle = ctx.keypoints.get("right_ankle", None)

        if not left_ankle or not right_ankle:
            self.db.reset(ctx.track_id, now)
            return []
        
        if (
            self._in_zone(left_ankle, ctx.task.top_step_zone) or
            self._in_zone(right_ankle, ctx.task.top_step_zone)
        ): # 조건 판별 후 hit 호출
            if self.db.hit(ctx.track_id, now):
                return [Event(self.name, "top_step_usage", ctx.track_id, now, {})]
        else:
            # 발이 내려오면 debounce 리셋
            self.db.reset(ctx.track_id, now)
        
        return []
    
    @staticmethod
    def _in_zone(
        point: Tuple[float, float],
        zone: Tuple[float]
    ) -> bool:
        x, y = point
        x1, y1, x2, y2 = zone
        return x1 <= x <= x2 and y1 <= y <= y2