/* 현장 촬영 화면 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from 'react-native-vision-camera';
import BaseCamera from '../components/BaseCamera';
import RNFS from 'react-native-fs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';

import SafetyStream, { StreamResponse } from '../api/stream';
import { useVisionEngine } from '../vision/hooks/useVisionEngine';
import type { SafetyEvent } from '../vision/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

/* ──────── Configuration ──────── */

const STREAM_CONFIG = {
  WIDTH: 480,
  HEIGHT: 480,
  INTERVAL_MS: 1000,
};

const SEVERITY_COLORS: Record<string, string> = {
  high: '#FF3B30',
  medium: '#FF9500',
  low: '#FFCC00',
};

const SEVERITY_LABELS: Record<string, string> = {
  helmet_not_worn: '안전모 미착용',
  safety_vest_not_worn: '안전조끼 미착용',
  safety_shoes_not_worn: '안전화 미착용',
  insufficient_worker_count: '작업자 부족',
  ladder_tilt: '사다리 기울기 위험',
  ladder_movement_with_person: '사다리 이동 위험',
  height_ladder_violation: '사다리 높이 초과',
  outtrigger_not_deployed: '아웃트리거 미설치',
  excessive_body_tilt: '과도한 몸 기울기',
  top_step_usage: '최상단 발판 사용',
};

/* ──────── Main Component ──────── */

export default function CameraScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { mode } = route.params;
  const isFullCam = mode === 'all';

  // 스트리밍 설정 기반 포맷 선택
  const device = useCameraDevice('back');
  const streamFormat = useCameraFormat(device, [
    { videoResolution: { width: STREAM_CONFIG.WIDTH, height: STREAM_CONFIG.HEIGHT } },
  ]);

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<string>('medium');

  // Vision Engine (mode=all 전용)
  const vision = useVisionEngine();
  const [visionStatus, setVisionStatus] = useState<string>('');

  // Refs
  const cameraRef = useRef<Camera>(null);
  const streamRef = useRef<SafetyStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // mode=worker: 기존 WebSocket 스트리밍
  useEffect(() => {
    if (isFullCam) return;

    const userId = 'AuthContext_user_id';

    streamRef.current = new SafetyStream(userId, (data: StreamResponse) => {
      if (data.type === 'DANGER') {
        setAlertMessage(data.message || '위험이 감지되었습니다!');
        setAlertSeverity('high');
        setAlertVisible(true);
      } else if (data.type === 'ANSWER') {
        Alert.alert('AI Assistant', data.message);
      }
    });

    streamRef.current.connect();

    intervalRef.current = setInterval(async () => {
      if (cameraRef.current && streamRef.current) {
        try {
          const photo = await cameraRef.current.takePhoto({
            flash: 'off',
            enableShutterSound: false,
          });
          const base64 = await RNFS.readFile(photo.path, 'base64');
          streamRef.current.sendFrame(base64);
        } catch (err) {
          console.log('Frame capture error (expected if camera not ready)');
        }
      }
    }, STREAM_CONFIG.INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.disconnect();
    };
  }, [isFullCam]);

  // mode=all: 온디바이스 VisionEngine
  useEffect(() => {
    if (!isFullCam) return;
    if (!vision.isReady) {
      setVisionStatus(vision.loading ? '모델 로딩 중...' : vision.error || '');
      return;
    }

    setVisionStatus(`온디바이스 탐지 (${vision.targetFps}fps)`);

    const captureInterval = setInterval(async () => {
      if (!cameraRef.current || !vision.isReady) return;

      try {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          enableShutterSound: false,
        });

        // TODO: 현재는 테스트용 더미 데이터
        // 실제로는 JPEG → 416x416 RGB Float32 변환 필요
        // react-native-image-resizer + 네이티브 디코더 필요
        const inputData = new Float32Array(416 * 416 * 3).fill(0.5);

        const events = vision.processFrame(inputData, 416, 416);
        handleVisionEvents(events);
      } catch (err) {
        // 카메라 준비 안 됨
      }
    }, 1000 / vision.targetFps);

    return () => clearInterval(captureInterval);
  }, [isFullCam, vision.isReady, vision.targetFps, vision.processFrame]);

  // 비전 이벤트 처리 → 알림 표시
  const handleVisionEvents = useCallback((events: SafetyEvent[]) => {
    if (events.length === 0) return;

    // 가장 높은 severity 이벤트 선택
    const sorted = [...events].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    });

    const top = sorted[0];
    const label = SEVERITY_LABELS[top.label] || top.label;
    setAlertMessage(label);
    setAlertSeverity(top.severity);
    setAlertVisible(true);

    if (top.severity === 'high') {
      Vibration.vibrate(500);
    }
  }, []);

  const headerTitle = isFullCam ? '전체 촬영' : '작업자 환경 촬영';

  const handleToggleRecording = useCallback(async () => {
    if (!cameraRef.current) return;

    if (isRecording) {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      cameraRef.current.startRecording({
        onRecordingFinished: video => {
          console.log('Recording finished:', video.path);
        },
        onRecordingError: error => {
          console.error('Recording error:', error);
          setIsRecording(false);
        },
      });
    }
  }, [isRecording]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title={headerTitle} />

      {/* Vision Status Banner (mode=all) */}
      {isFullCam && visionStatus !== '' && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>{visionStatus}</Text>
          {vision.lastInferenceMs > 0 && (
            <Text style={styles.statusFps}>
              {vision.targetFps}fps / {vision.lastInferenceMs}ms
            </Text>
          )}
        </View>
      )}

      {/* Camera Preview Area */}
      <View style={styles.cameraPreview}>
        <BaseCamera
          ref={cameraRef}
          isActive={true}
          video={true}
          audio={!isFullCam}
          format={streamFormat || undefined}
          isRecording={isRecording}
          onCapture={isFullCam ? undefined : handleToggleRecording}
        />
      </View>

      {/* Bottom Spacer Section */}
      <View
        style={[
          styles.bottomSection,
          { height: insets.bottom + 16 },
        ]}
      />

      {/* Alert Modal */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogContent}>
              <Text
                style={[
                  styles.dialogTitle,
                  { color: SEVERITY_COLORS[alertSeverity] || '#FF3B30' },
                ]}>
                {alertSeverity === 'high'
                  ? '⚠️ 위험 감지!'
                  : alertSeverity === 'medium'
                    ? '⚠️ 주의'
                    : '📋 알림'}
              </Text>
              <Text style={styles.dialogDescription}>{alertMessage}</Text>
            </View>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogButtonFilled}
                onPress={() => setAlertVisible(false)}>
                <Text style={styles.dialogButtonFilledText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Status Banner */
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#FFB800',
    fontWeight: '600',
  },
  statusFps: {
    fontSize: 11,
    color: '#8E8E93',
  },

  /* Camera Preview */
  cameraPreview: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 15,
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  dialog: { width: 300, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 20 },
  dialogContent: { gap: 10, alignItems: 'center' },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: '#FF3B30' },
  dialogDescription: { fontSize: 14, color: '#1F2024', textAlign: 'center' },
  dialogActions: { flexDirection: 'row', justifyContent: 'center' },
  dialogButtonFilled: { width: '100%', height: 44, borderRadius: 12, backgroundColor: '#FFB800', justifyContent: 'center', alignItems: 'center' },
  dialogButtonFilledText: { color: '#FFFFFF', fontWeight: '600' },
});
