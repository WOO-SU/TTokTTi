import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingStackParamList, RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import TopHeader from '../components/TopHeader';

export default function SettingScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
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

      <TopHeader title="Setting" showBackButton={false} />

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  logoutButton: {
    height: 48,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
