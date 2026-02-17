import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RiskAssessment'>;
};

const cameraImage = require('../assets/camera.png');
const resultImage = require('../assets/result.png');

/* ──────── Icon Components ──────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.backArrowTop} />
      <View style={iconStyles.backArrowBottom} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function RiskAssessmentScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

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

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        {/* Banner 1: 촬영하기 */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('RiskCheck')}>
          <View style={styles.bannerCard}>
            <Image
              source={cameraImage}
              style={styles.bannerImage1}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>촬영하기</Text>
          </View>
        </TouchableOpacity>

        {/* Banner 2: 결과 */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('RiskResult')}>
          <View style={styles.bannerCard}>
            <Image
              source={resultImage}
              style={styles.bannerImage2}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>결과</Text>
          </View>
        </TouchableOpacity>
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
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    flexGrow: 1,
    gap: 15,
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 24,
  },

  /* Banner */
  bannerSection: {},
  bannerCard: {
    width: '100%',
    height: 214,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: '#EAF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.25)',
        outset: true,
      },
    ],
  },
  bannerImage1: {
    width: 206,
    height: 206,
  },
  bannerImage2: {
    width: 207,
    height: 207,
  },
  bannerText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 20,
    color: '#000000',
    lineHeight: 24,
    flexShrink: 1,
  },
});
