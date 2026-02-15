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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {s, ms, SCREEN_WIDTH} from '../utils';
import {Colors, Fonts} from '../utils';

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
      <View style={[iconStyles.menuLine, {width: s(16)}]} />
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
          {borderColor: active ? Colors.textDark : Colors.textGray},
        ]}
      />
      <View
        style={[
          iconStyles.homeRoof,
          {borderBottomColor: active ? Colors.textDark : Colors.textGray},
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Content */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, {paddingTop: insets.top + s(24)}]}>
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
            <Text style={styles.bannerText}>{'안전 장비 점검'}</Text>
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
    width: s(20),
    height: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCircle: {
    width: s(14),
    height: s(14),
    borderRadius: s(7),
    borderWidth: 2,
    borderColor: Colors.textDark,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  searchHandle: {
    width: s(2),
    height: s(6),
    backgroundColor: Colors.textDark,
    position: 'absolute',
    bottom: 0,
    right: s(1),
    transform: [{rotate: '-45deg'}],
    borderRadius: s(1),
  },
  heartContainer: {
    width: s(24),
    height: s(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartText: {
    fontSize: ms(22),
    color: Colors.textDark,
    lineHeight: ms(24),
  },
  menuContainer: {
    width: s(24),
    height: s(18),
    justifyContent: 'space-between',
  },
  menuLine: {
    width: s(20),
    height: s(2),
    backgroundColor: Colors.textDark,
    borderRadius: s(1),
    alignSelf: 'flex-end',
  },
  placeholderContainer: {
    width: s(40),
    height: s(40),
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  placeholderMountain: {
    width: s(24),
    height: s(16),
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: s(2),
  },
  placeholderSun: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    borderWidth: 2,
    borderColor: Colors.primary,
    position: 'absolute',
    top: s(8),
    right: s(10),
  },
  tabIconContainer: {
    width: s(20),
    height: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBase: {
    width: s(14),
    height: s(10),
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: s(2),
    borderBottomRightRadius: s(2),
    position: 'absolute',
    bottom: 0,
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: s(10),
    borderRightWidth: s(10),
    borderBottomWidth: s(8),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 0,
  },
  personHead: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    borderWidth: 1.5,
    borderColor: Colors.textGray,
    position: 'absolute',
    top: 0,
  },
  personBody: {
    width: s(14),
    height: s(8),
    borderTopLeftRadius: s(7),
    borderTopRightRadius: s(7),
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: Colors.textGray,
    position: 'absolute',
    bottom: 0,
  },
  starText: {
    fontSize: ms(20),
    color: Colors.textGray,
    lineHeight: ms(22),
  },
  settingText: {
    fontSize: ms(18),
    color: Colors.textGray,
    lineHeight: ms(20),
  },
});

/* ──────────────── Main Styles ──────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: s(24),
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingBottom: s(24),
    backgroundColor: Colors.white,
  },
  headerIcon: {
    width: s(24),
    height: s(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(16),
  },
  menuIconWrapper: {
    width: s(24),
    height: s(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: s(-6),
    right: s(-6),
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(10),
    color: Colors.white,
  },

  /* Banner */
  bannerSection: {
    paddingHorizontal: s(12),
    marginBottom: s(30),
  },
  bannerCard: {
    width: '100%',
    height: s(214),
    backgroundColor: Colors.primaryLight,
    borderRadius: s(50),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    overflow: 'hidden',
  },
  characterImage: {
    width: s(206),
    height: s(206),
  },
  bannerText: {
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(20),
    color: Colors.black,
    lineHeight: ms(28),
    flexShrink: 1,
  },

  /* Products Section */
  productsSection: {
    paddingTop: s(24),
    paddingHorizontal: s(16),
    gap: s(16),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '700',
    fontSize: ms(14),
    color: Colors.black,
  },
  seeMoreText: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(12),
    color: Colors.primary,
  },
  cardsContainer: {
    gap: s(12),
  },

  /* Card */
  card: {
    width: (SCREEN_WIDTH - s(32) - s(12)) / 2,
    borderRadius: s(16),
    backgroundColor: Colors.bgCard,
    overflow: 'hidden',
  },
  cardImageArea: {
    height: s(120),
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: s(16),
    gap: s(4),
  },
  cardTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(12),
    color: Colors.textDark,
    letterSpacing: ms(0.12),
  },
  cardSubtitle: {
    fontFamily: Fonts.inter,
    fontWeight: '700',
    fontSize: ms(14),
    color: Colors.textDark,
  },
});
