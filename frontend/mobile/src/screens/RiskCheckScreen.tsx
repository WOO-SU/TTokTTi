import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { requestRiskAssess } from '../api/risk';
import { useRiskPhotos } from '../context/RiskPhotoContext';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'RiskCheck'>;
  route: RouteProp<HomeStackParamList, 'RiskCheck'>;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 20;
const PHOTO_GAP = 12;
const PHOTO_SIZE = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - PHOTO_GAP) / 2;

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

  const handleCapture = () => {
    navigation.navigate('RiskCamera', {
      title: `photo_${Date.now()}`,
      worksession_id,
      assessmentId,
    });
  };

  const handleRequest = async () => {
    if (!assessmentId) { return; }
    setIsRequesting(true);
    try {
      await requestRiskAssess(assessmentId);
      if (!isComponentMounted.current || !navigation.isFocused()) { return; }
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

  const hasAnyPhoto = photos.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="위험성 평가" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.guideText}>
          위험 요인 사진을 촬영하여 위험성 평가 보고서를 생성할 수 있습니다.
        </Text>

        {/* 사진 그리드 */}
        {hasAnyPhoto ? (
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo.uri }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <View style={styles.emptyIconLine} />
              <View style={[styles.emptyIconLine, styles.emptyIconLineH]} />
            </View>
            <Text style={styles.emptyText}>촬영된 사진이 없습니다</Text>
            <Text style={styles.emptySubText}>아래 촬영하기 버튼을 눌러 사진을 추가하세요</Text>
          </View>
        )}

        {/* 하단 버튼 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.captureButton}
            activeOpacity={0.8}
            onPress={handleCapture}>
            <Text style={styles.captureButtonText}>촬영하기</Text>
          </TouchableOpacity>

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
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────── Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
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
  /* 사진 그리드 */
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GAP,
  },
  photoThumbnail: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    backgroundColor: '#E8E9F0',
  },
  /* 빈 상태 */
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E9F0',
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F1F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyIconLine: {
    width: 18,
    height: 2.5,
    backgroundColor: '#C5C6CC',
    borderRadius: 2,
    position: 'absolute',
  },
  emptyIconLineH: {
    transform: [{ rotate: '90deg' }],
  },
  emptyText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 14,
    color: '#3D3D3D',
  },
  emptySubText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 12,
    color: '#9EA0A9',
  },
  /* 버튼 */
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  captureButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFB800',
  },
  requestButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestButtonDisabled: {
    backgroundColor: '#C5C6CC',
    borderColor: '#C5C6CC',
  },
  requestButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
