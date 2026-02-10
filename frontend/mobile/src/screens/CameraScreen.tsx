/* 현장 촬영 화면 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

/* ──────── Icon Components ──────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.arrowShaft} />
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

export default function CameraScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { mode } = route.params;
  const [alertVisible, setAlertVisible] = useState(true);

  const headerTitle = mode === 'all' ? '전체 촬영' : '작업자 환경 촬영';

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
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      {/* Camera Preview Area */}
      <View style={styles.cameraPreview}>
        {/* Camera Capture Button */}
        <TouchableOpacity style={styles.captureButton} activeOpacity={0.7}>
          <CameraIcon />
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      <View
        style={[
          styles.continueSection,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <TouchableOpacity style={styles.continueButton} activeOpacity={0.8}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Alert Dialog Modal */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialog}>
            {/* Content */}
            <View style={styles.dialogContent}>
              <Text style={styles.dialogTitle}>위험 감지!</Text>
              <Text style={styles.dialogDescription}>
                {'안전모가 감지되지 않았습니다.\n안전모를 착용해 주세요!'}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogButtonOutline}
                activeOpacity={0.7}
                onPress={() => setAlertVisible(false)}>
                <Text style={styles.dialogButtonOutlineText}>오류 전송</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogButtonFilled}
                activeOpacity={0.7}
                onPress={() => setAlertVisible(false)}>
                <Text style={styles.dialogButtonFilledText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  /* Header */
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

  /* Camera Preview */
  cameraPreview: {
    flex: 1,
    marginHorizontal: 15,
    backgroundColor: '#D9D9D9',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
  },
  captureButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
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

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dialog: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 20,
  },
  dialogContent: {
    gap: 16,
    alignItems: 'center',
  },
  dialogTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 16,
    color: '#1F2024',
    textAlign: 'center',
  },
  dialogDescription: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
    textAlign: 'center',
    lineHeight: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dialogButtonOutline: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonOutlineText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#006FFD',
  },
  dialogButtonFilled: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonFilledText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#FFFFFF',
  },
});
