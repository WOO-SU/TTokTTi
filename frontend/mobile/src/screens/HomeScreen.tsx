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
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import MenuBanner from '../components/MenuBanner';


const equipmentImage = require('../assets/Risk-Assessment.png');
const riskAssessmentImage = require('../assets/riskAssessment.png');
const workstartImage = require('../assets/workstart.png');
const targetPictureImage = require('../assets/targetpicture.png');
const endWorkImage = require('../assets/safety-character.png');

/* ──────────────── Icon Components ──────────────── */

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
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'WorkMenu'>>();
  const { worksession_id } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FE" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 88 }]}
        bounces={false}
        showsVerticalScrollIndicator={false}>

        <TopHeader title="작업 메뉴" />

        <MenuBanner
          title="안전 장비 점검"
          imageSource={equipmentImage}
          imageStyle={styles.bannerImage1}
          onPress={() => navigation.navigate('SafetyEquipmentCheck', { worksession_id })}
        />

        <MenuBanner
          title="위험성 평가"
          imageSource={riskAssessmentImage}
          imageStyle={styles.bannerImage2}
          onPress={() => navigation.navigate('RiskAssessment', { worksession_id })}
        />

        <MenuBanner
          title="작업물 촬영"
          imageSource={targetPictureImage}
          imageStyle={styles.bannerImage4}
          onPress={() => navigation.navigate('CaptureWork', { worksession_id })}
        />

        <MenuBanner
          title={'작업시작하기\n(실시간 촬영)'}
          imageSource={workstartImage}
          imageStyle={styles.bannerImage3}
          onPress={() => navigation.navigate('SelectMode')}
        />

        <MenuBanner
          title="근무 마무리"
          imageSource={endWorkImage}
          imageStyle={styles.bannerImage4}
          onPress={() => navigation.navigate('EndWork', { worksession_id })}
        />

      </ScrollView>
    </View>
  );
}

/* ──────────────── Icon Styles ──────────────── */

const iconStyles = StyleSheet.create({
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
    backgroundColor: '#F8F9FE',
  },
  scrollContent: {
    flexGrow: 1,
    gap: 15,
    paddingBottom: 24,
  },

  bannerImage1: {
    width: 140,
    height: 140,
  },
  bannerImage2: {
    width: 130,
    height: 130,
  },
  bannerImage3: {
    width: 130,
    height: 130,
  },
  bannerImage4: {
    width: 130,
    height: 130,
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
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 14,
    color: '#000000',
  },
  seeMoreText: {
    fontFamily: 'Noto Sans KR',
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
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 12,
    color: '#1F2024',
    letterSpacing: 0.12,
  },
  cardSubtitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2024',
  },
});
