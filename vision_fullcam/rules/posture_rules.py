# vision/rules/posture_rules.py
from typing import List
from vision.rules.base import Rule, RuleContext, Event, Debounce
from vision.config import Config

class ExcessiveBodyTiltRule(Rule):
    name = "excessive_body_tilt"
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(cfg.body_tilt_sec, cfg.cooldown_sec)

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
            if self.db.check(now, tilt > self.cfg.body_tilt_deg):
                events.append(Event(self.name, "medium", p.id, now, {"tilt_deg": tilt}))
        return events

class TopStepUsageRule(Rule):
    name = "top_step_usage"
    def __init__(self, cfg: Config):
        self.db = Debounce(cfg.top_step_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        # 2차: MoveNet 발목 + 사다리 상단 금지구간으로 구현
        # 지금은 뼈대만
        return []
