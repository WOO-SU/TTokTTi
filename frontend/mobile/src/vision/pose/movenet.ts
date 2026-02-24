import type { TensorflowModel } from 'react-native-fast-tflite';
import type { BBox, Keypoint, PoseResult } from '../types';

export const KEYPOINT_NAMES = [
  'nose',
  'left_eye', 'right_eye',
  'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
] as const;

const INPUT_SIZE = 192;

/**
 * MoveNet Lightning TFLite 포즈 추정.
 * Python pose/movenet.py PoseEstimator 포팅.
 */
export class PoseEstimator {
  private model: TensorflowModel;

  constructor(model: TensorflowModel) {
    this.model = model;
  }

  /**
   * person bbox 영역에 대해 포즈 추정.
   * 프레임 전체가 아닌, 크롭된 person 영역 데이터를 받음.
   *
   * @param cropData - 192x192x3 Float32Array (0~1 정규화)
   * @param personBbox - 원본 프레임에서의 person bbox [x1,y1,x2,y2]
   * @returns PoseResult
   */
  infer(cropData: Float32Array, personBbox: BBox): PoseResult | null {
    if (cropData.length !== INPUT_SIZE * INPUT_SIZE * 3) return null;

    const outputs = this.model.runSync([cropData]);
    const rawKps = outputs[0] as Float32Array;

    // MoveNet output: [1, 1, 17, 3] → flatten = 51 floats
    if (rawKps.length < 51) return null;

    const [x1, y1, x2, y2] = personBbox;
    const kpDict: Record<string, Keypoint> = {};

    for (let i = 0; i < 17; i++) {
      const y = rawKps[i * 3]; // normalized y (0~1)
      const x = rawKps[i * 3 + 1]; // normalized x (0~1)
      const score = rawKps[i * 3 + 2];

      kpDict[KEYPOINT_NAMES[i]] = {
        x: x1 + x * (x2 - x1),
        y: y1 + y * (y2 - y1),
        score,
      };
    }

    const bodyTilt = this.computeBodyTilt(kpDict);
    const torsoVec = this.torsoVector(kpDict);

    return {
      keypoints: kpDict,
      bodyTiltDeg: bodyTilt,
      torsoVector: torsoVec,
    };
  }

  private torsoVector(kp: Record<string, Keypoint>): [number, number] {
    const ls = kp.left_shoulder;
    const rs = kp.right_shoulder;
    const lh = kp.left_hip;
    const rh = kp.right_hip;

    const sx = (ls.x + rs.x) / 2;
    const sy = (ls.y + rs.y) / 2;
    const hx = (lh.x + rh.x) / 2;
    const hy = (lh.y + rh.y) / 2;

    return [hx - sx, hy - sy];
  }

  private computeBodyTilt(kp: Record<string, Keypoint>): number | null {
    const ls = kp.left_shoulder;
    const rs = kp.right_shoulder;
    const lh = kp.left_hip;
    const rh = kp.right_hip;

    if (
      Math.min(ls.score, rs.score, lh.score, rh.score) < 0.4
    ) {
      return null;
    }

    const [vx, vy] = this.torsoVector(kp);
    if (vy === 0) return 0;
    return Math.abs((Math.atan2(Math.abs(vx), Math.abs(vy)) * 180) / Math.PI);
  }
}
