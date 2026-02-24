import type { TensorflowModel } from 'react-native-fast-tflite';
import type { Detection } from '../types';
import { YOLO_CLASS_MAP, NUM_CLASSES } from './classes';

/**
 * TFLite YOLO 모델 추론 + 출력 파싱 + NMS
 *
 * ultralytics export 시 TFLite 출력 형태:
 * - output shape: [1, numDetections, 4+numClasses]  (transposed)
 *   각 detection: [x_center, y_center, w, h, cls0_score, cls1_score, ...]
 */
export class TFLiteDetector {
  private model: TensorflowModel;
  private confThreshold: number;
  private iouThreshold: number;
  private inputSize: number;

  constructor(
    model: TensorflowModel,
    confThreshold: number = 0.35,
    iouThreshold: number = 0.5,
    inputSize: number = 416,
  ) {
    this.model = model;
    this.confThreshold = confThreshold;
    this.iouThreshold = iouThreshold;
    this.inputSize = inputSize;
  }

  detect(inputData: Float32Array): Detection[] {
    const outputs = this.model.runSync([inputData]);
    const rawOutput = outputs[0] as Float32Array;
    return this.parseOutput(rawOutput);
  }

  private parseOutput(output: Float32Array): Detection[] {
    // ultralytics TFLite output: [1, 4+numClasses, numDetections] → transposed
    // 실제 shape는 모델에 따라 다를 수 있으므로, 두 형태 모두 처리
    const totalElements = output.length;
    const cols = 4 + NUM_CLASSES; // 10 = 4 + 6
    const numDetections = totalElements / cols;

    if (!Number.isInteger(numDetections)) {
      // transposed format: [1, cols, numDetections]
      return this.parseTransposedOutput(output);
    }

    const detections: Detection[] = [];

    for (let i = 0; i < numDetections; i++) {
      const offset = i * cols;
      const cx = output[offset];
      const cy = output[offset + 1];
      const w = output[offset + 2];
      const h = output[offset + 3];

      let maxScore = 0;
      let maxClassIdx = 0;
      for (let c = 0; c < NUM_CLASSES; c++) {
        const score = output[offset + 4 + c];
        if (score > maxScore) {
          maxScore = score;
          maxClassIdx = c;
        }
      }

      if (maxScore < this.confThreshold) continue;

      const label = YOLO_CLASS_MAP[maxClassIdx];
      if (!label) continue;

      const x1 = Math.round((cx - w / 2) * this.inputSize);
      const y1 = Math.round((cy - h / 2) * this.inputSize);
      const x2 = Math.round((cx + w / 2) * this.inputSize);
      const y2 = Math.round((cy + h / 2) * this.inputSize);

      detections.push({ label, bbox: [x1, y1, x2, y2], score: maxScore });
    }

    return this.nms(detections);
  }

  private parseTransposedOutput(output: Float32Array): Detection[] {
    // ultralytics default: [1, 4+numClasses, numDetections]
    // 데이터는 flatten 되어 있음
    const totalElements = output.length;
    // numDetections = totalElements / (4 + NUM_CLASSES) 가 안 맞으면
    // transposed로 간주: numDetections = totalElements / cols where cols might differ
    // 가장 흔한 형태: [numDetections, cols]
    const cols = 4 + NUM_CLASSES;
    const rows = Math.floor(totalElements / cols);

    // 더 큰 차원이 numDetections (보통 >100)
    const numDetections = rows > cols ? rows : Math.floor(totalElements / rows);
    const actualCols = rows > cols ? cols : rows;

    const detections: Detection[] = [];

    for (let i = 0; i < numDetections; i++) {
      let cx: number, cy: number, w: number, h: number;

      if (rows > cols) {
        // row-major: [numDetections, cols]
        const offset = i * actualCols;
        cx = output[offset];
        cy = output[offset + 1];
        w = output[offset + 2];
        h = output[offset + 3];

        let maxScore = 0;
        let maxClassIdx = 0;
        for (let c = 0; c < NUM_CLASSES; c++) {
          const score = output[offset + 4 + c];
          if (score > maxScore) {
            maxScore = score;
            maxClassIdx = c;
          }
        }

        if (maxScore < this.confThreshold) continue;

        const label = YOLO_CLASS_MAP[maxClassIdx];
        if (!label) continue;

        const x1 = Math.round((cx - w / 2) * this.inputSize);
        const y1 = Math.round((cy - h / 2) * this.inputSize);
        const x2 = Math.round((cx + w / 2) * this.inputSize);
        const y2 = Math.round((cy + h / 2) * this.inputSize);

        detections.push({ label, bbox: [x1, y1, x2, y2], score: maxScore });
      } else {
        // column-major transposed: [cols, numDetections]
        cx = output[0 * numDetections + i];
        cy = output[1 * numDetections + i];
        w = output[2 * numDetections + i];
        h = output[3 * numDetections + i];

        let maxScore = 0;
        let maxClassIdx = 0;
        for (let c = 0; c < NUM_CLASSES; c++) {
          const score = output[(4 + c) * numDetections + i];
          if (score > maxScore) {
            maxScore = score;
            maxClassIdx = c;
          }
        }

        if (maxScore < this.confThreshold) continue;

        const label = YOLO_CLASS_MAP[maxClassIdx];
        if (!label) continue;

        const x1 = Math.round((cx - w / 2) * this.inputSize);
        const y1 = Math.round((cy - h / 2) * this.inputSize);
        const x2 = Math.round((cx + w / 2) * this.inputSize);
        const y2 = Math.round((cy + h / 2) * this.inputSize);

        detections.push({ label, bbox: [x1, y1, x2, y2], score: maxScore });
      }
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
