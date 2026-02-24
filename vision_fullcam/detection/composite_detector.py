from typing import List
from .yolo_detector import Detection

class CompositeDetector:
    def __init__(self, detectors):
        self.detectors = detectors

    def detect(self, frame) -> List[Detection]:
        out: List[Detection] = []
        for d in self.detectors:
            out.extend(d.detect(frame))
        return out