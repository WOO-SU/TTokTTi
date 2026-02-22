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
import { Camera } from 'react-native-vision-camera';
import BaseCamera from '../components/BaseCamera';
import PhotoResultView from '../components/PhotoResultView';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { useWorkSession } from '../context/WorkSessionContext';
import {
  getSasToken,
  uploadToBlob,
  requestDetection,
  fetchCheckUpdate,
  requestManualCheck,
} from '../api/equipment';
import LargeCheckIcon from '../components/LargeCheckIcon';

type Props = {
  navigation: NativeStackNavigationProp<
    HomeStackParamList,
    'EquipmentCamera'
  >;
  route: RouteProp<HomeStackParamList, 'EquipmentCamera'>;
};

const POLLING_INTERVAL = 2000;
const POLLING_TIMEOUT = 60000; // 최대 60초

/* ──────── Main Component ──────── */

export default function EquipmentCameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { title, worksession_id } = route.params;
  const { markItemAsCompleted } = useWorkSession();
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const cameraRef = useRef<Camera>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocused = useIsFocused();
  const isCameraReadyRef = useRef(false);

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
        setIsSuccess(false);
        return;
      }

      try {
        const { isUpdated, isComplied } = await fetchCheckUpdate(complianceId);

        if (isUpdated) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setIsSuccess(isComplied ?? false);
        }
      } catch {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        setIsSuccess(false);
      }
    }, POLLING_INTERVAL);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) { return; }
    if (!isCameraReadyRef.current) {
      console.warn('Camera not ready yet');
      return;
    }

    try {
      setIsUploading(true);
      // 1. 사진 촬영
      const photo = await cameraRef.current.takePhoto();
      const fileUri = `file://${photo.path}`;
      setPhotoPath(fileUri);

      // 2. SAS 토큰 발급 → Blob 업로드
      const { upload_url, blob_name } = await getSasToken();
      await uploadToBlob(upload_url, fileUri);

      // 3. 탐지 요청 (DB에 Compliance 레코드 생성)
      setIsUploading(true);
      const complianceId = await requestDetection(blob_name, title, worksession_id);

      // 4. 폴링 시작
      startPolling(complianceId);
    } catch (err) {
      console.error('handleCapture error:', err);
      setIsSuccess(false);
    } finally {
      setIsUploading(false);
    }
  }, [title, worksession_id, startPolling]);

  const handleRetake = useCallback(() => {
    setPhotoPath(null);
    setIsUploading(false);
    setIsSuccess(false);
  }, []);

  const handleConfirm = useCallback(() => {
    markItemAsCompleted(title);
    navigation.goBack();
  }, [markItemAsCompleted, navigation, title]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title={title || '장비 점검 촬영'} />

      {/* Camera Preview Area */}
      <View style={styles.cameraPreview}>
        {photoPath ? (
          <PhotoResultView
            photoPath={photoPath}
            onRetake={handleRetake}
            onConfirm={handleConfirm}
            confirmText="선택"
            isConfirming={isUploading}
          >
            {isSuccess && (
              <View style={styles.resultCardOverlay}>
                <LargeCheckIcon />
                <Text style={styles.resultText}>전송 완료</Text>
              </View>
            )}
          </PhotoResultView>
        ) : (
          <BaseCamera
            ref={cameraRef}
            isActive={isFocused && !photoPath}
            photo={true}
            guideText={`${title} 사진을 촬영하세요`}
            onCapture={handleCapture}
            onInitialized={() => { isCameraReadyRef.current = true; }}
          />
        )}
      </View>

      {/* Bottom Spacer Section to match EquipmentCameraScreen Layout */}
      {!photoPath && (
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
  cameraPreview: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  capturedImage: {
    flex: 1,
    borderRadius: 20,
  },
  noCameraText: {
    fontFamily: 'Noto Sans KR',
    fontSize: 14,
    color: '#FFFFFF',
  },
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
  failedText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',     // Bold
    fontSize: 20,
    color: '#1F2024',      // Black text
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  errorButton: {
    width: 120,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#006FFD',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 16,
    color: '#006FFD',
  },
  retakeButton: {
    width: 120,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },
  guideOverlay: {
    position: 'absolute',
    bottom: 110,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  guideOverlayText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 14,
    color: '#FFFFFF',
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
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#F6F6F6',
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#006FFD',
    borderRadius: 4,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  xLine2: {
    width: 80,
    height: 8,
    backgroundColor: '#006FFD',
    borderRadius: 4,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
});
