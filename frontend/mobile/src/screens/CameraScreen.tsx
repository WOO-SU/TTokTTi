/* 현장 촬영 화면 */
import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../App';
import {s, ms} from '../utils';
import {Colors, Fonts} from '../utils';

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

export default function CameraScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {mode} = route.params;
  const [alertVisible, setAlertVisible] = useState(true);

  const headerTitle = mode === 'all' ? '전체 촬영' : '작업자 환경 촬영';

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
          {paddingBottom: insets.bottom + s(16)},
        ]}>
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
    width: s(28),
    height: s(28),
    justifyContent: 'center',
    alignItems: 'center',
  },

  arrowShaft: {},
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
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  /* Header */
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

  /* Camera Preview */
  cameraPreview: {
    flex: 1,
    marginHorizontal: s(15),
    backgroundColor: Colors.bgGray,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: s(24),
  },
  captureButton: {
    width: s(58),
    height: s(58),
    borderRadius: s(29),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Continue Button */
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

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
  },
  dialog: {
    width: s(300),
    backgroundColor: Colors.white,
    borderRadius: s(16),
    padding: s(16),
    gap: s(20),
  },
  dialogContent: {
    gap: s(16),
    alignItems: 'center',
  },
  dialogTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '800',
    fontSize: ms(16),
    color: Colors.textDark,
    textAlign: 'center',
  },
  dialogDescription: {
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(12),
    color: Colors.textGray,
    textAlign: 'center',
    lineHeight: ms(16),
  },
  dialogActions: {
    flexDirection: 'row',
    gap: s(8),
  },
  dialogButtonOutline: {
    flex: 1,
    height: s(40),
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonOutlineText: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(12),
    color: Colors.primary,
  },
  dialogButtonFilled: {
    flex: 1,
    height: s(40),
    borderRadius: s(12),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonFilledText: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(12),
    color: Colors.white,
  },
});
