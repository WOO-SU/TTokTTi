# vision/rules/worker_count.py
from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

class InsufficientWorkerCountRule(Rule):
    name = "insufficient_worker_count"
    def __init__(self, cfg: Config):
        self.db = Debounce(cfg.worker_missing_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        cond = ctx.state.any_ladder and (ctx.state.person_count < 2)
        if self.db.check(now, cond):
            return [Event(self.name, "medium", None, now, {"count": ctx.state.person_count})]
        return []
