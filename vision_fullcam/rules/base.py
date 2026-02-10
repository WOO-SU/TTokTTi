# vision/rules/base.py
from dataclasses import dataclass
from typing import Dict, List, Optional
import time

@dataclass
class RuleContext:
    timestamp: float
    frame: "object"  # np.ndarray
    state: "object"  # StateBuffer
    task: "object"   # TaskState
    keypoints: Dict[str, any]  # keypoint dict (from movenet)

@dataclass
class Event:
    label: str
    severity: str
    target_id: Optional[int]
    ts: float
    info: dict

class Rule:
    name: str
    def evaluate(self, ctx: RuleContext) -> List[Event]:
        raise NotImplementedError

class Debounce: # 함수 추가 구현 필요함
    """
    condition이 duration만큼 참이면 fire.
    fire 이후 cooldown 동안 재발화 방지.
    """
    def __init__(self, duration_sec: float, cooldown_sec: float):
        self.duration = duration_sec
        self.cooldown = cooldown_sec
        self.start_ts: Optional[float] = None
        self.cool_until: float = 0.0

    def check(self, now: float, cond: bool) -> bool: # 조건 판별을 함수 내부에서 함
        if now < self.cool_until:
            return False
        if cond:
            if self.start_ts is None:
                self.start_ts = now
            if now - self.start_ts >= self.duration:
                self.start_ts = None
                self.cool_until = now + self.cooldown
                return True
        else:
            self.start_ts = None
        return False

    def hit(self, track_id: int, now: float) -> bool: # 조건 판별을 밖에서 한 후에 호출
        s = self.state.get(track_id)

        if s is None:
            self.state[track_id] = {
                "start": now,
                "last_fire": 0.0
            }
            return False

        # 쿨다운 중이면 무시
        if now - s["last_fire"] < self.cooldown_sec:
            return False

        # 연속 유지 시간 체크
        if now - s["start"] >= self.active_sec:
            s["last_fire"] = now
            s["start"] = now  # 재감지 방지
            return True

        return False
