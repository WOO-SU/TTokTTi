/* 장비 점검 카메라 */

import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../App';
import {
  getSasToken,
  uploadToBlob,
  requestDetection,
  fetchCheckUpdate,
} from '../api/equipment';
import {s, ms} from '../utils';
import {Colors, Fonts} from '../utils';

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

export default function EquipmentCameraScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {title} = route.params;
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('idle');

  const cameraRef = useRef<Camera>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

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

  const startPolling = useCallback((complianceId: number) => {
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
        const {isUpdated, isComplied} = await fetchCheckUpdate(complianceId);

        if (isUpdated) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setScreenState(isComplied ? 'success' : 'failed');
        }
        // isUpdated === false → 아직 분석 중, 계속 폴링
      } catch {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        setScreenState('failed');
      }
    }, POLLING_INTERVAL);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }

    // 1. 사진 촬영
    const photo = await cameraRef.current.takePhoto();
    const fileUri = `file://${photo.path}`;
    setPhotoPath(fileUri);
    setScreenState('uploading');

    try {
      // 2. SAS 토큰 발급 → Blob 업로드
      const {upload_url, blob_name} = await getSasToken();
      await uploadToBlob(upload_url, fileUri);

      // 3. 탐지 요청 (DB에 Compliance 레코드 생성)
      setScreenState('analyzing');
      const complianceId = await requestDetection(blob_name, title);

      // 4. 폴링 시작
      startPolling(complianceId);
    } catch (err) {
      console.error('handleCapture error:', err);
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
    navigation.navigate('RiskAssessment', {completedTitle: title});
  };

  const isProcessing =
    screenState === 'uploading' || screenState === 'analyzing';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + s(12)}]}>
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
            <Image source={{uri: photoPath}} style={styles.capturedImage} />

            {/* 로딩 상태: 업로드 중 / 분석 중 */}
            {isProcessing && (
              <View style={styles.resultCard}>
                <ActivityIndicator size="large" color={Colors.primary} />
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
            {!hasPermission
              ? '카메라 권한이 필요합니다'
              : '카메라를 불러오는 중...'}
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
      <View style={[styles.continueSection, {paddingBottom: insets.bottom + s(16)}]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            screenState !== 'success' && {opacity: 0.4},
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
    width: s(28),
    height: s(28),
    justifyContent: 'center',
    alignItems: 'center',
  },

  arrowTop: {
    width: s(12),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    left: 0,
    transform: [{rotate: '-45deg'}, {translateX: s(-2)}, {translateY: s(-7)}],
  },
  arrowBottom: {
    width: s(12),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    left: 0,
    transform: [{rotate: '45deg'}, {translateX: s(-2)}, {translateY: s(7)}],
  },
  cameraContainer: {
    width: s(28),
    height: s(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBody: {
    width: s(24),
    height: s(18),
    borderWidth: 2,
    borderColor: Colors.borderSoft,
    borderRadius: s(4),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: s(2),
  },
  cameraLens: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    borderWidth: 2,
    borderColor: Colors.borderSoft,
  },
  cameraTop: {
    width: s(10),
    height: s(4),
    borderTopLeftRadius: s(2),
    borderTopRightRadius: s(2),
    backgroundColor: Colors.borderSoft,
    position: 'absolute',
    top: s(2),
  },
  largeCheckContainer: {
    width: s(112),
    height: s(112),
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeCheckShort: {
    width: s(36),
    height: s(8),
    backgroundColor: Colors.primary,
    borderRadius: s(4),
    position: 'absolute',
    left: s(16),
    bottom: s(24),
    transform: [{rotate: '45deg'}],
  },
  largeCheckLong: {
    width: s(72),
    height: s(8),
    backgroundColor: Colors.primary,
    borderRadius: s(4),
    position: 'absolute',
    right: s(8),
    bottom: s(36),
    transform: [{rotate: '-45deg'}],
  },
  xLine1: {
    width: s(80),
    height: s(8),
    backgroundColor: Colors.error,
    borderRadius: s(4),
    position: 'absolute',
    transform: [{rotate: '45deg'}],
  },
  xLine2: {
    width: s(80),
    height: s(8),
    backgroundColor: Colors.error,
    borderRadius: s(4),
    position: 'absolute',
    transform: [{rotate: '-45deg'}],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingBottom: s(12),
    backgroundColor: Colors.white,
    gap: s(8),
  },
  backButton: {
    width: s(28),
    height: s(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.roboto,
    fontWeight: '400',
    fontSize: ms(24),
    color: Colors.textDarkBody,
  },
  cameraPreview: {
    flex: 1,
    marginHorizontal: s(15),
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  capturedImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  noCameraText: {
    fontFamily: Fonts.inter,
    fontSize: ms(14),
    color: Colors.white,
  },
  resultCard: {
    width: s(229),
    height: s(169),
    backgroundColor: Colors.white,
    borderRadius: s(20),
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(8),
    zIndex: 1,
  },
  resultText: {
    fontFamily: Fonts.roboto,
    fontWeight: '400',
    fontSize: ms(20),
    color: Colors.black,
  },
  failedText: {
    fontFamily: Fonts.roboto,
    fontWeight: '400',
    fontSize: ms(20),
    color: Colors.error,
  },
  retakeButton: {
    paddingHorizontal: s(20),
    paddingVertical: s(8),
    backgroundColor: Colors.error,
    borderRadius: s(10),
    marginTop: s(4),
  },
  retakeButtonText: {
    fontFamily: Fonts.roboto,
    fontWeight: '600',
    fontSize: ms(14),
    color: Colors.white,
  },
  captureButton: {
    width: s(58),
    height: s(58),
    borderRadius: s(29),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: s(24),
  },
  continueSection: {
    alignItems: 'center',
    paddingVertical: s(16),
  },
  continueButton: {
    width: s(153),
    height: s(38),
    borderRadius: s(15),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    fontFamily: Fonts.roboto,
    fontWeight: '400',
    fontSize: ms(14),
    color: Colors.bgLight,
  },
});
