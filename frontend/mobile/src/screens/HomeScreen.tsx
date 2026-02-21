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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';

const characterImage = require('../assets/safety-character.png');
const equipmentImage = require('../assets/Risk-Assessment.png');
const riskAssessmentImage = require('../assets/tripod-character.png');

/* ──────────────── Icon Components ──────────────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.arrowTop} />
      <View style={iconStyles.arrowBottom} />
    </View>
  );
}

function ImagePlaceholderIcon() {
  return (
    <View style={iconStyles.placeholderContainer}>
      <View style={iconStyles.placeholderMountain} />
      <View style={iconStyles.placeholderSun} />
    </View>
  );
}

/* ──────────────── Main Component ──────────────── */

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkMenu'>>();
  const { worksession_id } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <BackArrowIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>작업 메뉴</Text>
        </View>

        {/* Banner 1: 안전 장비 점검 */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SafetyEquipmentCheck', { worksession_id })}>
          <View style={styles.bannerCard}>
            <Image
              source={equipmentImage}
              style={styles.bannerImage1}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>
              {'안전 장비 점검'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Banner 2: 위험성 평가 */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('RiskAssessment', { worksession_id })}>
          <View style={styles.bannerCard}>
            <Image
              source={riskAssessmentImage}
              style={styles.bannerImage2}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>
              {'위험성 평가'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Banner 3: 작업시작하기 (실시간 촬영) */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SelectMode')}>
          <View style={styles.bannerCard}>
            <Image
              source={characterImage}
              style={styles.bannerImage3}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>
              {'작업시작하기\n(실시간 촬영)'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Banner 4: 작업물 촬영 */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CaptureWork', { worksession_id })}>
          <View style={styles.bannerCard}>
            <Image
              source={characterImage}
              style={styles.bannerImage4}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>
              {'작업물 촬영'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Banner 4: 근무 마무리 */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EndWork', { worksession_id })}>
          <View style={styles.bannerCard}>
            <Image
              source={characterImage}
              style={styles.bannerImage4}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>
              {'근무 마무리'}
            </Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

/* ──────────────── Icon Styles ──────────────── */

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
    transform: [{ rotate: '-45deg' }, { translateY: -5.5 }],
  },
  arrowBottom: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 5.5 }],
  },
  placeholderContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  placeholderMountain: {
    width: 24,
    height: 16,
    borderWidth: 2,
    borderColor: '#006FFD',
    borderRadius: 2,
  },
  placeholderSun: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#006FFD',
    position: 'absolute',
    top: 8,
    right: 10,
  },
});

/* ──────────────── Main Styles ──────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    gap: 15,
    paddingBottom: 24,
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

  /* Banner */
  bannerSection: {
    paddingHorizontal: 12,
  },
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
    width: 224,
    height: 224,
  },
  bannerImage2: {
    width: 207,
    height: 207,
  },
  bannerImage3: {
    width: 206,
    height: 206,
  },
  bannerImage4: {
    width: 206,
    height: 206,
  },
  bannerText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 20,
    color: '#000000',
    lineHeight: 24,
    flexShrink: 1,
  },

  /* Products Section */
  productsSection: {
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#000000',
  },
  seeMoreText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#006FFD',
  },
  cardsContainer: {
    gap: 12,
  },

  /* Card */
  card: {
    width: 200,
    borderRadius: 16,
    backgroundColor: '#F8F9FE',
    overflow: 'hidden',
  },
  cardImageArea: {
    height: 120,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
    gap: 16,
  },
  cardTitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#1F2024',
    letterSpacing: 0.12,
  },
  cardSubtitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2024',
  },
});
