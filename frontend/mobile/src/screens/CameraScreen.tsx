/* 현장 촬영 화면 */
import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  PhotoFile,
} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../App';

import SafetyStream, { StreamResponse } from '../api/stream'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

/* ──────── Icon Components ──────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.arrowTop} />
      <View style={iconStyles.arrowBottom} />
    </View>
  );
}

function CameraIcon() {
  return (
    <View style={iconStyles.cameraContainer}>
      <View style={iconStyles.cameraBody}>
        <View style={iconStyles.cameraLens} />
      </View>
      <View style={iconStyles.cameraTop} />
    </View>
  );
}

function StopIcon() {
  return (
    <View style={iconStyles.stopContainer}>
      <View style={iconStyles.stopSquare} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function CameraScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {mode} = route.params;
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlergMessage] = useState('');

  // Refs
  const cameraRef = useRef<Camera>(null);
  const streamRef = useRef<SafetyStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Permissions
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();
  const {hasPermission: hasMicPermission, requestPermission: requestMicPermission} = useMicrophonePermission();

  // WebSocket & Stream Setup
  useEffect(() => {
    if (!hasPermission) requestPermission();
    if (!hasMicPermission) requestMicPermission();
    
  }, [hasPermission, requestPermission, hasMicPermission, requestMicPermission]);

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
            qualityPrioritization: 'speed',
            flash: 'off',
            enableShutterSound: false,
          });

          const base64 = await RNFS.readFile(photo.path, 'base64')

          streamRef.current.sendFrame(base64)
        } catch (err) {
          console.log('Frame capture error (expected if camera')
        }
      }
    }, 250);

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

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      {/* Camera Preview Area */}
      <View style={styles.cameraPreview}>
        {device && hasPermission ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            video={true}
            audio={true}
          />
        ) : (
          <Text style={styles.noCameraText}>
            {!hasPermission
              ? '카메라 권한이 필요합니다'
              : '카메라를 불러오는 중...'}
          </Text>
        )}

        {/* Record / Stop Button */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            isRecording && styles.captureButtonRecording,
          ]}
          activeOpacity={0.7}
          onPress={handleToggleRecording}>
          {isRecording ? <StopIcon /> : <CameraIcon />}
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      <View
        style={[styles.continueSection, {paddingBottom: insets.bottom + 16}]}>
        <TouchableOpacity style={styles.continueButton} activeOpacity={0.8}>
          <Text style={styles.continueText}>Continue</Text>
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

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  backContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowTop: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{rotate: '-45deg'}, {translateY: -5.5}],
  },
  arrowBottom: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{rotate: '45deg'}, {translateY: 5.5}],
  },
  cameraContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBody: {
    width: 24,
    height: 18,
    borderWidth: 2,
    borderColor: '#F8F8F8',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 2,
  },
  cameraLens: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#F8F8F8',
  },
  cameraTop: {
    width: 10,
    height: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: '#F8F8F8',
    position: 'absolute',
    top: 2,
  },
  stopContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Header */
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#1F2024',
  },

  /* Camera Preview */
  cameraPreview: {
    flex: 1,
    marginHorizontal: 15,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
    overflow: 'hidden',
  },
  noCameraText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#FFFFFF',
  },
  captureButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonRecording: {
    backgroundColor: '#FF3B30',
  },

  /* Continue Button */
  continueSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  continueButton: {
    width: 153,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 14,
    color: '#F6F6F6',
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
