import { useState, useEffect } from 'react';
import {
  loadTensorflowModel,
  type TensorflowModel,
} from 'react-native-fast-tflite';

export interface ModelState {
  yoloModel: TensorflowModel | null;
  movenetModel: TensorflowModel | null;
  loading: boolean;
  error: string | null;
}

/**
 * TFLite 모델 로딩 훅.
 * NNAPI delegate로 Android GPU/NPU 가속.
 */
export function useModelLoader(): ModelState {
  const [state, setState] = useState<ModelState>({
    yoloModel: null,
    movenetModel: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const [yolo, movenet] = await Promise.all([
          loadTensorflowModel(
            require('../../../assets/models/best.tflite'),
            'nnapi',
          ),
          loadTensorflowModel(
            require('../../../assets/models/movenet_lightning.tflite'),
            'nnapi',
          ),
        ]);

        if (!cancelled) {
          setState({ yoloModel: yolo, movenetModel: movenet, loading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          // NNAPI 실패 시 기본 CPU delegate로 재시도
          try {
            const [yolo, movenet] = await Promise.all([
              loadTensorflowModel(
                require('../../../assets/models/best.tflite'),
                'default',
              ),
              loadTensorflowModel(
                require('../../../assets/models/movenet_lightning.tflite'),
                'default',
              ),
            ]);

            if (!cancelled) {
              setState({ yoloModel: yolo, movenetModel: movenet, loading: false, error: null });
            }
          } catch (fallbackErr) {
            if (!cancelled) {
              setState({
                yoloModel: null,
                movenetModel: null,
                loading: false,
                error: `모델 로딩 실패: ${fallbackErr}`,
              });
            }
          }
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
