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
        
# vision_fullcam/rules/base.py (Debounce만 교체)

from typing import Optional, Dict

class Debounce:
    """
    condition이 duration만큼 참이면 fire.
    fire 이후 cooldown 동안 재발화 방지.

    - check(now, cond): (단일) 디바운스
    - setdefault(key, debounce): (key별) 디바운스 저장/획득
    - fire_immediate(now): 즉시 1회 발화 + cooldown 적용
    """
    def __init__(self, duration_sec: float, cooldown_sec: float):
        self.duration = duration_sec
        self.cooldown = cooldown_sec
        self.start_ts: Optional[float] = None
        self.cool_until: float = 0.0

        # key별로 디바운스를 들고 있을 수 있게(필요할 때만 사용)
        self._per_key: Dict[int, "Debounce"] = {}

    # --- 단일 디바운스 ---
    def check(self, now: float, cond: bool) -> bool:
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

    def fire_immediate(self, now: float) -> bool:
        if now < self.cool_until:
            return False
        self.start_ts = None
        self.cool_until = now + self.cooldown
        return True

    # --- key별 디바운스 ---
    def setdefault(self, key: int, db: "Debounce") -> "Debounce":
        if key not in self._per_key:
            self._per_key[key] = db
        return self._per_key[key]