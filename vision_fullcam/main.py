<<<<<<< Updated upstream
# vision_fullcam/main.py
import time
import cv2

from vision_fullcam.config import Config
from vision_fullcam.stream.reader import FrameReader

# detector
from vision_fullcam.detection.yolo_detector import YoloDetector
from vision_fullcam.detection.fake_detector import FakeDetector

# tracking / state
from vision_fullcam.tracking.simple_tracker import SimpleTracker, Tracked
from vision_fullcam.state.state_buffer import StateBuffer
from vision_fullcam.state.task_state import TaskState
from vision_fullcam.state.ppe_observer import PPEObserver

# rules
from vision_fullcam.rules.base import RuleContext
from vision_fullcam.rules.ppe_rules import (
    HelmetNotWornRule,
    SafetyVestNotWornRule,
    SafetyShoesNotWornRule,
)
from vision_fullcam.rules.worker_count import InsufficientWorkerCountRule
from vision_fullcam.rules.ladder_rules import (
    LadderTiltRule,
    LadderMovementWithPersonRule,
)
from vision_fullcam.rules.height_rule import HeightLadderViolationRule
from vision_fullcam.rules.outtrigger_not_deployed import OuttriggerNotDeployedRule
from vision_fullcam.rules.posture_rules import (
    ExcessiveBodyTiltRule,
    TopStepUsageRule,
)

# events
from vision_fullcam.events.clip_buffer import ClipBuffer
from vision_fullcam.events.emitter import EventEmitter


def build_detector(cfg: Config):
    """운영/테스트 스위치"""
    if getattr(cfg, "use_fake_detector", True):
        return FakeDetector(fps=cfg.fps_monitor)

    cls_map = {
        0: "person",
        1: "ladder",
        2: "helmet",
        3: "safety_vest",
        4: "safety_shoes",
        5: "outtrigger",
    }
    return YoloDetector(getattr(cfg, "yolo_model_path", "yolov8n.pt"), cls_map=cls_map)


def _handle_keys(detector, task: TaskState, key: int):
    """
    FakeDetector 테스트 모드 키 입력 처리
    - 창(영상 창) 클릭해서 포커스 준 뒤 키를 눌러야 먹음.
    """
    if key in (-1, 255):
        return

    if key == 27:  # ESC
        raise KeyboardInterrupt

    # FakeDetector만 모드 전환 지원
    if not isinstance(detector, FakeDetector):
        return

    # 0~8: 모드 전환
    mapping = {
        ord("0"): ("normal",             "normal"),
        ord("1"): ("no_helmet",          "no_helmet (2s -> helmet_not_worn)"),
        ord("2"): ("no_vest",            "no_vest   (2s -> safety_vest_not_worn)"),
        ord("3"): ("no_shoes",           "no_shoes  (2s -> safety_shoes_not_worn)"),
        ord("4"): ("one_person",         "one_person(5s -> insufficient_worker_count)"),
        ord("5"): ("ladder_move",        "ladder_move(-> ladder_movement_with_person)"),
        ord("6"): ("tilted_ladder",      "tilted_ladder(1s -> ladder_tilt)"),
        ord("7"): ("outtrigger_missing", "outtrigger_missing(2.5s -> outtrigger_not_deployed, task required=True)"),
        ord("8"): ("outtrigger_deployed","outtrigger_deployed(정상 상태)"),
    }

    if key in mapping:
        mode, desc = mapping[key]
        detector.set_mode(mode)
        print(f"[MODE] {desc}")
        return

    # (옵션) outtrigger_required 토글: t 키
    if key == ord("t"):
        task.outtrigger_required = not bool(getattr(task, "outtrigger_required", False))
        print(f"[TASK] outtrigger_required={task.outtrigger_required}")
        return

    # (옵션) expected_height 토글: h 키 (height 룰 테스트용)
    if key == ord("h"):
        # 낮음(2.0) <-> 높음(4.0) 토글
        cur = float(getattr(task, "expected_height_m", 0.0) or 0.0)
        task.expected_height_m = 4.0 if cur < 3.5 else 2.0
        print(f"[TASK] expected_height_m={task.expected_height_m}")
        return


