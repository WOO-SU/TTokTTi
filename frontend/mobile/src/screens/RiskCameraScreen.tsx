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
import RNFS from 'react-native-fs';
import BaseCamera from '../components/BaseCamera';
import PhotoResultView from '../components/PhotoResultView';
import { useIsFocused } from '@react-navigation/native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { getSasToken, uploadToBlob } from '../api/equipment';
import { startRiskAssessment, uploadRiskPhoto } from '../api/risk';
import { useRiskPhotos } from '../context/RiskPhotoContext';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'RiskCamera'>;
  route: RouteProp<HomeStackParamList, 'RiskCamera'>;
};

/* ──────── Main Component ──────── */

export default function RiskCameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { title, worksession_id, assessmentId } = route.params;
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { addPhoto, setAssessmentId } = useRiskPhotos();

  const cameraRef = useRef<Camera>(null);
  const isCameraReadyRef = useRef(false);
  const isFocused = useIsFocused();

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) { return; }
    if (!isCameraReadyRef.current) {
      console.warn('Camera not ready yet');
      return;
    }
    try {
      const photo = await cameraRef.current.takePhoto();
      setPhotoPath(`file://${photo.path}`);
    } catch (err) {
      console.error('[RiskCamera] 촬영 실패:', err);
    }
  }, []);

  const handleRetake = useCallback(() => {
    setPhotoPath(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!photoPath) { return; }
    setIsUploading(true);
    try {
      // 1. blob 업로드
      const { upload_url, blob_name } = await getSasToken('image/jpeg', 'assessment');
      await uploadToBlob(upload_url, photoPath);

      // 2. 첫 사진이면 assessment 생성, 아니면 기존 ID 사용
      let finalAssessmentId = assessmentId;
      if (!finalAssessmentId) {
        const res = await startRiskAssessment(worksession_id);
        finalAssessmentId = res.assessment_id;
      }

      // 3. blob path DB 저장
      await uploadRiskPhoto(finalAssessmentId, blob_name);

      // 4. 전역 컨텍스트에 기록
      setAssessmentId(finalAssessmentId);
      addPhoto(title, photoPath);

      // 5. 이전 화면으로 돌아감
      navigation.goBack();
    } catch (err) {
      console.error('[RiskCamera] 업로드 실패:', err);
    } finally {
      setIsUploading(false);
    }
  }, [photoPath, assessmentId, worksession_id, title, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <TopHeader title={title || '위험 요인 촬영'} />

      {/* Camera Preview */}
      <View style={styles.cameraPreview}>
        {photoPath ? (
          <PhotoResultView
            photoPath={photoPath}
            onRetake={handleRetake}
            onConfirm={handleConfirm}
            confirmText="사용하기"
            isConfirming={isUploading}
          />
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
  guideText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FE',
  },
});
