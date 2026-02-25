from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


class InsufficientWorkerCountRule(Rule):
    name = "insufficient_worker_count"

    def __init__(self, cfg: Config):
        self._db = Debounce(cfg.worker_missing_sec, cfg.cooldown_sec)

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now  = ctx.timestamp
        site = ctx.state.site
        cond = site.any_ladder and (site.person_count < 2)

        if self._db.check(now, cond):
            return [Event(
                self.name, "high", None, now,
                {"person_count": site.person_count}
            )]

        return []