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
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import BaseCamera from '../components/BaseCamera';
import RNFS from 'react-native-fs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';

import { useWorkSession } from '../context/WorkSessionContext';
import SafetyStream, { StreamResponse } from '../api/stream';

import { useVisionEngine } from '../vision/hooks/useVisionEngine';
import { preprocessImageForYOLO } from '../vision/utils/imagePreprocess';

import { PorcupineManager } from '@picovoice/porcupine-react-native';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import Tts from 'react-native-tts';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

type AssistantState = 'idle' | 'listening_for_wakeword' | 'listening_for_question' | 'thinking' | 'speaking';



/* ──────── Configuration ──────── */

const STREAM_CONFIG = {
  WIDTH: 448,
  HEIGHT: 448,
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
  insufficient_worker_count: '작업자 부족',
  ladder_instability: '사다리 불안정',
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
  const isTestCam = mode === 'test';
  const useVision = isFullCam || isTestCam;

  const { workSessionId } = useWorkSession();

  // 스트리밍 설정 기반 포맷 선택
  const device = useCameraDevice('back');
  const streamFormat = useCameraFormat(device, [
    { videoResolution: { width: STREAM_CONFIG.WIDTH, height: STREAM_CONFIG.HEIGHT } },
  ]);

  // State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const isCameraActiveRef = useRef(false);
  const isCameraReadyRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<string>('medium');
  const [detections, setDetections] = useState<any[]>([]);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  // Voice Assistant
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  // Vision Engine (mode=all 전용)
  const vision = useVisionEngine();
  const [visionStatus, setVisionStatus] = useState<string>('');

  // Refs
  const cameraRef = useRef<Camera>(null);
  const streamRef = useRef<SafetyStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const porcupineManagerRef = useRef<PorcupineManager | null>(null);
  const isGreetingRef = useRef(false);

  // Permissions:
  const { hasPermission, requestPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();

  useEffect(() => {
    if (!hasPermission) requestPermission();
    if (!hasMicPermission) requestMicPermission();
  }, [hasPermission, requestPermission, hasMicPermission, requestMicPermission]);

  // Wake Word Callbacks
  const startWakeWord = async () => {
    try {
      if (porcupineManagerRef.current) {
        setAssistantState('listening_for_wakeword');
        await porcupineManagerRef.current.start();
      }
    } catch (e) {
      console.error("Wake word start error:", e);
    }
  };

  const stopWakeWord = async () => {
    try {
      if (porcupineManagerRef.current) {
        await porcupineManagerRef.current.stop();
      }
    } catch (e) {
      console.error("Wake word stop error:", e);
    }
  };

  const wakeWordCallback = async (keywordIndex: number) => {
    if (keywordIndex === 0) {
      // Wake word detected! Stop Porcupine and say greeting
      await stopWakeWord();
      isGreetingRef.current = true;
      setAssistantState('speaking');
      Tts.speak('네, 무슨 일이신가요?');
    }
  };

  // Sync wake word with camera state in worker mode
  useEffect(() => {
    if (mode !== 'worker') return;
    if (isCameraActive) {
      startWakeWord();
    } else {
      stopWakeWord();
      Voice.stop().catch(() => { });
      Tts.stop();
      setAssistantState('idle');
    }
  }, [isCameraActive, mode]);

  // Voice Assistant Setup
  useEffect(() => {
    const onTtsFinish = () => {
      console.log('[TTS Debug] Speaking finished, checking for greeting.');
      if (isGreetingRef.current) {
        isGreetingRef.current = false;
        setAssistantState('listening_for_question');
        setRecognizedText('듣고 있습니다...');

        // Give Android Audio Focus a brief moment to transition from text-to-speech 
        // back to the STT listener.
        setTimeout(async () => {
          try {
            await Voice.start('ko-KR');
            console.log('[Voice Debug] STT started successfully');
          } catch (e) {
            console.error("Voice start error:", e);
            startWakeWord();
          }
        }, 500);
      } else {
        setTimeout(() => startWakeWord(), 500);
      }
    };

    let ttsFinishListener: any;

    const initVoiceAssistant = async () => {
      // 1. Init TTS
      Tts.setDefaultLanguage('ko-KR');
      Tts.setDefaultRate(0.5);
      ttsFinishListener = Tts.addEventListener('tts-finish', onTtsFinish) as any;

      // 2. Init STT (Voice)
      Voice.onSpeechStart = (e: any) => {
        console.log('[Voice Debug] Speech Started:', e);
      };

      Voice.onSpeechRecognized = (e: any) => {
        console.log('[Voice Debug] Speech Recognized:', e);
      };

      Voice.onSpeechPartialResults = (e) => {
        const text = e.value?.[0] || '';
        console.log('[Voice Debug] Partial Results:', text);
        if (text) {
          setRecognizedText(text);
        }
      };

      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        const text = e.value?.[0] || '';
        console.log('[Voice Debug] Final Results:', text);
        if (text) {
          setMessages(prev => [...prev, { role: 'user', text }]);
          setAssistantState('thinking');
          setRecognizedText('');
          if (streamRef.current) {
            const timestamp = new Date().toISOString();
            console.log(`[Voice Debug] Sending question to WebSocket: "${text}"`);
            streamRef.current.sendQuestion(text, timestamp);
          }
        } else {
          setRecognizedText(''); // 결과가 없으면 초기화
          startWakeWord();
        }
      };

      Voice.onSpeechError = (e: any) => {
        console.error('Voice Error:', JSON.stringify(e));
        setRecognizedText(''); // 에러 시 초기화
        setTimeout(() => startWakeWord(), 500); // 딜레이를 주어 Porcupine으로 안전하게 복귀
      };

      // 3. Init Porcupine
      try {
        const keywordPath = 'ttoktti_android.ppn';
        const modelPath = 'porcupine_params_ko.pv';

        porcupineManagerRef.current = await PorcupineManager.fromKeywordPaths(
          'Ng4sw9Y25q+jDsw5aX7l2JuaaEy1nJDTuxF21nQy/QYhGoaRNd31wQ==',
          [keywordPath],
          wakeWordCallback,
          (error) => { console.error("Porcupine Error: ", error); },
          modelPath
        );
        console.log('[Porcupine Debug] Wake Word Engine Initialized successfully.');
        if (isCameraActiveRef.current) {
          await startWakeWord();
        }
      } catch (error) {
        console.error('Porcupine Initialization Error:', error);
      }
    };

    initVoiceAssistant();

    return () => {
      Tts.stop();
      ttsFinishListener?.remove();
      Voice.stop().catch(() => { });
      Voice.destroy().then(Voice.removeAllListeners).catch(() => { });
      porcupineManagerRef.current?.delete();
    };
  }, []);

  // mode=worker: 기존 WebSocket 스트리밍
  useEffect(() => {
    const currentSessionId = workSessionId ? String(workSessionId) : "";
    if (useVision || !isCameraActive) return;
    const userId = 'AuthContext_user_id';

    streamRef.current = new SafetyStream(
      userId,
      {
        worksession_id: currentSessionId,
        video_path: ""
      },
      (data: StreamResponse) => {
        if (data.type === 'DANGER') {
          setAlertMessage(data.message || '위험이 감지되었습니다!');
          setAlertSeverity('high');
          setAlertVisible(true);
        } else if (data.type === 'ANSWER') {
          setMessages(prev => [...prev, { role: 'assistant', text: data.message || '' }]);
          setAssistantState('speaking');
          stopWakeWord().then(() => {
            if (data.message) {
              Tts.speak(data.message);
            } else {
              startWakeWord();
            }
          });
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
  }, [useVision, isCameraActive]);

  // ref 동기화
  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  // mode=all/test: 온디바이스 VisionEngine
  useEffect(() => {
    if (!useVision || !isCameraActive) {
      isCameraReadyRef.current = false;
      return;
    }
    if (!vision.isReady) {
      setVisionStatus(vision.loading ? '모델 로딩 중...' : vision.error || '');
      return;
    }

    setVisionStatus(`온디바이스 탐지 (${vision.targetFps}fps)`);

    const captureInterval = setInterval(async () => {
      if (!cameraRef.current || !vision.isReady) return;
      if (!isCameraActiveRef.current || !isCameraReadyRef.current) return;

      try {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          enableShutterSound: false,
        });

        // 실제 이미지 전처리: JPEG → 640x640 RGB Float32Array
        const inputData = await preprocessImageForYOLO(`file://${photo.path}`, 640);

        const { events, detections: frameDetections } = vision.processFrame(inputData, 640, 640);

        // 모드별 detection 필터
        const filtered = isTestCam
          ? frameDetections // test: 전체 표시
          : frameDetections.filter(
            d => d.label === 'person' || d.label === 'helmet' || d.label === 'safety_vest',
          );
        setDetections(filtered);

        // 모드별 이벤트 처리
        if (isTestCam && events.length > 0) {
          // test 모드: 모든 이벤트 처리 (가장 높은 severity 우선)
          const sorted = [...events].sort((a, b) => {
            const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
            return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
          });
          const top = sorted[0];
          const messages = events.map(e => SEVERITY_LABELS[e.label] || e.label);
          setAlertMessage(messages.join(', '));
          setAlertSeverity(top.severity);
          setAlertVisible(true);
          if (top.severity === 'high') {
            Vibration.vibrate(1000);
          } else {
            Vibration.vibrate(500);
          }
        } else if (isFullCam) {
          // all 모드: PPE만
          const helmetEvent = events.find(e => e.label === 'helmet_not_worn');
          const vestEvent = events.find(e => e.label === 'safety_vest_not_worn');
          if (helmetEvent || vestEvent) {
            const messages: string[] = [];
            if (helmetEvent) messages.push('안전모 미착용');
            if (vestEvent) messages.push('안전조끼 미착용');
            setAlertMessage(messages.join(', '));
            setAlertSeverity('medium');
            setAlertVisible(true);
            Vibration.vibrate(500);
          }
        }
      } catch (err) {
        console.error('[CameraScreen] 프레임 처리 실패:', err);
      }
    }, 1000); // 1fps

    return () => clearInterval(captureInterval);
  }, [useVision, isCameraActive, vision.isReady, vision.targetFps, vision.processFrame]);

  // 비전 이벤트 처리 → 알림 표시 (실험용으로 비활성화)
  // const handleVisionEvents = useCallback((events: SafetyEvent[]) => {
  //   if (events.length === 0) return;

  //   // 가장 높은 severity 이벤트 선택
  //   const sorted = [...events].sort((a, b) => {
  //     const order = { high: 0, medium: 1, low: 2 };
  //     return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  //   });

  //   const top = sorted[0];
  //   const label = SEVERITY_LABELS[top.label] || top.label;
  //   setAlertMessage(label);
  //   setAlertSeverity(top.severity);
  //   setAlertVisible(true);

  //   if (top.severity === 'high') {
  //     Vibration.vibrate(500);
  //   }
  // }, []);

  const headerTitle = isTestCam ? '종합 테스트' : isFullCam ? '전체 촬영' : '작업자 환경 촬영';

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

      {/* Status Chip (mode=worker) */}
      {mode === 'worker' && (
        <View style={styles.assistantStatusChip}>
          <Text style={[
            styles.assistantStatusText,
            {
              color: assistantState === 'idle' || assistantState === 'listening_for_wakeword'
                ? '#8E8E93' : assistantState === 'listening_for_question'
                  ? '#1A73E8' : assistantState === 'thinking'
                    ? '#FF9500' : '#34C759'
            }
          ]}>
            {assistantState === 'idle' || assistantState === 'listening_for_wakeword'
              ? '👤 "똑띠" 라고 불러보세요'
              : assistantState === 'listening_for_question'
                ? '🎤 듣고 있어요...'
                : assistantState === 'thinking'
                  ? '💡 생각 중...'
                  : '💬 답변 중...'}
          </Text>
        </View>
      )}

      {/* Vision Status Banner (mode=all/test) */}
      {useVision && visionStatus !== '' && (
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
      <View
        style={styles.cameraPreview}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setPreviewSize({ width, height });
        }}>
        <BaseCamera
          ref={cameraRef}
          isActive={isCameraActive}
          video={true}
          audio={!useVision}
          format={streamFormat || undefined}
          isRecording={isRecording}
          onCapture={useVision ? undefined : handleToggleRecording}
          onInitialized={() => {
            console.log('[CameraScreen] 카메라 초기화 완료');
            isCameraReadyRef.current = true;
          }}
        />

        {/* Bounding Box Overlay */}
        {useVision && detections.length > 0 && previewSize.width > 0 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {detections.map((det, idx) => {
              const [x1, y1, x2, y2] = det.bbox;
              const scaleX = previewSize.width / 640;
              const scaleY = previewSize.height / 640;
              const left = x1 * scaleX;
              const top = y1 * scaleY;
              const width = (x2 - x1) * scaleX;
              const height = (y2 - y1) * scaleY;

              const boxColor =
                det.label === 'person' ? '#00FF00' :
                  det.label === 'helmet' ? '#00BFFF' :
                    det.label === 'safety_vest' ? '#FF9500' :
                      det.label === 'ladder' ? '#FF3B30' :
                        det.label === 'outtrigger' ? '#AF52DE' :
                          '#FFCC00'; // 기타

              return (
                <View
                  key={`${idx}-${det.label}`}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width,
                    height,
                    borderWidth: 2,
                    borderColor: boxColor,
                    backgroundColor: 'transparent',
                  }}>
                  <View
                    style={{
                      backgroundColor: boxColor,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                    }}>
                    <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>
                      {det.label} {(det.score * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* STT Text Overlay (Non-worker mode fallback) */}
        {recognizedText !== '' && mode !== 'worker' && (
          <View style={styles.sttOverlay}>
            <Text style={styles.sttText}>{recognizedText}</Text>
          </View>
        )}

        {/* Chat History Panel (mode=worker) */}
        {mode === 'worker' && (messages.length > 0 || (assistantState === 'listening_for_question' && recognizedText !== '')) && (
          <View style={styles.chatPanel}>
            {messages.slice(-3).map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.chatBubble,
                  msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAi,
                ]}>
                <Text style={styles.chatText}>{msg.text}</Text>
              </View>
            ))}
            {/* 실시간 인식 중인 STT 표시 */}
            {assistantState === 'listening_for_question' && recognizedText !== '' && (
              <View style={[styles.chatBubble, styles.chatBubbleUser, { opacity: 0.5 }]}>
                <Text style={styles.chatText}>{recognizedText}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Bottom Control Section */}
      <View
        style={[
          styles.bottomSection,
          { paddingBottom: insets.bottom + 16 },
        ]}>
        <TouchableOpacity
          style={[
            styles.cameraButton,
            isCameraActive && styles.cameraButtonActive,
          ]}
          onPress={() => setIsCameraActive(!isCameraActive)}>
          <Text style={styles.cameraButtonText}>
            {isCameraActive ? '촬영 중지' : '촬영 시작'}
          </Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#F8F9FE',
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
    overflow: 'hidden', // STT 오버레이가 카메라 영역을 벗어나지 않도록
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  cameraButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonActive: {
    backgroundColor: '#FF3B30',
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* STT Text Overlay */
  sttOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sttText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Status Chip */
  assistantStatusChip: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assistantStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Chat History Panel */
  chatPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    justifyContent: 'flex-end',
    gap: 12,
  },
  chatBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFB800',
    borderBottomRightRadius: 4,
  },
  chatBubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomLeftRadius: 4,
  },
  chatText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    fontWeight: '500',
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
