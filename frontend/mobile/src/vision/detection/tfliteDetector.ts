import type { TensorflowModel } from 'react-native-fast-tflite';
import type { Detection } from '../types';
import { YOLO_CLASS_MAP, NUM_CLASSES } from './classes';

/**
 * TFLite YOLO 모델 추론 + 출력 파싱 + NMS
 *
 * ultralytics export 기본 출력 shape: [1, 4+numClasses, numDetections]
 * → column-major: feature 축이 먼저, detection 축이 나중
 * → cx/cy/w/h는 픽셀 좌표 (0~inputSize)
 */
export class TFLiteDetector {
  private model: TensorflowModel;
  private confThreshold: number;
  private iouThreshold: number;
  private inputSize: number;
  private isTransposed: boolean;
  private logged: boolean = false;

  constructor(
    model: TensorflowModel,
    confThreshold: number = 0.35,
    iouThreshold: number = 0.5,
    inputSize: number = 640,
  ) {
    this.model = model;
    this.confThreshold = confThreshold;
    this.iouThreshold = iouThreshold;
    this.inputSize = inputSize;

    // 모델 출력 shape에서 레이아웃 자동 감지
    const shape = model.outputs?.[0]?.shape;
    if (shape && shape.length === 3) {
      // shape[1] < shape[2] → [1, features, detections] → column-major (transposed)
      // shape[1] > shape[2] → [1, detections, features] → row-major
      this.isTransposed = shape[1] < shape[2];
      console.log(
        `[TFLiteDetector] 출력 shape: [${shape.join(', ')}], ` +
        `layout: ${this.isTransposed ? 'transposed [features, dets]' : 'row-major [dets, features]'}`,
      );
    } else {
      // shape 정보 없으면 ultralytics 기본값 (transposed) 사용
      this.isTransposed = true;
      console.log(`[TFLiteDetector] 출력 shape 감지 실패, transposed 기본값 사용`);
    }
  }

  detect(inputData: Float32Array): Detection[] {
    const outputs = this.model.runSync([inputData]);
    const rawOutput = outputs[0] as Float32Array;

    if (!this.logged) {
      console.log(
        `[TFLiteDetector] 출력 크기: ${rawOutput.length}, ` +
        `첫 20개: [${Array.from(rawOutput.slice(0, 20)).map(v => v.toFixed(3)).join(', ')}]`,
      );
      this.logged = true;
    }

    return this.parseOutput(rawOutput);
  }

  private parseOutput(output: Float32Array): Detection[] {
    const totalElements = output.length;
    const features = 4 + NUM_CLASSES;
    const numDetections = Math.round(totalElements / features);

    const detections: Detection[] = [];

    for (let i = 0; i < numDetections; i++) {
      let cx: number, cy: number, w: number, h: number;
      let maxScore = 0;
      let maxClassIdx = 0;

      if (this.isTransposed) {
        // column-major: [1, features, numDetections]
        // output[feature_idx * numDetections + det_idx]
        cx = output[0 * numDetections + i];
        cy = output[1 * numDetections + i];
        w = output[2 * numDetections + i];
        h = output[3 * numDetections + i];

        for (let c = 0; c < NUM_CLASSES; c++) {
          const score = output[(4 + c) * numDetections + i];
          if (score > maxScore) {
            maxScore = score;
            maxClassIdx = c;
          }
        }
      } else {
        // row-major: [1, numDetections, features]
        const offset = i * features;
        cx = output[offset];
        cy = output[offset + 1];
        w = output[offset + 2];
        h = output[offset + 3];

        for (let c = 0; c < NUM_CLASSES; c++) {
          const score = output[offset + 4 + c];
          if (score > maxScore) {
            maxScore = score;
            maxClassIdx = c;
          }
        }
      }

      if (maxScore < this.confThreshold) continue;

      const label = YOLO_CLASS_MAP[maxClassIdx];
      if (!label) continue;

      // 좌표 변환: 픽셀 좌표(>1.0)이면 그대로, 정규화(0~1)이면 inputSize 곱하기
      let x1: number, y1: number, x2: number, y2: number;
      if (cx > 1.0 || cy > 1.0) {
        // 픽셀 좌표 (ultralytics TFLite 기본)
        x1 = Math.round(cx - w / 2);
        y1 = Math.round(cy - h / 2);
        x2 = Math.round(cx + w / 2);
        y2 = Math.round(cy + h / 2);
      } else {
        // 정규화 좌표
        x1 = Math.round((cx - w / 2) * this.inputSize);
        y1 = Math.round((cy - h / 2) * this.inputSize);
        x2 = Math.round((cx + w / 2) * this.inputSize);
        y2 = Math.round((cy + h / 2) * this.inputSize);
      }

      // 범위 클램프
      x1 = Math.max(0, Math.min(this.inputSize, x1));
      y1 = Math.max(0, Math.min(this.inputSize, y1));
      x2 = Math.max(0, Math.min(this.inputSize, x2));
      y2 = Math.max(0, Math.min(this.inputSize, y2));

      if (x2 <= x1 || y2 <= y1) continue;

      detections.push({ label, bbox: [x1, y1, x2, y2], score: maxScore });
    }

    return this.nms(detections);
  }

  private nms(detections: Detection[]): Detection[] {
    // 라벨별 NMS
    const byLabel = new Map<string, Detection[]>();
    for (const d of detections) {
      const list = byLabel.get(d.label) || [];
      list.push(d);
      byLabel.set(d.label, list);
    }

    const result: Detection[] = [];
    for (const [, dets] of byLabel) {
      dets.sort((a, b) => b.score - a.score);
      const keep: Detection[] = [];

      for (const d of dets) {
        let suppressed = false;
        for (const k of keep) {
          if (computeIoU(d.bbox, k.bbox) > this.iouThreshold) {
            suppressed = true;
            break;
          }
        }
        if (!suppressed) keep.push(d);
      }

      result.push(...keep);
    }

    return result;
  }
}

function computeIoU(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = Math.max(1, areaA + areaB - inter);
  return inter / union;
}
