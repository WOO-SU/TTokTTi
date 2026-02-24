from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


class HeightLadderViolationRule(Rule):
    name = "height_ladder_violation"

    def __init__(self, cfg: Config):
        self.cfg      = cfg
        self._db_pool = Debounce(0, 0)

    def is_active(self, ctx: RuleContext) -> bool:
        return bool(ctx.state.ladders)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now    = ctx.timestamp
        events = []

        for ladder in ctx.state.ladders.values():
            if ladder.est_height_m is None:
                continue

            db = self._db_pool.setdefault(
                ladder.id,
                Debounce(0.5, self.cfg.cooldown_sec)
            )

            if db.check(now, ladder.est_height_m >= self.cfg.ladder_height_limit_m):
                events.append(Event(
                    self.name, "medium", ladder.id, now,
                    {
                        "estimated_height_m": round(ladder.est_height_m, 2),
                        "limit_m":            self.cfg.ladder_height_limit_m,
                    }
                ))

        return events