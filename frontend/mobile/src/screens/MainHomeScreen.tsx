/* 메인 홈 화면 - 오늘의 작업 목록 */

import React, { useState, useEffect, useCallback } from 'react';
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
    label: '작업 시작하기',
    bg: '#006FFD',
    text: '#FFFFFF',
    icon: '▷',
  },
  pending: { label: '작업 전', bg: '#0F62FE', text: '#FFFFFF', icon: '◷' },
};

/** datetime 문자열에서 HH:MM 추출 */
function formatTime(datetime: string | null): string {
  if (!datetime) return '--:--';
  const date = new Date(datetime);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/* ──────── Icon Components ──────── */

function SearchIcon() {
  return (
    <View style={iconStyles.searchContainer}>
      <View style={iconStyles.searchCircle} />
      <View style={iconStyles.searchHandle} />
    </View>
  );
}

function HeartIcon() {
  return (
    <View style={iconStyles.heartContainer}>
      <Text style={iconStyles.heartText}>♡</Text>
    </View>
  );
}

function MenuIcon() {
  return (
    <View style={iconStyles.menuContainer}>
      <View style={iconStyles.menuLine} />
      <View style={[iconStyles.menuLine, { width: 16 }]} />
      <View style={iconStyles.menuLine} />
    </View>
  );
}

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
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <TouchableOpacity style={styles.headerIcon}>
            <SearchIcon />
          </TouchableOpacity>
          <View style={styles.rightOptions}>
            <TouchableOpacity style={styles.headerIcon}>
              <HeartIcon />
            </TouchableOpacity>
            <TouchableOpacity>
              <View style={styles.menuIconWrapper}>
                <MenuIcon />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>9</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>
            오늘 {userName ?? '사용자'}님의 작업
          </Text>
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
  searchContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1F2024',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  searchHandle: {
    width: 2,
    height: 6,
    backgroundColor: '#1F2024',
    position: 'absolute',
    bottom: 0,
    right: 1,
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },
  heartContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartText: {
    fontSize: 22,
    color: '#1F2024',
    lineHeight: 24,
  },
  menuContainer: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1F2024',
    borderRadius: 1,
    alignSelf: 'flex-end',
  },
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    gap: 16,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 10,
    color: '#FFFFFF',
  },

  /* Title */
  titleSection: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
  titleText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 18,
    color: '#000000',
  },
  subtitleText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },

  /* Task List */
  taskList: {
    paddingHorizontal: 12,
    gap: 12,
  },

  /* Task Card */
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    position: 'relative',
    minHeight: 96,
  },
  taskImageWrapper: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
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
    fontWeight: '600',
    fontSize: 16,
    color: '#000000',
  },
  statusBadgeContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
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
    fontSize: 14,
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
