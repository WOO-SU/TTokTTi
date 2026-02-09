# vision/tracking/simple_tracker.py
from dataclasses import dataclass
from typing import Dict, List, Tuple
import math

@dataclass
class Tracked:
    track_id: int
    label: str
    bbox: Tuple[int,int,int,int]
    score: float

def iou(a, b) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2-ix1), max(0, iy2-iy1)
    inter = iw*ih
    area_a = (ax2-ax1)*(ay2-ay1)
    area_b = (bx2-bx1)*(by2-by1)
    union = max(1, area_a + area_b - inter)
    return inter/union

class SimpleTracker:
    """
    IoU 기반. MVP에서는 충분.
    사람이 많아지면 ByteTrack으로 교체(인터페이스 유지).
    """
    def __init__(self, iou_thr: float = 0.3):
        self.iou_thr = iou_thr
        self.next_id = 1
        self.prev: Dict[int, Tracked] = {}

    def update(self, detections: List[Tracked]) -> Dict[int, Tracked]:
        # label별로 매칭
        new_prev: Dict[int, Tracked] = {}
        used = set()

        for tid, prev_t in self.prev.items():
            best_j, best_iou = None, 0.0
            for j, d in enumerate(detections):
                if j in used: 
                    continue
                if d.label != prev_t.label:
                    continue
                s = iou(prev_t.bbox, d.bbox)
                if s > best_iou:
                    best_iou = s
                    best_j = j
            if best_j is not None and best_iou >= self.iou_thr:
                used.add(best_j)
                d = detections[best_j]
                new_prev[tid] = Tracked(tid, d.label, d.bbox, d.score)

        # 신규 트랙 부여
        for j, d in enumerate(detections):
            if j in used: 
                continue
            tid = self.next_id
            self.next_id += 1
            new_prev[tid] = Tracked(tid, d.label, d.bbox, d.score)

        self.prev = new_prev
        return new_prev
