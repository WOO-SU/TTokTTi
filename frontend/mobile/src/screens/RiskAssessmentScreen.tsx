import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { checkLatestRisk } from '../api/risk';
import { useRiskPhotos } from '../context/RiskPhotoContext';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'RiskAssessment'>;
  route: RouteProp<HomeStackParamList, 'RiskAssessment'>;
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

/* ──────── Main Component ──────── */

export default function RiskAssessmentScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { worksession_id } = route.params;
  const { clearPhotos } = useRiskPhotos();

  useEffect(() => {
    async function checkAndNavigate() {
      try {
        const result = await checkLatestRisk(worksession_id);
        if (result.exists && result.assessment_id) {
          navigation.replace('RiskResult', {
            assessment_id: result.assessment_id,
            worksession_id,
          });
        } else {
          clearPhotos();
          navigation.replace('RiskCheck', { worksession_id });
        }
      } catch (err) {
        console.error('[RiskAssessment] checkLatestRisk 실패:', err);
        clearPhotos();
        navigation.replace('RiskCheck', { worksession_id });
      }
    }

    checkAndNavigate();
  }, [worksession_id, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="위험성 평가" />

      {/* 로딩 */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006FFD" />
        <Text style={styles.loadingText}>보고서를 확인 중입니다...</Text>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Noto Sans KR',
    fontSize: 14,
    color: '#71727A',
  },
});
