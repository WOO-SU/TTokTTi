import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PersonalStackParamList } from '../../App';
import { getUserProfile, updateUserProfile, type UserProfile } from '../api/user';
import { useAuth } from '../context/AuthContext';
import TopHeader from '../components/TopHeader';

function PersonAvatarIcon() {
  return (
    <View style={iconStyles.avatarIconContainer}>
      <View style={iconStyles.avatarHead} />
      <View style={iconStyles.avatarBody} />
    </View>
  );
}

function LockIcon() {
  return (
    <View style={iconStyles.lockContainer}>
      <View style={iconStyles.lockShackle} />
      <View style={iconStyles.lockBody}>
        <View style={iconStyles.lockKeyhole} />
      </View>
    </View>
  );
}

function ChevronRightIcon() {
  return (
    <View style={iconStyles.chevronContainer}>
      <View style={iconStyles.chevronTop} />
      <View style={iconStyles.chevronBottom} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function PersonalScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<PersonalStackParamList>>();
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');

  useEffect(() => {
    if (userId) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getUserProfile(userId!);
      setName(data.name || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setBirthDate(data.birth_date || '');
      setSex(data.sex || '');
    } catch (err) {
      Alert.alert('오류', '프로필 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);

      // 빈 문자열인 경우 백엔드 에러 방지를 위해 null 처리
      const payload: any = { name, phone, address };
      payload.birth_date = birthDate.trim() === '' ? null : birthDate;
      payload.sex = sex.trim() === '' ? null : sex;

      await updateUserProfile(userId, payload);
      Alert.alert('성공', '프로필이 업데이트 되었습니다.');
    } catch (err: any) {
      const serverMsg = err.response?.data ? JSON.stringify(err.response.data) : '알 수 없는 오류';
      Alert.alert('저장 실패', `형식이 올바르지 않습니다.\n\n${serverMsg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader
        title="Personal"
        showBackButton={false}
        rightComponent={
          <TouchableOpacity onPress={handleSave} disabled={saving || loading}>
            <Text style={{ color: '#0052CC', fontWeight: 'bold', fontSize: 16 }}>저장</Text>
          </TouchableOpacity>
        }
      />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="large" color="#001D6C" style={{ marginVertical: 32 }} />
          ) : (
            <>
              {/* Profile Photo Section */}
              <Text style={styles.sectionTitle}>Profile Photo</Text>

              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <PersonAvatarIcon />
                </View>
                <Text style={styles.userName}>{name}</Text>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* User Details Section */}
              <Text style={styles.sectionTitle}>User Details</Text>

              <View style={styles.formFields}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>이름</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>전화번호</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>주소</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>생년월일 (YYYY-MM-DD)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="예: 1990-01-01"
                      value={birthDate}
                      onChangeText={setBirthDate}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>성별 (M 또는 F)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="M (남) 또는 F (여)"
                      value={sex}
                      onChangeText={setSex}
                    />
                  </View>
                </View>

                {/* 비밀번호 변경 버튼 */}
                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('ChangePassword')}
                >
                  <View style={styles.actionLeft}>
                    <LockIcon />
                    <Text style={styles.actionText}>비밀번호 변경</Text>
                  </View>
                  <ChevronRightIcon />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  avatarIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#A2A6B0',
    position: 'absolute',
    top: 2,
  },
  avatarBody: {
    width: 24,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#A2A6B0',
    position: 'absolute',
    bottom: 2,
  },
  lockContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockShackle: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#71727A',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    position: 'absolute',
    top: 2,
  },
  lockBody: {
    width: 14,
    height: 10,
    backgroundColor: '#71727A',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 4,
  },
  lockKeyhole: {
    width: 2,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronTop: {
    width: 8,
    height: 2,
    backgroundColor: '#C5C6CC',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateY: -2.5 }, { translateX: 2 }],
  },
  chevronBottom: {
    width: 8,
    height: 2,
    backgroundColor: '#C5C6CC',
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateY: 2.5 }, { translateX: 2 }],
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* Card */
  card: {
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
  },

  /* Section */
  sectionTitle: {
    fontFamily: 'Roboto',
    fontWeight: '700',
    fontSize: 18,
    color: '#21272A',
    marginBottom: 16,
  },

  /* Profile Row */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F2F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 14,
    color: '#001D6C',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#DDE1E6',
    marginBottom: 24,
  },

  /* Form Fields */
  formFields: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 14,
    color: '#21272A',
  },
  inputContainer: {
    height: 48,
    backgroundColor: '#F2F4F8',
    borderBottomWidth: 1,
    borderBottomColor: '#A2A6B0',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 14,
    color: '#21272A',
    padding: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F8',
    marginTop: 8,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 16,
    color: '#1F2024',
  },
});
