from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


class OuttriggerNotDeployedRule(Rule):
    name = "outtrigger_not_deployed"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._db = Debounce(cfg.outtrigger_not_deployed_sec, cfg.cooldown_sec)

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now      = ctx.timestamp
        required = bool(getattr(ctx.task, "outtrigger_required", False))

        if not required:
            return []

        outtrigger_ok = getattr(ctx.state, "any_outtrigger", False)

        if self._db.check(now, not outtrigger_ok):
            return [Event(
                self.name, "medium", None, now,
                {
                    "required":             True,
                    "outtrigger_detected":  outtrigger_ok,
                }
            )]

        return []