def main():
    cfg = Config()

    # ========================
    # 입력 / 추론 파이프라인
    # ========================
    reader = FrameReader(getattr(cfg, "camera_index", 0))
    detector = build_detector(cfg)
    tracker = SimpleTracker(iou_thr=getattr(cfg, "tracker_iou_thr", 0.3))

    state = StateBuffer()
    ppe_observer = PPEObserver()

    # ========================
    # 작업(Task) 상태 (앱 입력)
    # ========================
    task = TaskState(
        work_mode=getattr(cfg, "work_mode", "ladder"),
        expected_height_m=float(getattr(cfg, "expected_height_m", 2.0) or 0.0),
        outtrigger_required=bool(getattr(cfg, "outtrigger_required", False)),
    )
    task.start()

    # ========================
    # 이벤트 시스템
    # ========================
    clip_buffer = ClipBuffer(
        fps=cfg.fps_monitor,
        keep_sec=cfg.clip_pre_sec + cfg.clip_post_sec,
    )
    emitter = EventEmitter(
        out_dir=getattr(cfg, "output_dir", "runs"),
        clip_buffer=clip_buffer,
    )

    # ========================
    # 룰 등록 (공용)
    # ========================
    rules = [
        # ladder / height
        HeightLadderViolationRule(cfg),
        LadderMovementWithPersonRule(cfg),
        LadderTiltRule(cfg),
        OuttriggerNotDeployedRule(cfg),

        # PPE
        HelmetNotWornRule(cfg),
        SafetyVestNotWornRule(cfg),
        SafetyShoesNotWornRule(cfg),

        # people
        InsufficientWorkerCountRule(cfg),

        # posture (pose 붙이면 활성)
        ExcessiveBodyTiltRule(cfg),
        TopStepUsageRule(cfg),
    ]

    if isinstance(detector, FakeDetector):
        print("=== FakeDetector Test Keys ===")
        print("0: normal")
        print("1: no_helmet (2s -> helmet_not_worn)")
        print("2: no_vest   (2s -> safety_vest_not_worn)")
        print("3: no_shoes  (2s -> safety_shoes_not_worn)")
        print("4: one_person(5s -> insufficient_worker_count)")
        print("5: ladder_move (-> ladder_movement_with_person)")
        print("6: tilted_ladder (1s -> ladder_tilt)")
        print("7: outtrigger_missing (2.5s -> outtrigger_not_deployed, task required=True)")
        print("8: outtrigger_deployed (정상 상태)")
        print("t: toggle outtrigger_required")
        print("h: toggle expected_height_m (2.0 <-> 4.0)")
        print("ESC: quit")

    # ========================
    # 메인 루프
    # ========================
    dt_target = 1.0 / max(1, cfg.fps_monitor)

    try:
        while True:
            t0 = time.time()
            frame = reader.read()
            if frame is None:
                break

            clip_buffer.push(frame)

            # 1) detection
            detections = detector.detect(frame)

            # 2) tracking
            tracked_input = [
                Tracked(track_id=-1, label=d.label, bbox=d.bbox, score=d.score)
                for d in detections
            ]
            tracked = tracker.update(tracked_input)

            # 3) state update
            now = time.time()
            state.update(tracked,frame, now)

            # 4) PPE / ladder observer (state 채움)
            ppe_observer.update(
                persons=state.persons,
                tracked=tracked,
                frame_shape=frame.shape[:2],
            )

            # 5) rule context
            ctx = RuleContext(timestamp=now, frame=frame, state=state, task=task)

            # 6) rule evaluation
            events = []
            for rule in rules:
                events.extend(rule.evaluate(ctx))

            # 7) emit
            if events:
                emitter.emit(events, frame)
                for e in events:
                    print(
                        f"[EVENT] {e.label} "
                        f"sev={e.severity} "
                        f"target={e.target_id} "
                        f"info={e.info}"
                    )

            # 8) monitor + key handling (키는 여기서 딱 1번만 읽음)
            if getattr(cfg, "show_window", True):
                cv2.imshow("vision_fullcam", frame)

            key = cv2.waitKey(1) & 0xFF
            _handle_keys(detector, task, key)

            # fps sync
            dt = time.time() - t0
            if dt < dt_target:
                time.sleep(dt_target - dt)

    except KeyboardInterrupt:
        pass
    finally:
        reader.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
