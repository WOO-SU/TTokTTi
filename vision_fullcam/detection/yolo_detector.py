# vision/detection/yolo_detector.py
from dataclasses import dataclass
from typing import List, Tuple
from ultralytics import YOLO

@dataclass
class Detection:
    label: str
    bbox: Tuple[int, int, int, int]   # x1,y1,x2,y2
    score: float

class YoloDetector:
    """
    커스텀 모델이면 classes 매핑만 맞추면 됨.
    """
    def __init__(self, model_path: str, cls_map: dict[int, str], conf: float = 0.4, imgsz: int = 416):
        self.model = YOLO(model_path)
        self.cls_map = cls_map
        self.conf = conf
        self.imgsz = imgsz

    def detect(self, frame) -> List[Detection]:
        r = self.model(frame, conf=self.conf, imgsz=self.imgsz, verbose=False)[0]
        out: List[Detection] = []
        for xyxy, cls, conf in zip(r.boxes.xyxy, r.boxes.cls, r.boxes.conf):
            c = int(cls)
            label = self.cls_map.get(c, None)
            if label is None:
                continue
            x1, y1, x2, y2 = map(int, xyxy.tolist())
            out.append(Detection(label=label, bbox=(x1, y1, x2, y2), score=float(conf)))
        return out
