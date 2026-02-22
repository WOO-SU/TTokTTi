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
import RNFS from 'react-native-fs';
import BaseCamera from '../components/BaseCamera';
import PhotoResultView from '../components/PhotoResultView';
import { useAuth } from '../context/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import LargeCheckIcon from '../components/LargeCheckIcon';
import { getSasToken, uploadToBlob } from '../api/equipment';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'EndWork'>;
};

type ScreenState = 'idle' | 'camera' | 'preview' | 'sending' | 'sent';

/* ──────── Icon Components ──────── */

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

  const handleConfirm = useCallback(() => {
    handleSend();
  }, [handleSend]);

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
        <View style={styles.cameraPreview}>
          {screenState === 'camera' && (
            <BaseCamera
              ref={cameraRef}
              isActive={true}
              photo={true}
              guideText="마무리 현장을 촬영하세요"
              onCapture={handleCapture}
            />
          )}

          {screenState === 'preview' && photoPath && (
            <PhotoResultView
              photoPath={photoPath}
              onRetake={handleRetake}
              onConfirm={handleConfirm}
              confirmText="전송"
            />
          )}
          {screenState === 'sending' && photoPath && (
            <PhotoResultView
              photoPath={photoPath}
              onRetake={handleRetake}
              onConfirm={handleConfirm}
              confirmText="전송"
              isConfirming={true}
            >
              <View style={styles.resultCardOverlay}>
                <ActivityIndicator size="large" color="#006FFD" />
                <Text style={styles.resultText}>업로드 중...</Text>
              </View>
            </PhotoResultView>
          )}
          {screenState === 'sent' && photoPath && (
            <PhotoResultView
              photoPath={photoPath}
              onRetake={handleRetake}
              onConfirm={handleDone}
              confirmText="완료"
            >
              <View style={styles.resultCardOverlay}>
                <LargeCheckIcon />
                <Text style={styles.resultText}>전송 완료</Text>
              </View>
            </PhotoResultView>
          )}
        </View>
      )}

      {screenState === 'camera' && (
        <View
          style={[
            styles.bottomSection,
            { height: insets.bottom + 16 },
          ]}
        />
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
    backgroundColor: '#F8F9FE',
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
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  noCameraText: {
    fontFamily: 'Noto Sans KR',
    fontSize: 14,
    color: '#333333',
  },

  /* Result Card */
  resultCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
  },
  resultText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 20,
    color: '#1F2024',
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
});
