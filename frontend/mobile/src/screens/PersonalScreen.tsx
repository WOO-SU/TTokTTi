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
  Modal,
  KeyboardAvoidingView,
  Platform,
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
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Modal Temp State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editSex, setEditSex] = useState('');

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
      setProfile(data);
    } catch (err) {
      Alert.alert('오류', '프로필 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditName(profile.name || '');
    setEditPhone(profile.phone || '');
    setEditAddress(profile.address || '');
    setEditBirthDate(profile.birth_date || '');
    setEditSex(profile.sex || '');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);

      const payload: any = {
        name: editName,
        phone: editPhone,
        address: editAddress
      };
      payload.birth_date = editBirthDate.trim() === '' ? null : editBirthDate;
      payload.sex = editSex.trim() === '' ? null : editSex;

      await updateUserProfile(userId, payload);

      // Update local display state
      setProfile({
        ...profile,
        ...payload
      } as UserProfile);

      setIsModalVisible(false);
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
        title="마이 페이지"
        showBackButton={false}
        rightComponent={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleOpenEdit}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.headerBtnText}>수정</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color="#006FFD" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          bounces={true}
          showsVerticalScrollIndicator={false}>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <PersonAvatarIcon />
              </View>
              <Text style={styles.profileName}>{profile?.name || '사용자'}</Text>
              <Text style={styles.profileEmail}>{profile?.phone || '전화번호 미등록'}</Text>
            </View>

            <View style={styles.divider} />

            {/* Read-only Display Groups */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>이름</Text>
                <Text style={styles.infoValue}>{profile?.name || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>전화번호</Text>
                <Text style={styles.infoValue}>{profile?.phone || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>주소</Text>
                <Text style={styles.infoValue}>{profile?.address || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>생년월일</Text>
                <Text style={styles.infoValue}>{profile?.birth_date || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>성별</Text>
                <Text style={styles.infoValue}>
                  {profile?.sex === 'M' ? '남성' : profile?.sex === 'F' ? '여성' : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Settings Link */}
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.6}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.lockIconBox}>
                  <LockIcon />
                </View>
                <Text style={styles.settingText}>비밀번호 변경</Text>
              </View>
              <ChevronRightIcon />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>프로필 수정</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <View style={styles.formContainer}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>이름</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="이름 입력"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>전화번호</Text>
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="010-0000-0000"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>주소</Text>
                  <TextInput
                    style={styles.input}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="주소 입력"
                  />
                </View>

                <View style={styles.modalRow}>
                  <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                    <Text style={styles.fieldLabel}>생년월일</Text>
                    <TextInput
                      style={styles.input}
                      value={editBirthDate}
                      onChangeText={setEditBirthDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>성별</Text>
                    <TextInput
                      style={styles.input}
                      value={editSex}
                      onChangeText={setEditSex}
                      placeholder="M / F"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>저장하기</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  avatarIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHead: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#71727A',
    position: 'absolute',
    top: 6,
  },
  avatarBody: {
    width: 36,
    height: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 2.5,
    borderColor: '#71727A',
    position: 'absolute',
    bottom: 6,
  },
  lockContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockShackle: {
    width: 9,
    height: 9,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#006FFD',
    borderTopLeftRadius: 4.5,
    borderTopRightRadius: 4.5,
    position: 'absolute',
    top: 1,
  },
  lockBody: {
    width: 14,
    height: 10,
    backgroundColor: '#006FFD',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 3,
  },
  lockKeyhole: {
    width: 2,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
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
    backgroundColor: '#FFFFFF',
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  /* Header Actions */
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerBtnText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 16,
    color: '#006FFD',
  },

  /* Profile Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F2F4F8',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  profileName: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 22,
    color: '#1F2024',
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 14,
    color: '#71727A',
  },

  divider: {
    height: 1,
    backgroundColor: '#F2F4F8',
    marginVertical: 20,
  },

  /* Info Container (Display) */
  infoContainer: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 14,
    color: '#71727A',
  },
  infoValue: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 15,
    color: '#1F2024',
  },

  /* Setting Items */
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  lockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '500',
    fontSize: 16,
    color: '#1F2024',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 20,
    color: '#1F2024',
  },
  cancelText: {
    fontFamily: 'Noto Sans KR',
    fontSize: 16,
    color: '#71727A',
  },
  modalBody: {
    marginBottom: 32,
  },
  formContainer: {
    gap: 20,
    marginBottom: 32,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 14,
    color: '#71727A',
  },
  input: {
    height: 52,
    backgroundColor: '#F8F9FE',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E9F1',
    fontFamily: 'Noto Sans KR',
    fontSize: 15,
    color: '#1F2024',
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    backgroundColor: '#006FFD',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#006FFD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#C5C6CC',
    shadowOpacity: 0,
  },
  saveBtnText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
