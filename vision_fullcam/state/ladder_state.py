from collections import deque
import time
import numpy as np

class LadderState:
    def __init__(self, track_id: int):
        self.id = track_id
        self.last_seen = time.time()

        self.bbox_hist = deque(maxlen=60)
        self.tilt_hist = deque(maxlen=60)
        self.bbox = None

        self.height_m_hist = deque(maxlen=10)  # 추정된 사다리 높이(m) 히스토리
        self.top_step_zone: tuple | None = None
    
    @property
    def est_height_m(self):
        if not self.height_m_hist:
            return None
        return float(np.median(self.height_m_hist))
    
    def update_top_step_zone(self, top_ratio: float = 0.2):
        """
        bbox 기반으로 top step 영역(zone) 계산.
        top_ratio: 사다리 높이 대비 top step 높이 비율: 실제 테스트 후 조정 필요
        """
        if self.bbox is None:
            self.top_step_zone = None
            return

        x1, y1, x2, y2 = self.bbox
        height = y2 - y1
        top_y1 = y1
        top_y2 = y1 + height * top_ratio
        self.top_step_zone = (x1, top_y1, x2, top_y2)