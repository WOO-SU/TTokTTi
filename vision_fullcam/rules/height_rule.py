# vision/rules/height_rule.py
from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

class HeightLadderViolationRule(Rule):
    name = "height_ladder_violation"
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(0.5, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp

        expected_h = float(ctx.task.expected_height_m or 0.0)

        cond = (
            expected_h > self.cfg.ladder_height_threshold_m
            and ctx.state.site.any_ladder
        )

        if self.db.check(now, cond):
            return [
                Event(
                    self.name,
                    "medium",
                    None,
                    now,
                    {"expected_height_m": expected_h},
                )
            ]
        return []
