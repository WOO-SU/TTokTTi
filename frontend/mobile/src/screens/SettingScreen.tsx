import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingStackParamList, RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import TopHeader from '../components/TopHeader';

const APP_VERSION = '1.0.0';

/* ──────── Icon Components ──────── */

function ChevronRightIcon() {
  return (
    <View style={iconStyles.chevronContainer}>
      <View style={iconStyles.chevronTop} />
      <View style={iconStyles.chevronBottom} />
    </View>
  );
}

/* ──────── Setting Row Component ──────── */

interface SettingRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingRow({ label, value, onPress, showChevron = false, danger = false }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress}
      disabled={!onPress}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {showChevron ? <ChevronRightIcon /> : null}
      </View>
    </TouchableOpacity>
  );
}

/* ──────── Main Component ──────── */

export default function SettingScreen() {
  const insets = useSafeAreaInsets();
  const { logout, userName, userId } = useAuth();
  const navigation = useNavigation<
    CompositeNavigationProp<
      NativeStackNavigationProp<SettingStackParamList>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="설정" showBackButton={false} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>

        {/* 계정 정보 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={styles.card}>
            <SettingRow label="이름" value={userName ?? '-'} />
            <View style={styles.divider} />
            <SettingRow label="아이디" value={userId ? `#${userId}` : '-'} />
          </View>
        </View>

        {/* 보안 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>보안</Text>
          <View style={styles.card}>
            <SettingRow
              label="비밀번호 변경"
              showChevron
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </View>
        </View>

        {/* 앱 정보 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.card}>
            <SettingRow label="버전" value={`v${APP_VERSION}`} />
          </View>
        </View>

        {/* 로그아웃 섹션 */}
        <View style={styles.section}>
          <View style={styles.card}>
            <SettingRow label="로그아웃" onPress={handleLogout} danger />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  chevronContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronTop: {
    width: 7,
    height: 1.5,
    backgroundColor: '#C5C6CC',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateY: -2.2 }, { translateX: 1.8 }],
  },
  chevronBottom: {
    width: 7,
    height: 1.5,
    backgroundColor: '#C5C6CC',
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateY: 2.2 }, { translateX: 1.8 }],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  scrollContent: {
    paddingTop: 16,
    gap: 8,
  },

  /* Section */
  section: {
    paddingHorizontal: 20,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 12,
    color: '#71727A',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
  },
  rowLabel: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 15,
    color: '#1F2024',
  },
  rowLabelDanger: {
    color: '#FF3B30',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#F2F4F8',
    marginHorizontal: 20,
  },
});
