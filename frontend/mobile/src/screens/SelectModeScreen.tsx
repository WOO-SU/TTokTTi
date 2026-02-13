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

const tripodImage = require('../assets/tripod-character.png');
const ladderImage = require('../assets/ladder-character.png');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SelectMode'>;
};

/* ──────── Back Arrow Icon ──────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.backArrowTop} />
      <View style={iconStyles.backArrowBottom} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function SelectModeScreen({ navigation }: Props) {
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
        <Text style={styles.pageTitle}>사용 방식 선택</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {/* Card 1: 전체 */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Camera', { mode: 'all' })}>
            <View style={styles.cardBackground}>
              <Image
                source={tripodImage}
                style={styles.cardImage1}
                resizeMode="contain"
              />
              <Text style={styles.cardText}>전체</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: 작업자 */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Camera', { mode: 'worker' })}>
            <View style={styles.cardBackground}>
              <Image
                source={ladderImage}
                style={styles.cardImage2}
                resizeMode="contain"
              />
              <Text style={styles.cardText}>작업자</Text>
            </View>
          </TouchableOpacity>
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
    transform: [{ rotate: '-45deg' }, { translateY: -3.5 }],
  },
  backArrowBottom: {
    width: 12,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 3.5 }],
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
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
    textAlign: 'center',
  },

  /* Content */
  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 24,
  },
  cardsContainer: {
    paddingHorizontal: 0,
    gap: 20,
  },

  /* Card */
  card: {
    paddingHorizontal: 20,
  },
  cardBackground: {
    width: '100%',
    height: 214,
    backgroundColor: '#EAF2FF',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  cardImage1: {
    width: 181,
    height: 181,
  },
  cardImage2: {
    width: 195,
    height: 195,
  },
  cardText: {
    fontFamily: 'Actor',
    fontWeight: '400',
    fontSize: 36,
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
});
