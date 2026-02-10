# vision/state/person_state.py
from collections import deque
import time

class PersonState:
    def __init__(self, track_id: int):
        self.id = track_id
        self.last_seen = time.time()

        # 최근 프레임 히스토리(BOOL)
        self.helmet_hist = deque(maxlen=120)
        self.vest_hist = deque(maxlen=120)
        self.shoes_hist = deque(maxlen=120)

        # 발이 프레임 안 조건
        self.feet_visible_hist=deque(maxlen=120)

        # 사다리 탑승 여부
        self.on_ladder_hist=deque(maxlen=120)

        # 포즈, 각도 -> MoveNet 넣을 자리
        self.pose_hist = deque(maxlen=60)  # dict of keypoints

        # 현재 bbox
        self.bbox = None
