import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useRiskPhotos } from '../context/RiskPhotoContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RiskResult'>;
};

/* ──────── Icon Components ──────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.backArrowTop} />
      <View style={iconStyles.backArrowBottom} />
    </View>
  );
}

function CameraIcon() {
  return (
    <View style={iconStyles.cameraContainer}>
      <View style={iconStyles.cameraBody}>
        <View style={iconStyles.cameraLens} />
      </View>
      <View style={iconStyles.cameraFlash} />
    </View>
  );
}

function WarningIcon() {
  return (
    <View style={iconStyles.warningContainer}>
      <View style={iconStyles.warningTriangle} />
      <View style={iconStyles.warningExclamation}>
        <View style={iconStyles.warningLine} />
        <View style={iconStyles.warningDot} />
      </View>
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function RiskResultScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { photos } = useRiskPhotos();

  const hasPhotos = photos.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Nav Bar */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>위험성 평가</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.headerTitle}>공사현장 안전 분석</Text>
        <Text style={styles.headerSubtitle}>
          공사 현장 사진을 업로드하면 AI가 위험 요소를 분석합니다
        </Text>

        {/* 현장 사진 Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>현장 사진</Text>
          {hasPhotos ? (
            <View style={styles.photoGrid}>
              {photos.map(photo => (
                <View key={photo.title} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.photoLabel}>{photo.title}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.uploadArea}>
              <CameraIcon />
              <Text style={styles.uploadText}>등록된 사진이 없습니다.</Text>
              <Text style={styles.uploadHint}>사진을 촬영해 주세요.</Text>
            </View>
          )}
        </View>

        {/* 요청하기 Button */}
        <TouchableOpacity style={styles.requestButton} activeOpacity={0.8}>
          <Text style={styles.requestButtonText}>요청하기</Text>
        </TouchableOpacity>

        {/* 분석 결과 Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>분석 결과</Text>
          <View style={styles.resultPlaceholder}>
            <WarningIcon />
            <Text style={styles.resultPlaceholderText}>
              사진을 업로드하고 분석을 시작하세요
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  backContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowTop: {
    width: 12,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }, { translateY: -4.5 }],
  },
  backArrowBottom: {
    width: 12,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 4.5 }],
  },
  cameraContainer: {
    width: 48,
    height: 40,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cameraBody: {
    width: 40,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C5C6CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLens: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#C5C6CC',
  },
  cameraFlash: {
    width: 14,
    height: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#C5C6CC',
    position: 'absolute',
    top: 0,
  },
  warningContainer: {
    width: 48,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 24,
    borderRightWidth: 24,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E8E9F1',
    borderRadius: 4,
  },
  warningExclamation: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 8,
  },
  warningLine: {
    width: 3,
    height: 14,
    backgroundColor: '#8F9098',
    borderRadius: 1.5,
  },
  warningDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8F9098',
    marginTop: 3,
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },

  /* Nav Bar */
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4D6DD',
    gap: 8,
  },
  backButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2024',
  },

  /* Content */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },

  /* Header */
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    color: '#1F2024',
  },
  headerSubtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
    lineHeight: 20,
    marginTop: -8,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E8E9F1',
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#1F2024',
  },

  /* Photo Grid */
  photoGrid: {
    gap: 12,
  },
  photoItem: {
    gap: 8,
  },
  photoImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E8E9F1',
  },
  photoLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#1F2024',
  },

  /* Upload Area */
  uploadArea: {
    borderWidth: 2,
    borderColor: '#D4D6DD',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#71727A',
    marginTop: 8,
  },
  uploadHint: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#8F9098',
  },

  /* Request Button */
  requestButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0F62FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestButtonText: {
    fontFamily: 'Roboto',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  /* Result Placeholder */
  resultPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  resultPlaceholderText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#8F9098',
  },
});
