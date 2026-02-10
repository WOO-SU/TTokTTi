# vision/main.py
import time
import cv2

from vision_fullcam.config import Config
from vision_fullcam.stream.reader import FrameReader
from vision_fullcam.detection.yolo_detector import YoloDetector, Detection
from vision_fullcam.tracking.simple_tracker import SimpleTracker, Tracked
from vision_fullcam.state.state_buffer import StateBuffer
from vision_fullcam.rules.base import RuleContext
from vision_fullcam.rules.ppe_rules import HelmetNotWornRule, SafetyVestNotWornRule, SafetyShoesNotWornRule
from vision_fullcam.rules.worker_count import InsufficientWorkerCountRule
from vision_fullcam.rules.ladder_rules import LadderTiltRule, LadderMovementWithPersonRule
from vision_fullcam.rules.height_rule import HeightLadderViolationRule
from vision_fullcam.rules.ladder_rules import OuttriggerNotDeployedRule
from vision_fullcam.rules.posture_rules import ExcessiveBodyTiltRule, TopStepUsageRule
from vision_fullcam.events.clip_buffer import ClipBuffer
from vision_fullcam.events.emitter import EventEmitter

def main():
    cfg = Config()

    # (중요) cls_map은 너희 커스텀 YOLO 클래스 순서에 맞춰 수정
    cls_map = {
        0: "person",
        1: "ladder",
        2: "helmet",
        3: "safety_vest",
        4: "safety_shoes",
        5: "outtrigger",
    }

    reader = FrameReader(0)
    detector = YoloDetector("yolov8n.pt", cls_map=cls_map)
    tracker = SimpleTracker(iou_thr=0.3)
    state = StateBuffer()

    # 이벤트 버퍼/에미터
    clip_buf = ClipBuffer(fps=cfg.fps_monitor, keep_sec=cfg.clip_pre_sec + cfg.clip_post_sec)
    emitter = EventEmitter(out_dir="runs", clip_buffer=clip_buf)

    # 룰 등록 (원하는 순서)
    rules = [
        LadderTiltRule(cfg),
        LadderMovementWithPersonRule(cfg),
        InsufficientWorkerCountRule(cfg),
        HeightLadderViolationRule(cfg),
        OuttriggerNotDeployedRule(cfg),

        HelmetNotWornRule(cfg),
        SafetyVestNotWornRule(cfg),
        SafetyShoesNotWornRule(cfg),

        ExcessiveBodyTiltRule(cfg),   # pose 붙이면 활성
        TopStepUsageRule(cfg),        # pose 붙이면 활성
    ]

    # 작업 메타(앱에서 입력 받는 값들)
    meta = {
        "expected_height_m": 4.0,          # MVP 입력값
        "outtrigger_required": False,      # 작업 타입에 따라 True
    }

    # 추론 루프 속도 맞추기
    dt_target = 1.0 / max(1, cfg.fps_monitor)

    while True:
        t0 = time.time()
        frame = reader.read()
        if frame is None:
            break

        # 링버퍼 push
        clip_buf.push(frame)

        # detection
        dets = detector.detect(frame)

        # tracker input 만들기
        tracked_input = [Tracked(track_id=-1, label=d.label, bbox=d.bbox, score=d.score) for d in dets]
        tracked = tracker.update(tracked_input)

        now = time.time()
        state.update(tracked, now)

        # ★ PPE 히스토리 업데이트 (MVP용 매우 단순 버전)
        # 실제는 "사람 bbox 안에 헬멧/조끼/신발이 있는가"로 person별로 매칭해야 함.
        any_helmet = any(t.label == "helmet" for t in tracked.values())
        any_vest = any(t.label == "safety_vest" for t in tracked.values())
        any_shoes = any(t.label == "safety_shoes" for t in tracked.values())
        for p in state.persons.values():
            p.helmet_hist.append(any_helmet)
            p.vest_hist.append(any_vest)
            p.shoes_hist.append(any_shoes)

        ctx = RuleContext(timestamp=now, frame=frame, state=state, meta=meta)

        all_events = []
        for rule in rules:
            all_events.extend(rule.evaluate(ctx))

        if all_events:
            emitter.emit(all_events, frame)
            # 현장 경고는 여기서(진동/사운드/배너) 연결하면 됨
            for e in all_events:
                print(f"[EVENT] {e.label} severity={e.severity} target={e.target_id} info={e.info}")

        cv2.imshow("monitor", frame)
        if cv2.waitKey(1) == 27:
            break

        # fps 유지
        dt = time.time() - t0
        if dt < dt_target:
            time.sleep(dt_target - dt)

    reader.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
