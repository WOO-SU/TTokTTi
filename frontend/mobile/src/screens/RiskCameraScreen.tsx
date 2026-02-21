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
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { getSasToken, uploadToBlob } from '../api/equipment';
import { startRiskAssessment, uploadRiskPhoto } from '../api/risk';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'RiskCamera'>;
  route: RouteProp<HomeStackParamList, 'RiskCamera'>;
};

/* ──────── Icon Components ──────── */

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

/* ──────── Main Component ──────── */

export default function RiskCameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { title, worksession_id, assessmentId } = route.params;
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      const { upload_url, blob_name } = await getSasToken();
      await uploadToBlob(upload_url, photoPath);

      // 2. 첫 사진이면 assessment 생성, 아니면 기존 ID 사용
      let finalAssessmentId = assessmentId;
      if (!finalAssessmentId) {
        const res = await startRiskAssessment(worksession_id);
        finalAssessmentId = res.assessment_id;
      }

      // 3. blob path DB 저장
      await uploadRiskPhoto(finalAssessmentId, blob_name);

      // 4. RiskCheck로 돌아감 — assessmentId 및 completedTitle 전달
      navigation.navigate('RiskCheck', {
        worksession_id,
        assessmentId: finalAssessmentId,
        completedTitle: title,
      });
    } catch (err) {
      console.error('[RiskCamera] 업로드 실패:', err);
    } finally {
      setIsUploading(false);
    }
  }, [photoPath, assessmentId, worksession_id, title, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title={title} />

      {/* Camera Preview */}
      <View style={styles.cameraPreview}>
        {photoPath ? (
          <Image source={{ uri: photoPath }} style={styles.capturedImage} />
        ) : (
          <BaseCamera
            ref={cameraRef}
            isActive={isFocused && !photoPath}
            photo={true}
            onInitialized={() => { isCameraReadyRef.current = true; }}
          />
        )}

        {/* Capture Button */}
        {!photoPath && (
          <TouchableOpacity
            style={styles.captureButton}
            activeOpacity={0.7}
            onPress={handleCapture}>
            <CameraIcon />
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Buttons */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {photoPath ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.retakeButton}
              activeOpacity={0.8}
              disabled={isUploading}
              onPress={handleRetake}>
              <Text style={styles.retakeButtonText}>다시 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              activeOpacity={0.8}
              disabled={isUploading}
              onPress={handleConfirm}>
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>사용하기</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.guideText}>{title} 사진을 촬영하세요</Text>
        )}
      </View>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
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
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'Noto Sans KR',
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
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
  },
  guideText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },
});
