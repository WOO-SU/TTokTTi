/* 현장 촬영 화면 */
import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../App';

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
  const [isRecording, setIsRecording] = useState(false);

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();
  const {
    hasPermission: hasMicPermission,
    requestPermission: requestMicPermission,
  } = useMicrophonePermission();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
    if (!hasMicPermission) {
      requestMicPermission();
    }
  }, [hasPermission, requestPermission, hasMicPermission, requestMicPermission]);

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
});
