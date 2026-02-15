import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {useAuth} from '../context/AuthContext';
import {s, ms} from '../utils';
import {Colors, Fonts} from '../utils';

export default function SettingScreen() {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({index: 0, routes: [{name: 'Login'}]});
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Nav Bar */}
      <View style={[styles.navBar, {paddingTop: insets.top}]}>
        <View style={styles.navSpacer} />
        <Text style={styles.pageTitle}>Setting</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
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
    backgroundColor: Colors.white,
  },
  navBar: {
    height: s(56),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(24),
    backgroundColor: Colors.white,
  },
  navSpacer: {
    width: s(20),
  },
  pageTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '700',
    fontSize: ms(14),
    color: Colors.textDark,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: s(16),
    paddingTop: s(24),
  },
  logoutButton: {
    height: s(48),
    backgroundColor: Colors.error,
    borderRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(14),
    color: Colors.white,
  },
});
