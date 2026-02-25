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
  Alert,
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


const NO_HELMET = require('../assets/no_helmet.png');
const NO_VEST = require('../assets/no_vest.png');
const NO_GLOVE = require('../assets/no_glove.png');
const CLEAR_IMG = require('../assets/clear.png');

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
  const [isFailed, setIsFailed] = useState(false);
  const [complianceId, setComplianceId] = useState<number | null>(null);
  const [manualRequested, setManualRequested] = useState(false);

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
      if (Date.now() - startTime > POLLING_TIMEOUT) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsUploading(false);
        setIsFailed(true);
        return;
      }

      try {
        const { isUpdated, isComplied } = await fetchCheckUpdate(complianceId);

        if (isUpdated) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsUploading(false);
          if (isComplied) {
            setIsSuccess(true);
            setTimeout(() => {
              markItemAsCompleted(title);
              navigation.goBack();
            }, 1500);
          } else {
            setIsFailed(true);
          }
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsUploading(false);
        setIsFailed(true);
      }
    }, POLLING_INTERVAL);
  }, [markItemAsCompleted, navigation, title]);

  // 촬영만 — 업로드는 선택 버튼 누를 때
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !isCameraReadyRef.current) return;
    const photo = await cameraRef.current.takePhoto();
    setPhotoPath(`file://${photo.path}`);
  }, []);

  const handleRetake = useCallback(() => {
    setPhotoPath(null);
    setIsUploading(false);
    setIsSuccess(false);
    setIsFailed(false);
    setComplianceId(null);
    setManualRequested(false);
  }, []);

  // 선택 버튼 → 업로드 + 탐지 요청 + 폴링
  const handleConfirm = useCallback(async () => {
    if (!photoPath || isUploading) return;
    try {
      setIsUploading(true);
      setIsFailed(false);
      const { upload_url, blob_name } = await getSasToken('image/jpeg', 'compliance');
      await uploadToBlob(upload_url, photoPath);
      const cId = await requestDetection(blob_name, title, worksession_id);
      setComplianceId(cId);
      startPolling(cId);
    } catch (err) {
      console.error('handleConfirm error:', err);
      setIsUploading(false);
      setIsFailed(true);
    }
  }, [photoPath, isUploading, title, worksession_id, startPolling]);

  const getFailureImage = () => {
    if (title.includes('헬멧') || title.includes('안전모')) return NO_HELMET;
    if (title.includes('조끼')) return NO_VEST;
    if (title.includes('장갑')) return NO_GLOVE;
    return NO_HELMET; // 기본값
  };

  const getFailureMessage = () => {
    if (title.includes('헬멧') || title.includes('안전모')) return '안전모 미착용 감지';
    if (title.includes('조끼')) return '안전조끼 미착용 감지';
    if (title.includes('장갑')) return '안전장갑 미착용 감지';
    return '미착용 감지'; // 기본값
  };

  const getSuccessMessage = () => {
    if (title.includes('헬멧') || title.includes('안전모')) return '안전모 착용 확인!';
    if (title.includes('조끼')) return '안전조끼 착용 확인!';
    if (title.includes('장갑')) return '안전장갑 착용 확인!';
    return `${title} 착용 확인`;
  };

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
            confirmText={isUploading ? '분석 중...' : '선택'}
            isConfirming={isUploading}
          >
            {isSuccess && (
              <View style={styles.resultCardOverlay}>
                <Image source={CLEAR_IMG} style={styles.clearImage} resizeMode="contain" />
                <Text style={styles.resultText}>{getSuccessMessage()}</Text>
              </View>
            )}
            {isUploading && !isSuccess && (
              <View style={styles.resultCardOverlay}>
                <ActivityIndicator size="large" color="#FFB800" />
                <Text style={styles.resultText}>AI 분석 중...</Text>
              </View>
            )}
            {isFailed && !isUploading && (
              <View style={styles.resultCardOverlay}>
                <Image source={getFailureImage()} style={styles.failureImage} resizeMode="contain" />
                <Text style={styles.resultText}>❌ {getFailureMessage()}{`\n`}다시 촬영해주세요</Text>
                {complianceId && !manualRequested && (
                  <TouchableOpacity
                    style={styles.manualRequestButton}
                    onPress={async () => {
                      try {
                        await requestManualCheck(worksession_id, complianceId);
                        setManualRequested(true);
                        Alert.alert('요청 완료', '관리자에게 수동 확인을 요청했습니다.');
                      } catch {
                        Alert.alert('요청 실패', '다시 시도해주세요.');
                      }
                    }}>
                    <Text style={styles.manualRequestText}>수동 확인 요청</Text>
                  </TouchableOpacity>
                )}
                {manualRequested && (
                  <Text style={styles.manualRequestedText}>✅ 수동 확인 요청됨</Text>
                )}
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
    backgroundColor: '#F8F9FE',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8F9FE',
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
    textAlign: 'center',
  },
  failureImage: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  clearImage: {
    width: 220,
    height: 220,
    marginBottom: 0,
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
    borderColor: '#FFB800',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 16,
    color: '#FFB800',
  },
  retakeButton: {
    width: 120,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFB800',
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
    backgroundColor: '#FFB800',
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
    backgroundColor: '#F8F9FE',
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
    backgroundColor: '#FFB800',
    borderRadius: 4,
    position: 'absolute',
    left: 16,
    bottom: 24,
    transform: [{ rotate: '45deg' }],
  },
  largeCheckLong: {
    width: 72,
    height: 8,
    backgroundColor: '#FFB800',
    borderRadius: 4,
    position: 'absolute',
    right: 8,
    bottom: 36,
    transform: [{ rotate: '-45deg' }],
  },
  xLine1: {
    width: 80,
    height: 8,
    backgroundColor: '#FFB800',
    borderRadius: 4,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  xLine2: {
    width: 80,
    height: 8,
    backgroundColor: '#FFB800',
    borderRadius: 4,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  manualRequestButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFB800',
    backgroundColor: '#FFFFFF',
  },
  manualRequestText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 15,
    color: '#FFB800',
  },
  manualRequestedText: {
    marginTop: 8,
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 14,
    color: '#71727A',
  },
});
