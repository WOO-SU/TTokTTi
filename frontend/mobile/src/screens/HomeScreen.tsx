import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const characterImage = require('../assets/safety-character.png');
const equipmentImage = require('../assets/Risk-Assessment.png');

/* ──────────────── Icon Components ──────────────── */

function SearchIcon() {
  return (
    <View style={iconStyles.searchContainer}>
      <View style={iconStyles.searchCircle} />
      <View style={iconStyles.searchHandle} />
    </View>
  );
}

function HeartIcon() {
  return (
    <View style={iconStyles.heartContainer}>
      <Text style={iconStyles.heartText}>♡</Text>
    </View>
  );
}

function MenuIcon() {
  return (
    <View style={iconStyles.menuContainer}>
      <View style={iconStyles.menuLine} />
      <View style={[iconStyles.menuLine, {width: 16}]} />
      <View style={iconStyles.menuLine} />
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

function HomeIcon({active}: {active: boolean}) {
  return (
    <View style={iconStyles.tabIconContainer}>
      <View
        style={[
          iconStyles.homeBase,
          {borderColor: active ? '#1F2024' : '#71727A'},
        ]}
      />
      <View
        style={[
          iconStyles.homeRoof,
          {borderBottomColor: active ? '#1F2024' : '#71727A'},
        ]}
      />
    </View>
  );
}

function PersonIcon() {
  return (
    <View style={iconStyles.tabIconContainer}>
      <View style={iconStyles.personHead} />
      <View style={iconStyles.personBody} />
    </View>
  );
}

function StarIcon() {
  return (
    <View style={iconStyles.tabIconContainer}>
      <Text style={iconStyles.starText}>☆</Text>
    </View>
  );
}

function SettingIcon() {
  return (
    <View style={iconStyles.tabIconContainer}>
      <Text style={iconStyles.settingText}>⚙</Text>
    </View>
  );
}

/* ──────────────── Main Component ──────────────── */

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Content */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, {paddingTop: insets.top + 24}]}>
          <TouchableOpacity style={styles.headerIcon}>
            <SearchIcon />
          </TouchableOpacity>
          <View style={styles.rightOptions}>
            <TouchableOpacity style={styles.headerIcon}>
              <HeartIcon />
            </TouchableOpacity>
            <TouchableOpacity>
              <View style={styles.menuIconWrapper}>
                <MenuIcon />
                {/* Badge */}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>9</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SelectMode')}>
          <View style={styles.bannerCard}>
            <Image
              source={characterImage}
              style={styles.characterImage}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>
              {'작업시작하기\n(실시간 촬영)'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 안전 장비 점검 Banner */}
        <TouchableOpacity
          style={styles.bannerSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('RiskAssessment')}>
          <View style={styles.bannerCard}>
            <Image
              source={equipmentImage}
              style={styles.characterImage}
              resizeMode="contain"
            />
            <Text style={styles.bannerText}>
              {'안전 장비 점검'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 근무 도우미 Section */}
        <View style={styles.productsSection}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>근무 도우미</Text>
            <TouchableOpacity>
              <Text style={styles.seeMoreText}>See more</Text>
            </TouchableOpacity>
          </View>

          {/* Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}>
            {/* Card 1: 위험성 평가 */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('RiskAssessment')}>
              <View style={styles.cardImageArea}>
                <ImagePlaceholderIcon />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>현황</Text>
                <Text style={styles.cardSubtitle}>위험성 평가</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: 알람 */}
            <TouchableOpacity style={styles.card} activeOpacity={0.8}>
              <View style={styles.cardImageArea}>
                <ImagePlaceholderIcon />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>휴식</Text>
                <Text style={styles.cardSubtitle}>알람</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────────────── Icon Styles ──────────────── */

const iconStyles = StyleSheet.create({
  searchContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1F2024',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  searchHandle: {
    width: 2,
    height: 6,
    backgroundColor: '#1F2024',
    position: 'absolute',
    bottom: 0,
    right: 1,
    transform: [{rotate: '-45deg'}],
    borderRadius: 1,
  },
  heartContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartText: {
    fontSize: 22,
    color: '#1F2024',
    lineHeight: 24,
  },
  menuContainer: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1F2024',
    borderRadius: 1,
    alignSelf: 'flex-end',
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
  tabIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBase: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 0,
  },
  personHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#71727A',
    position: 'absolute',
    top: 0,
  },
  personBody: {
    width: 14,
    height: 8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#71727A',
    position: 'absolute',
    bottom: 0,
  },
  starText: {
    fontSize: 20,
    color: '#71727A',
    lineHeight: 22,
  },
  settingText: {
    fontSize: 18,
    color: '#71727A',
    lineHeight: 20,
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
    paddingBottom: 24,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 10,
    color: '#FFFFFF',
  },

  /* Banner */
  bannerSection: {
    paddingHorizontal: 12,
    marginBottom : 30,
  },
  bannerCard: {
    width: '100%',
    height: 214,
    backgroundColor: '#EAF2FF',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  characterImage: {
    width: 206,
    height: 206,
  },
  bannerText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 20,
    color: '#000000',
    lineHeight: 28,
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
    width: (SCREEN_WIDTH - 32 - 12) / 2,
    borderRadius: 16,
    backgroundColor: '#F8F9FF',
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
    gap: 4,
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
