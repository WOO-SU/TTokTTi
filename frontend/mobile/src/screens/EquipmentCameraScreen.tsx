/* 장비 점검 카메라 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import {
  getSasToken,
  uploadToBlob,
  requestAnalysis,
  fetchResult,
} from '../api/equipment';

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'EquipmentCamera'
  >;
  route: RouteProp<RootStackParamList, 'EquipmentCamera'>;
};

type ScreenState = 'idle' | 'uploading' | 'analyzing' | 'success' | 'failed';

const POLLING_INTERVAL = 2000;
const POLLING_TIMEOUT = 60000; // 최대 60초

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

function LargeCheckIcon() {
  return (
    <View style={iconStyles.largeCheckContainer}>
      <View style={iconStyles.largeCheckShort} />
      <View style={iconStyles.largeCheckLong} />
    </View>
  );
}

function LargeXIcon() {
  return (
    <View style={iconStyles.largeCheckContainer}>
      <View style={iconStyles.xLine1} />
      <View style={iconStyles.xLine2} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function EquipmentCameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { title } = route.params;
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('idle');

  const cameraRef = useRef<Camera>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // 화면 이탈 시 폴링 정리
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const startPolling = useCallback((taskId: string) => {
    const startTime = Date.now();

    pollingRef.current = setInterval(async () => {
      // 타임아웃 체크
      if (Date.now() - startTime > POLLING_TIMEOUT) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        setScreenState('failed');
        return;
      }

      try {
        const result = await fetchResult(taskId);

        if (result.status === 'completed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setScreenState(result.passed ? 'success' : 'failed');
        } else if (result.status === 'failed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setScreenState('failed');
        }
        // status === 'pending' → 계속 폴링
      } catch {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        setScreenState('failed');
      }
    }, POLLING_INTERVAL);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) { return; }

    // 1. 사진 촬영
    const photo = await cameraRef.current.takePhoto();
    const fileUri = `file://${photo.path}`;
    setPhotoPath(fileUri);
    setScreenState('uploading');

    try {
      // 2. SAS 토큰 발급 → Blob 업로드
      const { sasUrl, blobPath } = await getSasToken();
      await uploadToBlob(sasUrl, fileUri);

      // 3. 분석 요청
      setScreenState('analyzing');
      const { taskId } = await requestAnalysis(blobPath, title);

      // 4. 폴링 시작
      startPolling(taskId);
    } catch {
      setScreenState('failed');
    }
  }, [title, startPolling]);

  const handleRetake = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    setPhotoPath(null);
    setScreenState('idle');
  }, []);

  const handleContinue = () => {
    navigation.goBack();
  };

  const isProcessing = screenState === 'uploading' || screenState === 'analyzing';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Camera Preview Area */}
      <View style={styles.cameraPreview}>
        {photoPath ? (
          <>
            <Image source={{ uri: photoPath }} style={styles.capturedImage} />

            {/* 로딩 상태: 업로드 중 / 분석 중 */}
            {isProcessing && (
              <View style={styles.resultCard}>
                <ActivityIndicator size="large" color="#006FFD" />
                <Text style={styles.resultText}>
                  {screenState === 'uploading' ? '업로드 중...' : '분석 중...'}
                </Text>
              </View>
            )}

            {/* 성공 */}
            {screenState === 'success' && (
              <View style={styles.resultCard}>
                <LargeCheckIcon />
                <Text style={styles.resultText}>다음 단계로 이동</Text>
              </View>
            )}

            {/* 실패 */}
            {screenState === 'failed' && (
              <View style={styles.resultCard}>
                <LargeXIcon />
                <Text style={styles.failedText}>재촬영 하세요</Text>
                <TouchableOpacity
                  style={styles.retakeButton}
                  activeOpacity={0.8}
                  onPress={handleRetake}>
                  <Text style={styles.retakeButtonText}>다시 촬영</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : device && hasPermission ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true}
          />
        ) : (
          <Text style={styles.noCameraText}>
            {!hasPermission ? '카메라 권한이 필요합니다' : '카메라를 불러오는 중...'}
          </Text>
        )}

        {/* Camera Capture Button */}
        {screenState === 'idle' && !photoPath && (
          <TouchableOpacity
            style={styles.captureButton}
            activeOpacity={0.7}
            onPress={handleCapture}>
            <CameraIcon />
          </TouchableOpacity>
        )}
      </View>

      {/* Continue Button */}
      <View style={styles.continueSection}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            screenState !== 'success' && { opacity: 0.4 },
          ]}
          activeOpacity={0.8}
          disabled={screenState !== 'success'}
          onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
    width: 12,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    transform: [{ rotate: '-45deg' }, { translateX: -2 }, { translateY: -7 }],
  },
  arrowBottom: {
    width: 12,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    transform: [{ rotate: '45deg' }, { translateX: -2 }, { translateY: 7 }],
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
  largeCheckContainer: {
    width: 112,
    height: 112,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeCheckShort: {
    width: 36,
    height: 8,
    backgroundColor: '#006FFD',
    borderRadius: 4,
    position: 'absolute',
    left: 16,
    bottom: 24,
    transform: [{ rotate: '45deg' }],
  },
  largeCheckLong: {
    width: 72,
    height: 8,
    backgroundColor: '#006FFD',
    borderRadius: 4,
    position: 'absolute',
    right: 8,
    bottom: 36,
    transform: [{ rotate: '-45deg' }],
  },
  xLine1: {
    width: 80,
    height: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  xLine2: {
    width: 80,
    height: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
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
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 24,
    color: '#363636',
  },
  cameraPreview: {
    flex: 1,
    marginHorizontal: 15,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  capturedImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  noCameraText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#FFFFFF',
  },
  resultCard: {
    width: 229,
    height: 169,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  resultText: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 20,
    color: '#000000',
  },
  failedText: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 20,
    color: '#FF3B30',
  },
  retakeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    marginTop: 4,
  },
  retakeButtonText: {
    fontFamily: 'Roboto',
    fontWeight: '600',
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
    position: 'absolute',
    bottom: 24,
  },
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
});
