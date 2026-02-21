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
    fontFamily: 'Inter',
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

  /* Card */
  card: {
    paddingHorizontal: 12,
  },
  cardBackground: {
    width: '100%',
    height: 214,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: '#EAF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.05)',
      },
    ],
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
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 20,
    color: '#000000',
    lineHeight: 24,
    flexShrink: 1,
  },
});
