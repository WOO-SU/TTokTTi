import React, { useState, useRef, useCallback } from 'react';
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
import { requestRiskAssess } from '../api/risk';

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

/* ──────── Icon Components ──────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.backArrowTop} />
      <View style={iconStyles.backArrowBottom} />
    </View>
  );
}

function CheckIcon() {
  return (
    <View style={iconStyles.checkContainer}>
      <View style={iconStyles.checkShort} />
      <View style={iconStyles.checkLong} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function RiskCheckScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { worksession_id } = route.params;
  const [items, setItems] = useState<CheckItem[]>(INITIAL_ITEMS);
  const [isRequesting, setIsRequesting] = useState(false);

  // assessment_id는 RiskCamera에서 첫 사진 업로드 후 params로 전달됨
  const assessmentIdRef = useRef<number | undefined>(
    route.params.assessmentId,
  );

  // RiskCamera에서 goBack() 후 assessmentId 업데이트 반영
  useFocusEffect(
    useCallback(() => {
      const newId = route.params.assessmentId;
      if (newId !== undefined) {
        assessmentIdRef.current = newId;
      }
    }, [route.params.assessmentId]),
  );

  const handleCardPress = (title: string) => {
    navigation.navigate('RiskCamera', {
      title,
      worksession_id,
      assessmentId: assessmentIdRef.current,
    });
  };

  // 카드를 촬영 완료된 것으로 표시 (RiskCamera가 navigate back할 때 처리 필요)
  // 현재는 간단히 navigate 후 focus 시 업데이트
  useFocusEffect(
    useCallback(() => {
      // assessmentId가 생기면 촬영된 항목 표시는 RiskCamera가 params로 completedTitle 전달
      const completedTitle = (route.params as any).completedTitle;
      if (completedTitle) {
        setItems(prev =>
          prev.map(item =>
            item.title === completedTitle
              ? { ...item, hasPhoto: true }
              : item,
          ),
        );
      }
    }, [(route.params as any).completedTitle]),
  );

  const hasAnyPhoto = items.some(item => item.hasPhoto);

  const handleRequest = async () => {
    const assessmentId = assessmentIdRef.current;
    if (!assessmentId) { return; }
    setIsRequesting(true);
    try {
      await requestRiskAssess(assessmentId);
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
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

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
        <Text style={styles.pageTitle}>위험성 평가</Text>
      </View>

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
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.equipmentCard,
                    item.hasPhoto && styles.equipmentCardDone,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress(item.title)}>
                  <View
                    style={[
                      styles.cardBorder,
                      item.hasPhoto && styles.cardBorderDone,
                    ]}
                  />
                  <Image
                    source={item.image}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardLabel}>{item.title}</Text>
                    <View
                      style={[
                        styles.checkbox,
                        item.hasPhoto
                          ? styles.checkboxChecked
                          : styles.checkboxUnchecked,
                      ]}>
                      {item.hasPhoto && <CheckIcon />}
                    </View>
                  </View>
                </TouchableOpacity>
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
  checkContainer: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkShort: {
    width: 5,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    bottom: 1,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    width: 9,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    position: 'absolute',
    right: 0,
    bottom: 2.5,
    transform: [{ rotate: '-45deg' }],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
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
  pageTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#1F2024',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  guideText: {
    fontFamily: 'Inter',
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
  equipmentCard: {
    width: 154.5,
    height: 154.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  equipmentCardDone: {
    opacity: 0.85,
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: '#EAF2FF',
  },
  cardBorderDone: {
    borderColor: '#006FFD',
  },
  cardImage: {
    width: 100,
    height: 100,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cardLabel: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 15,
    color: '#000000',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#006FFD',
    borderWidth: 1.5,
    borderColor: '#006FFD',
  },
  checkboxUnchecked: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#C5C6CC',
  },
  requestButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestButtonDisabled: {
    backgroundColor: '#C5C6CC',
  },
  requestButtonText: {
    fontFamily: 'Roboto',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
