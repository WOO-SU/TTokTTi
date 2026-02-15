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
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {s, ms} from '../utils';
import {Colors, Fonts} from '../utils';

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

export default function SelectModeScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Nav Bar */}
      <View style={[styles.navBar, {paddingTop: insets.top}]}>
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
        style={{flex: 1}}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {/* Card 1: 전체 */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Camera', {mode: 'all'})}>
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
            onPress={() => navigation.navigate('Camera', {mode: 'worker'})}>
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
    width: s(20),
    height: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowTop: {
    width: s(12),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    transform: [{rotate: '-45deg'}, {translateY: s(-3.5)}],
  },
  backArrowBottom: {
    width: s(12),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    transform: [{rotate: '45deg'}, {translateY: s(3.5)}],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  /* Nav Bar */
  navBar: {
    height: s(56),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(24),
    backgroundColor: Colors.white,
  },
  backButton: {
    width: s(20),
    height: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '700',
    fontSize: ms(14),
    color: Colors.textDark,
    textAlign: 'center',
  },

  /* Content */
  scrollContent: {
    flexGrow: 1,
    paddingTop: s(24),
    paddingBottom: s(24),
  },
  cardsContainer: {
    paddingHorizontal: 0,
    gap: s(20),
  },

  /* Card */
  card: {
    paddingHorizontal: s(20),
  },
  cardBackground: {
    width: '100%',
    height: s(214),
    backgroundColor: Colors.primaryLight,
    borderRadius: s(50),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: s(16),
  },
  cardImage1: {
    width: s(181),
    height: s(181),
  },
  cardImage2: {
    width: s(195),
    height: s(195),
  },
  cardText: {
    fontFamily: Fonts.actor,
    fontWeight: '400',
    fontSize: ms(36),
    color: Colors.black,
    flex: 1,
    textAlign: 'center',
  },
});
