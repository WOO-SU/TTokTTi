import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { requestRiskAssess } from '../api/risk';
import CheckCard from '../components/CheckCard';
import { useRiskPhotos } from '../context/RiskPhotoContext';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'RiskCheck'>;
  route: RouteProp<HomeStackParamList, 'RiskCheck'>;
};

type CheckItem = {
  id: string;
  title: string;
  hasPhoto: boolean;
  image: any;
};

const INITIAL_ITEMS: CheckItem[] = [
  {
    id: '1',
    title: '작업공간',
    hasPhoto: false,
    image: require('../assets/env.png'),
  },
  {
    id: '2',
    title: '사다리',
    hasPhoto: false,
    image: require('../assets/ladder.png'),
  },
  {
    id: '3',
    title: '통신함',
    hasPhoto: false,
    image: require('../assets/box.png'),
  },
];

/* ──────── Main Component ──────── */

export default function RiskCheckScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { worksession_id } = route.params;
  const { photos, assessmentId } = useRiskPhotos();
  const [isRequesting, setIsRequesting] = useState(false);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => { isComponentMounted.current = false; };
  }, []);

  const handleCardPress = (title: string) => {
    navigation.navigate('RiskCamera', {
      title,
      worksession_id,
      assessmentId: assessmentId,
    });
  };

  const displayItems = INITIAL_ITEMS.map(item => ({
    ...item,
    hasPhoto: photos.some(p => p.title === item.title),
  }));

  const hasAnyPhoto = displayItems.some(item => item.hasPhoto);

  const handleRequest = async () => {
    if (!assessmentId) { return; }
    setIsRequesting(true);
    try {
      await requestRiskAssess(assessmentId);
      if (!isComponentMounted.current || !navigation.isFocused()) return;
      navigation.replace('RiskResult', {
        assessment_id: assessmentId,
        worksession_id,
      });
    } catch (err) {
      console.error('[RiskCheck] 요청하기 실패:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  const rows: CheckItem[][] = [];
  for (let i = 0; i < displayItems.length; i += 2) {
    rows.push(displayItems.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="위험성 평가" />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.guideText}>
          각 항목을 촬영하면 위험성 평가 보고서를 생성할 수 있습니다.
        </Text>

        <View style={styles.gridContainer}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map(item => (
                <CheckCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  isChecked={item.hasPhoto}
                  onPress={() => handleCardPress(item.title)}
                />
              ))}
            </View>
          ))}
        </View>

        {/* 요청하기 Button */}
        <TouchableOpacity
          style={[
            styles.requestButton,
            (!hasAnyPhoto || isRequesting) && styles.requestButtonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={!hasAnyPhoto || isRequesting}
          onPress={handleRequest}>
          {isRequesting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.requestButtonText}>요청하기</Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: '#FFB800',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }, { translateY: -5.5 }],
  },
  backArrowBottom: {
    width: 14,
    height: 2,
    backgroundColor: '#FFB800',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 5.5 }],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  guideText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
    lineHeight: 20,
  },
  gridContainer: {
    gap: 20,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  requestButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestButtonDisabled: {
    backgroundColor: '#C5C6CC',
  },
  requestButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
