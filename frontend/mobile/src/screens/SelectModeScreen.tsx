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
import type { CompositeNavigationProp } from '@react-navigation/native';
import { HomeStackParamList, RootStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import MenuBanner from '../components/MenuBanner';

const tripodImage = require('../assets/tripod-character.png');
const ladderImage = require('../assets/ladder-character.png');

type Props = {
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList, 'SelectMode'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

/* ──────── Main Component ──────── */

export default function SelectModeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="사용 방식 선택" />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {/* Card 1: 전체 */}
          <MenuBanner
            title="전체"
            imageSource={tripodImage}
            imageStyle={styles.cardImage1}
            onPress={() => navigation.navigate('Camera', { mode: 'all' })}
          />

          {/* Card 2: 작업자 */}
          <MenuBanner
            title="작업자"
            imageSource={ladderImage}
            imageStyle={styles.cardImage2}
            onPress={() => navigation.navigate('Camera', { mode: 'worker' })}
          />
        </View>
      </ScrollView>
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
  backArrowTop: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }, { translateY: -5.5 }],
  },
  backArrowBottom: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 5.5 }],
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
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 18,
    color: '#1F2024',
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

  cardImage1: {
    width: 120,
    height: 120,
    position: 'absolute',
    right: 5,
    bottom: -10,
  },
  cardImage2: {
    width: 130,
    height: 130,
    position: 'absolute',
    right: 5,
    bottom: -10,
  },
});