=======
# vision_fullcam/main.py
import time
import cv2

from vision_fullcam.config import Config
from vision_fullcam.stream.reader import FrameReader

# detector
from vision_fullcam.detection.yolo_detector import YoloDetector
from vision_fullcam.detection.fake_detector import FakeDetector

# tracking / state
from vision_fullcam.tracking.simple_tracker import SimpleTracker, Tracked
from vision_fullcam.state.state_buffer import StateBuffer
from vision_fullcam.state.task_state import TaskState
from vision_fullcam.state.ppe_observer import PPEObserver

# rules
from vision_fullcam.rules.base import RuleContext
from vision_fullcam.rules.ppe_rules import (
    HelmetNotWornRule,
    SafetyVestNotWornRule,
    SafetyShoesNotWornRule,
)
from vision_fullcam.rules.worker_count import InsufficientWorkerCountRule
from vision_fullcam.rules.ladder_rules import (
    LadderTiltRule,
    LadderMovementWithPersonRule,
)
from vision_fullcam.rules.height_rule import HeightLadderViolationRule
from vision_fullcam.rules.outtrigger_not_deployed import OuttriggerNotDeployedRule
from vision_fullcam.rules.posture_rules import (
    ExcessiveBodyTiltRule,
    TopStepUsageRule,
)

# events
from vision_fullcam.events.clip_buffer import ClipBuffer
from vision_fullcam.events.emitter import EventEmitter


def build_detector(cfg: Config):
    """운영/테스트 스위치"""
    if getattr(cfg, "use_fake_detector", True):
        return FakeDetector(fps=cfg.fps_monitor)

    cls_map = {
        0: "person",
        1: "ladder",
        2: "helmet",
        3: "safety_vest",
        4: "safety_shoes",
        5: "outtrigger",
    }
    return YoloDetector(getattr(cfg, "yolo_model_path", "yolov8n.pt"), cls_map=cls_map)


def _handle_keys(detector, task: TaskState, key: int):
    """
    FakeDetector 테스트 모드 키 입력 처리
    - 창(영상 창) 클릭해서 포커스 준 뒤 키를 눌러야 먹음.
    """
    if key in (-1, 255):
        return

    if key == 27:  # ESC
        raise KeyboardInterrupt

    # FakeDetector만 모드 전환 지원
    if not isinstance(detector, FakeDetector):
        return

    # 0~8: 모드 전환
    mapping = {
        ord("0"): ("normal",             "normal"),
        ord("1"): ("no_helmet",          "no_helmet (2s -> helmet_not_worn)"),
        ord("2"): ("no_vest",            "no_vest   (2s -> safety_vest_not_worn)"),
        ord("3"): ("no_shoes",           "no_shoes  (2s -> safety_shoes_not_worn)"),
        ord("4"): ("one_person",         "one_person(5s -> insufficient_worker_count)"),
        ord("5"): ("ladder_move",        "ladder_move(-> ladder_movement_with_person)"),
        ord("6"): ("tilted_ladder",      "tilted_ladder(1s -> ladder_tilt)"),
        ord("7"): ("outtrigger_missing", "outtrigger_missing(2.5s -> outtrigger_not_deployed, task required=True)"),
        ord("8"): ("outtrigger_deployed","outtrigger_deployed(정상 상태)"),
    }

    if key in mapping:
        mode, desc = mapping[key]
        detector.set_mode(mode)
        print(f"[MODE] {desc}")
        return

    # (옵션) outtrigger_required 토글: t 키
    if key == ord("t"):
        task.outtrigger_required = not bool(getattr(task, "outtrigger_required", False))
        print(f"[TASK] outtrigger_required={task.outtrigger_required}")
        return

    # (옵션) expected_height 토글: h 키 (height 룰 테스트용)
    if key == ord("h"):
        # 낮음(2.0) <-> 높음(4.0) 토글
        cur = float(getattr(task, "expected_height_m", 0.0) or 0.0)
        task.expected_height_m = 4.0 if cur < 3.5 else 2.0
        print(f"[TASK] expected_height_m={task.expected_height_m}")
        return


