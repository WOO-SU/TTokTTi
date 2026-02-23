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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  PhotoFile,
  useCameraDevice,
  useCameraFormat,
} from 'react-native-vision-camera';
import BaseCamera from '../components/BaseCamera';
import RNFS from 'react-native-fs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';

import SafetyStream, { StreamResponse } from '../api/stream'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

/* ──────── Configuration ──────── */

const STREAM_CONFIG = {
  WIDTH: 480,
  HEIGHT: 480,
  INTERVAL_MS: 1000, // 4 fps (1000/250)
};

/* ──────── Main Component ──────── */

export default function CameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { mode } = route.params;

  // 스트리밍 설정 기반 포맷 선택
  const device = useCameraDevice('back');
  const streamFormat = useCameraFormat(device, [
    { videoResolution: { width: STREAM_CONFIG.WIDTH, height: STREAM_CONFIG.HEIGHT } },
  ]);

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Refs
  const cameraRef = useRef<Camera>(null);
  const streamRef = useRef<SafetyStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const userId = "AuthContext_user_id"

    streamRef.current = new SafetyStream(userId, (data: StreamResponse) => {
      if (data.type === 'DANGER') {
        setAlertMessage(data.message || '위험이 감지되었습니다!');
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
  }, []);

  const headerTitle = mode === 'all' ? '전체 촬영' : '작업자 환경 촬영';

  const handleToggleRecording = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }

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

      {/* Camera Preview Area */}
      <View style={styles.cameraPreview}>
        <BaseCamera
          ref={cameraRef}
          isActive={true}
          video={true}
          audio={true}
          format={streamFormat || undefined}
          isRecording={isRecording}
          onCapture={handleToggleRecording}
        />
      </View>

      {/* Bottom Spacer Section to match EquipmentCameraScreen Layout */}
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
              <Text style={styles.dialogTitle}>⚠️ 위험 감지!</Text>
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
  dialogButtonFilled: { width: '100%', height: 44, borderRadius: 12, backgroundColor: '#006FFD', justifyContent: 'center', alignItems: 'center' },
  dialogButtonFilledText: { color: '#FFFFFF', fontWeight: '600' },
});
