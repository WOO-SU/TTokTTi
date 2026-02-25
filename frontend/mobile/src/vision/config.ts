export interface VisionConfig {
  // monitor fps (동적 조절의 초기값)
  fpsMonitor: number;

  // durations (sec)
  ppeMissingSec: number;
  workerMissingSec: number;
  ladderMoveSec: number;
  ladderUnstableSec: number;
  topStepSec: number;
  bodyTiltSec: number;
  outtriggerMissingSec: number;
  cooldownSec: number;

  // thresholds
  ladderMovePx: number;
  ladderUnstableCenterPx: number;
  ladderDangerCenterPx: number;
  ladderUnstableAspect: number;
  ladderDangerAspect: number;
  ladderUnstableAreaR: number;
  bodyTiltDeg: number;
  ladderHeightThresholdM: number;

  // detection
  confidenceThreshold: number;
}

export const DEFAULT_CONFIG: VisionConfig = {
  fpsMonitor: 7,

  ppeMissingSec: 2.0,
  workerMissingSec: 5.0,
  ladderMoveSec: 0.4,
  ladderUnstableSec: 1.0,
  topStepSec: 1.0,
  bodyTiltSec: 1.2,
  outtriggerMissingSec: 2.5,
  cooldownSec: 15.0,

  ladderMovePx: 8.0,
  ladderUnstableCenterPx: 8.0,
  ladderDangerCenterPx: 20.0,
  ladderUnstableAspect: 0.07,
  ladderDangerAspect: 0.20,
  ladderUnstableAreaR: 0.10,
  bodyTiltDeg: 35.0,
  ladderHeightThresholdM: 3.5,

  confidenceThreshold: 0.60,
};
