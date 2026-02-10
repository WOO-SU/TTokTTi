# vision_fullcam/state/ppe_observer.py
from typing import Dict, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from vision_fullcam.state.person_state import PersonState
    from vision_fullcam.tracking.simple_tracker import Tracked

# bbox utils (state 안에서만 쓰는 내부 로직)
def center_in(box, roi):
    x1,y1,x2,y2 = box
    cx, cy = (x1+x2)/2.0, (y1+y2)/2.0
    X1,Y1,X2,Y2 = roi
    return (X1 <= cx <= X2) and (Y1 <= cy <= Y2)

def roi_head(pb):
    x1,y1,x2,y2 = pb; h = y2-y1
    return (x1, y1, x2, int(y1+0.35*h))

def roi_torso(pb):
    x1,y1,x2,y2 = pb; h = y2-y1
    return (x1, int(y1+0.20*h), x2, int(y1+0.75*h))

def roi_feet(pb):
    x1,y1,x2,y2 = pb; h = y2-y1
    return (x1, int(y1+0.70*h), x2, y2)

def iou(a,b):
    ax1,ay1,ax2,ay2=a; bx1,by1,bx2,by2=b
    ix1,iy1=max(ax1,bx1),max(ay1,by1)
    ix2,iy2=min(ax2,bx2),min(ay2,by2)
    iw,ih=max(0,ix2-ix1),max(0,iy2-iy1)
    inter=iw*ih
    area_a=max(0,ax2-ax1)*max(0,ay2-ay1)
    area_b=max(0,bx2-bx1)*max(0,by2-by1)
    union=max(1, area_a+area_b-inter)
    return inter/union

def roi_visible(roi, frame_w, frame_h, min_area_ratio=0.3):
    x1,y1,x2,y2 = roi
    ix1,iy1=max(0,x1),max(0,y1)
    ix2,iy2=min(frame_w,x2),min(frame_h,y2)
    iw,ih=max(0,ix2-ix1),max(0,iy2-iy1)
    inter=iw*ih
    area=max(1,(x2-x1)*(y2-y1))
    return (inter/area) >= min_area_ratio


class PPEObserver:
    """
    사람별 PPE 관측 전용 클래스
    - helmet / vest / shoes
    - feet_visible (shoes gate)
    - on_ladder (사다리 탑승 여부)
    """

    def update(
        self,
        persons: Dict[int, "PersonState"],
        tracked: Dict[int, "Tracked"],
        frame_shape: Tuple[int,int],
    ):
        h, w = frame_shape

        helmet_boxes = [t.bbox for t in tracked.values() if t.label == "helmet"]
        vest_boxes   = [t.bbox for t in tracked.values() if t.label == "safety_vest"]
        shoes_boxes  = [t.bbox for t in tracked.values() if t.label == "safety_shoes"]
        ladder_boxes = [t.bbox for t in tracked.values() if t.label == "ladder"]

        for p in persons.values():
            if p.bbox is None:
                continue

            head  = roi_head(p.bbox)
            torso = roi_torso(p.bbox)
            feet  = roi_feet(p.bbox)

            has_helmet = any(center_in(b, head) for b in helmet_boxes)
            has_vest   = any(center_in(b, torso) for b in vest_boxes)

            # 발이 프레임 안에 있는지 (shoes gate)
            feet_visible = roi_visible(feet, w, h, min_area_ratio=0.35)

            if feet_visible:
                has_shoes = any(center_in(b, feet) for b in shoes_boxes)
            else:
                has_shoes = True  # 판단 유예 (오탐 방지)

            # 히스토리 업데이트
            p.helmet_hist.append(has_helmet)
            p.vest_hist.append(has_vest)
            p.feet_visible_hist.append(feet_visible)
            p.shoes_hist.append(has_shoes)

            # 사다리 탑승 여부 (feet ROI 기준)
            on_ladder = False
            for lb in ladder_boxes:
                if iou(feet, lb) > 0.10:
                    on_ladder = True
                    break
            p.on_ladder_hist.append(on_ladder)
