# vision_fullcam/state/task_state.py
# 작업 높이 ? -> 사람이 입력해줘야함 
# 아웃트리거 필요한지 -> 작업 높이로 결정나니까 여기서 입력해줘야함 
from dataclasses import dataclass
import time

@dataclass
class TaskState:
    # 작업 시작 시 입력(또는 작업 타입 선택)
    expected_height_m: float = 0.0
    outtrigger_required: bool = False
    work_mode: str = "unknown"  # "ladder" / "boomlift" / ...

    # 세션 관리(선택)
    started_at: float = 0.0

    def start(self):
        self.started_at = time.time()