def main():
    cfg = Config()

    # ========================
    # 입력 / 추론 파이프라인
    # ========================
    reader = FrameReader(getattr(cfg, "camera_index", 0))
    detector = build_detector(cfg)
    tracker = SimpleTracker(iou_thr=getattr(cfg, "tracker_iou_thr", 0.3))

    state = StateBuffer()
    ppe_observer = PPEObserver()

    # ========================
    # 작업(Task) 상태 (앱 입력)
    # ========================
    task = TaskState(
        work_mode=getattr(cfg, "work_mode", "ladder"),
        expected_height_m=float(getattr(cfg, "expected_height_m", 2.0) or 0.0),
        outtrigger_required=bool(getattr(cfg, "outtrigger_required", False)),
    )
    task.start()

    # ========================
    # 이벤트 시스템
    # ========================
    clip_buffer = ClipBuffer(
        fps=cfg.fps_monitor,
        keep_sec=cfg.clip_pre_sec + cfg.clip_post_sec,
    )
    emitter = EventEmitter(
        out_dir=getattr(cfg, "output_dir", "data"),
        clip_buffer=clip_buffer,
    )

    # ========================
    # 룰 등록 (공용)
    # ========================
    rules = [
        # ladder / height
        HeightLadderViolationRule(cfg),
        LadderMovementWithPersonRule(cfg),
        LadderTiltRule(cfg),
        OuttriggerNotDeployedRule(cfg),

        # PPE
        HelmetNotWornRule(cfg),
        SafetyVestNotWornRule(cfg),
        SafetyShoesNotWornRule(cfg),

        # people
        InsufficientWorkerCountRule(cfg),

        # posture (pose 붙이면 활성)
        ExcessiveBodyTiltRule(cfg),
        TopStepUsageRule(cfg),
    ]

    if isinstance(detector, FakeDetector):
        print("=== FakeDetector Test Keys ===")
        print("0: normal")
        print("1: no_helmet (2s -> helmet_not_worn)")
        print("2: no_vest   (2s -> safety_vest_not_worn)")
        print("3: no_shoes  (2s -> safety_shoes_not_worn)")
        print("4: one_person(5s -> insufficient_worker_count)")
        print("5: ladder_move (-> ladder_movement_with_person)")
        print("6: tilted_ladder (1s -> ladder_tilt)")
        print("7: outtrigger_missing (2.5s -> outtrigger_not_deployed, task required=True)")
        print("8: outtrigger_deployed (정상 상태)")
        print("t: toggle outtrigger_required")
        print("h: toggle expected_height_m (2.0 <-> 4.0)")
        print("ESC: quit")

    # ========================
    # 메인 루프
    # ========================
    dt_target = 1.0 / max(1, cfg.fps_monitor)

    try:
        while True:
            t0 = time.time()
            frame = reader.read()
            if frame is None:
                break

            clip_buffer.push(frame)

            # 1) detection
            detections = detector.detect(frame)

            # 2) tracking
            tracked_input = [
                Tracked(track_id=-1, label=d.label, bbox=d.bbox, score=d.score)
                for d in detections
            ]
            tracked = tracker.update(tracked_input)

            # 3) state update
            now = time.time()
            state.update(tracked,frame, now)

            # 4) PPE / ladder observer (state 채움)
            ppe_observer.update(
                persons=state.persons,
                tracked=tracked,
                frame_shape=frame.shape[:2],
            )

            # 5) rule context
            ctx = RuleContext(timestamp=now, frame=frame, state=state, task=task)

            # 6) rule evaluation
            events = []
            for rule in rules:
                events.extend(rule.evaluate(ctx))

            # 7) emit
            if events:
                emitter.emit(events, frame)
                for e in events:
                    print(
                        f"[EVENT] {e.label} "
                        f"sev={e.severity} "
                        f"target={e.target_id} "
                        f"info={e.info}"
                    )

            # 8) monitor + key handling (키는 여기서 딱 1번만 읽음)
            if getattr(cfg, "show_window", True):
                cv2.imshow("vision_fullcam", frame)

            key = cv2.waitKey(1) & 0xFF
            _handle_keys(detector, task, key)

            # fps sync
            dt = time.time() - t0
            if dt < dt_target:
                time.sleep(dt_target - dt)

    except KeyboardInterrupt:
        pass
    finally:
        reader.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
>>>>>>> Stashed changes
