/* 근무 마무리 화면 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraPermission } from 'react-native-vision-camera';
import BaseCamera from '../components/BaseCamera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { getSasToken, uploadToBlob } from '../api/equipment';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'EndWork'>;
};

type ScreenState = 'idle' | 'camera' | 'preview' | 'sending' | 'sent';

/* ──────── Icon Components ──────── */

function LargeCheckIcon() {
  return (
    <View style={iconStyles.largeCheckContainer}>
      <View style={iconStyles.largeCheckShort} />
      <View style={iconStyles.largeCheckLong} />
    </View>
  );
}

export default function EndWorkScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  const cameraRef = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleStartCamera = useCallback(() => {
    setScreenState('camera');
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }
    const photo = await cameraRef.current.takePhoto();
    const fileUri = `file://${photo.path}`;
    setPhotoPath(fileUri);
    setScreenState('preview');
  }, []);

  const handleRetake = useCallback(() => {
    setPhotoPath(null);
    setScreenState('camera');
  }, []);

  const handleSend = useCallback(async () => {
    if (!photoPath) {
      return;
    }
    setScreenState('sending');
    try {
      const { upload_url } = await getSasToken();
      await uploadToBlob(upload_url, photoPath);
      setScreenState('sent');
    } catch (err) {
      console.error('EndWork upload error:', err);
      Alert.alert(
        '업로드 실패',
        '사진 업로드에 실패했습니다. 다시 시도해주세요.',
      );
      setScreenState('preview');
    }
  }, [photoPath]);

  const handleDone = useCallback(() => {
    navigation.navigate('MainHome');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="근무 마무리" />

      {/* Idle State */}
      {screenState === 'idle' && (
        <View style={styles.idleContent}>
          <Text style={styles.idleTitle}>근무를 마무리합니다</Text>
          <Text style={styles.idleSubtitle}>현장 사진을 촬영해주세요</Text>
          <TouchableOpacity
            style={styles.startCameraButton}
            activeOpacity={0.8}
            onPress={handleStartCamera}>
            <Text style={styles.startCameraButtonText}>마무리 촬영</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Camera & Preview States */}
      {screenState !== 'idle' && (
        <>
          <View style={styles.cameraPreview}>
            {screenState === 'camera' ? (
              <BaseCamera
                ref={cameraRef}
                isActive={true}
                photo={true}
                guideText="마무리 현장을 촬영하세요"
                onCapture={handleCapture}
              />
            ) : (
              <>
                <Image
                  source={{ uri: photoPath! }}
                  style={styles.capturedImage}
                />

                {screenState === 'sending' && (
                  <View style={styles.resultCard}>
                    <ActivityIndicator size="large" color="#006FFD" />
                    <Text style={styles.resultText}>업로드 중...</Text>
                  </View>
                )}

                {screenState === 'sent' && (
                  <View style={styles.resultCard}>
                    <LargeCheckIcon />
                    <Text style={styles.resultText}>전송 완료</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View
            style={[
              styles.bottomSection,
              { paddingBottom: insets.bottom + 16 },
            ]}>
            {screenState === 'preview' && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  activeOpacity={0.8}
                  onPress={handleRetake}>
                  <Text style={styles.retakeButtonText}>다시 찍기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sendButton}
                  activeOpacity={0.8}
                  onPress={handleSend}>
                  <Text style={styles.sendButtonText}>사진 보내기</Text>
                </TouchableOpacity>
              </View>
            )}
            {screenState === 'sent' && (
              <TouchableOpacity
                style={styles.doneButton}
                activeOpacity={0.8}
                onPress={handleDone}>
                <Text style={styles.doneButtonText}>확인</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
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
    transform: [{ rotate: '-45deg' }, { translateY: -5.5 }],
  },
  arrowBottom: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 5.5 }],
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
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 18,
    color: '#1F2024',
  },

  /* Idle */
  idleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  idleTitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 20,
    color: '#1F2024',
  },
  idleSubtitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },
  startCameraButton: {
    width: 200,
    height: 52,
    borderRadius: 15,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  startCameraButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },

  /* Camera */
  cameraPreview: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 15,
    backgroundColor: '#000000',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  capturedImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  noCameraText: {
    fontFamily: 'Noto Sans KR',
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* Result Card */
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
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 20,
    color: '#000000',
  },

  /* Bottom Buttons */
  bottomSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retakeButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#006FFD',
  },
  sendButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
  },
  doneButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
