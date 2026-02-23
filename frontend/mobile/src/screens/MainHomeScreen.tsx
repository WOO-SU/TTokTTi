/* 메인 홈 화면 - 오늘의 작업 목록 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import TopHeader from '../components/TopHeader';
import {
  getTodayWorkSessions,
  activateWorkSession,
  type WorkSessionItem,
  type WorkSessionStatus,
} from '../api/worksession';

type TaskStatus = 'completed' | 'in_progress' | 'pending';

/** 백엔드 status → 프론트 status 매핑 */
const STATUS_MAP: Record<WorkSessionStatus, TaskStatus> = {
  DONE: 'completed',
  IN_PROGRESS: 'in_progress',
  READY: 'pending',
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  completed: { label: '작업 완료', bg: '#00FFAE', text: '#000000', icon: '✓' },
  in_progress: {
    label: '작업 중',
    bg: '#006FFD',
    text: '#FFFFFF',
    icon: '▷',
  },
  pending: { label: '작업 전', bg: '#8F9098', text: '#FFFFFF', icon: '◷' },
};

/** datetime 문자열에서 HH:MM 추출 */
function formatTime(datetime: string | null): string {
  if (!datetime) return '--:--';
  const date = new Date(datetime);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** 오늘 날짜를 'M월 D일 (요일)' 형식으로 반환 */
function formatToday(): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

/* ──────── Icon Components ──────── */

function ClockIcon() {
  return (
    <View style={iconStyles.clockContainer}>
      <View style={iconStyles.clockCircle} />
      <View style={iconStyles.clockHandV} />
      <View style={iconStyles.clockHandH} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function MainHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { userName } = useAuth();

  const [sessions, setSessions] = useState<WorkSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  // 화면 포커스 시 마다 오늘의 작업 목록 새로고침
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getTodayWorkSessions()
        .then(data => {
          if (active) setSessions(data);
        })
        .catch(() => {
          if (active) setSessions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  const handleTaskPress = async (session: WorkSessionItem) => {
    const status = STATUS_MAP[session.status];

    if (status === 'pending') {
      setShowPendingModal(true);
      return;
    }
    if (status === 'completed') {
      setShowCompletedModal(true);
      return;
    }

    // in_progress → activate 호출 후 WorkMenu 이동
    try {
      await activateWorkSession(session.id);
      navigation.navigate('WorkMenu', { worksession_id: session.id });
    } catch {
      // activate 실패 시에도 WorkMenu 이동 (이미 IN_PROGRESS인 경우)
      navigation.navigate('WorkMenu', { worksession_id: session.id });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}>

        <TopHeader
          title="작업 리스트"
          showBackButton={false}
          rightComponent={
            <Text style={styles.headerMeta}>
              {formatToday()}{!loading && sessions.length > 0 ? ` · ${sessions.length}건` : ''}
            </Text>
          }
        />

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>{userName ?? '사용자'}님의 오늘 작업</Text>
          <Text style={styles.subtitleText}>화이팅하세요!</Text>
        </View>

        {/* Task Cards */}
        <View style={styles.taskList}>
          {loading ? (
            <ActivityIndicator size="large" color="#006FFD" style={{ marginTop: 40 }} />
          ) : sessions.length === 0 ? (
            <Text style={styles.emptyText}>오늘 배정된 작업이 없습니다.</Text>
          ) : (
            sessions.map(session => {
              const status = STATUS_MAP[session.status];
              const config = STATUS_CONFIG[status];
              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.taskCard}
                  activeOpacity={0.8}
                  onPress={() => handleTaskPress(session)}>
                  {/* Task Image */}
                  <View style={styles.taskImageWrapper}>
                    <Image
                      source={require('../assets/box.png')}
                      style={styles.taskImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Task Info */}
                  <View style={styles.taskInfo}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskTitle}>{session.name}</Text>
                    </View>
                    <View style={styles.taskTime}>
                      <ClockIcon />
                      <Text style={styles.taskTimeText}>
                        {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge at Bottom Right */}
                  <View style={styles.statusBadgeContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                      <Text style={styles.statusIcon}>{config.icon}</Text>
                      <Text style={[styles.statusText, { color: config.text }]}>
                        {config.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 작업 전 팝업 */}
      <Modal
        visible={showPendingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPendingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalTextArea}>
                <Text style={styles.modalTitle}>아직 작업 전이에요!</Text>
                <Text style={styles.modalDesc}>뒤로 돌아가 주세요</Text>
              </View>
              <Image
                source={require('../assets/confused_character.png')}
                style={styles.modalCharacter}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.modalFilledBtn}
              activeOpacity={0.8}
              onPress={() => setShowPendingModal(false)}>
              <Text style={styles.modalFilledBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 작업 완료 팝업 */}
      <Modal
        visible={showCompletedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalTextArea}>
                <Text style={styles.modalTitle}>작업이 완료되었어요!</Text>
                <Text style={styles.modalDesc}>뒤로 돌아가 주세요</Text>
              </View>
              <Image
                source={require('../assets/clear.png')}
                style={styles.modalCharacter}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.modalFilledBtn}
              activeOpacity={0.8}
              onPress={() => setShowCompletedModal(false)}>
              <Text style={styles.modalFilledBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  clockContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#71727A',
  },
  clockHandV: {
    width: 1.5,
    height: 4,
    backgroundColor: '#71727A',
    position: 'absolute',
    top: 3,
    borderRadius: 1,
  },
  clockHandH: {
    width: 3,
    height: 1.5,
    backgroundColor: '#71727A',
    position: 'absolute',
    top: 7,
    left: 8,
    borderRadius: 1,
  },
});

/* ──────── Main Styles ──────── */

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

  /* Title */
  titleSection: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
    marginTop: -4,
  },
  titleText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 18,
    color: '#1F2024',
  },
  subtitleText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },

  /* Task List */
  taskList: {
    paddingHorizontal: 20,
    gap: 10,
  },

  /* Task Card */
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    position: 'relative',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  taskImageWrapper: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  taskImage: {
    width: 50,
    height: 50,
  },
  taskInfo: {
    flex: 1,
    gap: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 16,
    color: '#1F2024',
  },
  statusBadgeContainer: {
    position: 'absolute',
    bottom: 12,
    right: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  statusText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 12,
  },
  taskTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTimeText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 13,
    color: '#71727A',
  },

  /* Header Meta (날짜 · 건수) */
  headerMeta: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 12,
    color: '#71727A',
  },

  /* Empty State */
  emptyText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
    textAlign: 'center',
    marginTop: 40,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  modalContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTextArea: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  modalTitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '800',
    fontSize: 16,
    color: '#1F2024',
    textAlign: 'center',
    letterSpacing: 0.08,
  },
  modalCharacter: {
    width: 87,
    height: 87,
  },
  modalDesc: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
    textAlign: 'center',
    letterSpacing: 0.12,
    lineHeight: 16,
  },
  modalFilledBtn: {
    height: 40,
    borderRadius: 12,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFilledBtnText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 12,
    color: '#FFFFFF',
  },
});
