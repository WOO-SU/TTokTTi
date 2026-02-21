import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { fetchWorkerReport, fetchSasUrl, type WorkerReport } from '../api/risk';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'RiskResult'>;
  route: RouteProp<HomeStackParamList, 'RiskResult'>;
};

const LEVEL_COLOR: Record<string, string> = {
  HIGH: '#E53E3E',
  MEDIUM: '#DD6B20',
  LOW: '#38A169',
};

const LEVEL_LABEL: Record<string, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
};

/* ──────── Main Component ──────── */

export default function RiskResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { assessment_id, worksession_id } = route.params;
  const [report, setReport] = useState<WorkerReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await fetchWorkerReport(assessment_id);
        setReport(data);
        // 이미지 SAS URL 병렬 발급
        if (data.images && data.images.length > 0) {
          const urls = await Promise.all(
            data.images.map(img => fetchSasUrl(img.blob_name)),
          );
          setImageUrls(urls);
        }
      } catch (err) {
        console.error('[RiskResult] 보고서 조회 실패:', err);
        setError('보고서를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [assessment_id]);

  const handleRegenerate = () => {
    navigation.replace('RiskCheck', { worksession_id });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="위험성 평가 결과" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006FFD" />
          <Text style={styles.loadingText}>보고서를 불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRegenerate}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}>

          {/* 업로드한 사진 */}
          {imageUrls.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>업로드한 사진</Text>
              <FlatList
                data={imageUrls}
                keyExtractor={(_, i) => String(i)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={{
                      width: SCREEN_WIDTH * 0.55,
                      height: SCREEN_WIDTH * 0.55,
                      borderRadius: 10,
                      backgroundColor: '#F0F0F0',
                    }}
                    resizeMode="cover"
                  />
                )}
              />
            </View>
          )}

          {/* 요약 메시지 */}
          {report?.short_message && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>요약</Text>
              <Text style={styles.summaryText}>{report.short_message}</Text>
            </View>
          )}

          {/* 위험 요소 */}
          {report?.top_risks && report.top_risks.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>주요 위험 요소</Text>
              {report.top_risks.map((risk, idx) => {
                const gradeUpper = (risk.risk_grade ?? '').toUpperCase();
                const color = LEVEL_COLOR[gradeUpper] ?? '#8F9098';
                const label = LEVEL_LABEL[gradeUpper] ?? risk.risk_grade;
                return (
                  <View key={idx} style={styles.hazardRow}>
                    <View style={[styles.levelBadge, { backgroundColor: color }]}>
                      <Text style={styles.levelBadgeText}>{label}</Text>
                    </View>
                    <Text style={styles.hazardText}>
                      {risk.title}{risk.expected_accident ? ` — ${risk.expected_accident}` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* 즉시 조치사항 */}
          {report?.immediate_actions && report.immediate_actions.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>즉시 조치사항</Text>
              {report.immediate_actions.map((action: string, idx: number) => (
                <View key={idx} style={styles.recRow}>
                  <Text style={styles.recBullet}>•</Text>
                  <Text style={styles.recText}>{action}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 재생성하기 */}
          <TouchableOpacity
            style={styles.regenerateButton}
            activeOpacity={0.8}
            onPress={handleRegenerate}>
            <Text style={styles.regenerateButtonText}>재생성하기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
    backgroundColor: '#F8F9FE',
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
  errorText: {
    fontFamily: 'Noto Sans KR',
    fontSize: 14,
    color: '#E53E3E',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#006FFD',
  },
  retryButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 14,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E9F1',
  },
  sectionTitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 16,
    color: '#1F2024',
  },
  summaryText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#3D3D3D',
    lineHeight: 22,
  },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  levelBadgeText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 11,
    color: '#FFFFFF',
  },
  hazardText: {
    flex: 1,
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#3D3D3D',
    lineHeight: 20,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recBullet: {
    fontSize: 14,
    color: '#006FFD',
    lineHeight: 20,
  },
  recText: {
    flex: 1,
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#3D3D3D',
    lineHeight: 20,
  },
  regenerateButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  regenerateButtonText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#006FFD',
  },
});
