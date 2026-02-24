# vision/rules/base.py
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
import time

@dataclass
class RuleContext:
    timestamp: float
    frame: "object"  # np.ndarray
    state: "object"  # StateBuffer
    task: "object"   # TaskState
    keypoints_map: Dict[int, Dict[str, Any]] = field(default_factory=dict)

@dataclass
class Event:
    label: str
    severity: str
    target_id: Optional[int]
    ts: float
    info: dict

class Rule:
    name: str
    def is_active(self, ctx: RuleContext) -> bool:
        return False
    
    def evaluate(self, ctx: RuleContext) -> List[Event]:
        raise NotImplementedError
    
        
# vision_fullcam/rules/base.py (Debounce만 교체)

from typing import Optional, Dict

class Debounce:
    """
    condition이 duration만큼 참이면 fire.
    fire 이후 cooldown 동안 재발화 방지.

    사용 패턴:
        # 단일 인스턴스
        db = Debounce(2.0, 5.0)
        if db.check(now, some_condition):
            ...

        # 키별 독립 관리 (per-person, per-ladder 등)
        db_pool = Debounce(0, 0)   # 컨테이너 역할
        db = db_pool.setdefault(key, Debounce(2.0, 5.0))
        if db.check(now, cond):
            ...

        # 조건 충족 즉시 1회 발화
        if db.fire_immediate(now):
            ...
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
            if not cond:
                self.start_ts = None
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
    
    def reset(self) -> None:
        """start_ts 초기화 (조건이 끊겼을 때 명시적으로 리셋)."""
        self.start_ts = None

    # --- key별 디바운스 ---
    def setdefault(self, key: int, db: "Debounce") -> "Debounce":
        if key not in self._per_key:
            self._per_key[key] = db
        return self._per_key[key]

    def remove(self, key: int) -> None:
        """트래킹이 끊긴 객체의 상태 정리."""
        self._per_key.pop(key, None)