import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
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
import { useRiskPhotos } from '../context/RiskPhotoContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RiskCamera'>;
  route: RouteProp<RootStackParamList, 'RiskCamera'>;
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

/* ──────── Main Component ──────── */

export default function RiskCameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { title } = route.params;
  const { addPhoto } = useRiskPhotos();
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) { return; }
    const photo = await cameraRef.current.takePhoto();
    const fileUri = `file://${photo.path}`;
    setPhotoPath(fileUri);
  }, []);

  const handleRetake = useCallback(() => {
    setPhotoPath(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (photoPath) {
      addPhoto(title, photoPath);
      navigation.goBack();
    }
  }, [photoPath, title, addPhoto, navigation]);

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

      {/* Camera Preview */}
      <View style={styles.cameraPreview}>
        {photoPath ? (
          <Image source={{ uri: photoPath }} style={styles.capturedImage} />
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
              onPress={handleRetake}>
              <Text style={styles.retakeButtonText}>다시 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              activeOpacity={0.8}
              onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>사용하기</Text>
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
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
  },
  guideText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },
});
