import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {useAuth} from '../context/AuthContext';
import {s, vs, ms, SCREEN_WIDTH} from '../utils';
import {Colors, Fonts} from '../utils';

const heroImage = require('../assets/mascot-logo.png');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {login} = useAuth();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!userName.trim() || !password.trim()) {
      Alert.alert('입력 오류', '아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await login(userName.trim(), password);
      navigation.reset({index: 0, routes: [{name: 'Main'}]});
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        Alert.alert('로그인 실패', '아이디 혹은 비밀번호가 틀렸습니다.');
      } else {
        Alert.alert(
          '연결 오류',
          '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        {/* Hero Image */}
        <Image
          source={heroImage}
          style={[styles.heroImage, {marginTop: insets.top}]}
          resizeMode="cover"
        />

        {/* Login Options */}
        <View style={styles.loginOptions}>
          {/* Welcome Title */}
          <Text style={styles.welcomeTitle}>Welcome!</Text>

          {/* Login Form */}
          <View style={styles.loginSection}>
            <View style={styles.form}>
              {/* Email Field */}
              <View style={styles.textFieldContainer}>
                <View style={styles.field}>
                  <TextInput
                    style={styles.input}
                    placeholder="아이디"
                    placeholderTextColor={Colors.textGrayAlt}
                    value={userName}
                    onChangeText={setUserName}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.textFieldContainer}>
                <View style={styles.field}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Password"
                    placeholderTextColor={Colors.textGrayAlt}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureText}
                  />
                  <TouchableOpacity
                    onPress={() => setSecureText(!secureText)}
                    style={styles.eyeIconContainer}>
                    <EyeIcon color={Colors.textGrayAlt} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsSection}>
              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && {opacity: 0.6}]}
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={handleLogin}>
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* Register */}
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.registerText}>
                  Not a member?{' '}
                  <Text style={styles.registerLink}>Register now</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Social Login */}
          <View style={styles.socialSection}>
            <Text style={styles.socialText}>Or continue with</Text>
            <View style={styles.socialButtons}>
              {/* Google */}
              <TouchableOpacity
                style={[styles.socialButton, {backgroundColor: Colors.google}]}
                activeOpacity={0.8}>
                <GoogleIcon />
              </TouchableOpacity>

              {/* Apple */}
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {backgroundColor: Colors.textDark},
                ]}
                activeOpacity={0.8}>
                <AppleIcon />
              </TouchableOpacity>

              {/* Facebook */}
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {backgroundColor: Colors.primary},
                ]}
                activeOpacity={0.8}>
                <FacebookIcon />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* SVG-like icon components using basic Views/Text */

function EyeIcon({color}: {color: string}) {
  return (
    <View style={iconStyles.eyeContainer}>
      <View style={[iconStyles.eyeOuter, {borderColor: color}]} />
      <View style={[iconStyles.eyeInner, {backgroundColor: color}]} />
    </View>
  );
}

function GoogleIcon() {
  return <Text style={iconStyles.socialIconText}>G</Text>;
}

function AppleIcon() {
  return <Text style={iconStyles.socialIconText}>{'\uF8FF'}</Text>;
}

function FacebookIcon() {
  return <Text style={iconStyles.socialIconText}>f</Text>;
}

const iconStyles = StyleSheet.create({
  eyeContainer: {
    width: s(16),
    height: s(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeOuter: {
    width: s(14),
    height: s(10),
    borderWidth: 1.5,
    borderRadius: s(7),
  },
  eyeInner: {
    width: s(5),
    height: s(5),
    borderRadius: s(2.5),
    position: 'absolute',
  },
  socialIconText: {
    color: Colors.white,
    fontSize: ms(16),
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: vs(251),
  },
  loginOptions: {
    paddingHorizontal: s(24),
    paddingTop: s(40),
    paddingBottom: s(40),
    gap: s(24),
  },
  welcomeTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '800',
    fontSize: ms(24),
    letterSpacing: ms(0.24),
    color: Colors.black,
  },
  loginSection: {
    gap: s(24),
  },
  form: {
    gap: s(16),
  },
  textFieldContainer: {
    gap: s(8),
  },
  field: {
    height: s(48),
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: s(12),
    paddingHorizontal: s(16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(14),
    color: Colors.black,
    padding: 0,
    height: '100%',
  },
  passwordInput: {
    paddingRight: s(8),
  },
  eyeIconContainer: {
    width: s(24),
    height: s(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPassword: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(12),
    color: Colors.primary,
    textAlign: 'right',
  },
  buttonsSection: {
    gap: s(16),
  },
  loginButton: {
    height: s(48),
    backgroundColor: Colors.primary,
    borderRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(12),
    color: Colors.white,
  },
  registerText: {
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(12),
    color: Colors.textGray,
    textAlign: 'center',
  },
  registerLink: {
    fontWeight: '600',
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  socialSection: {
    gap: s(16),
  },
  socialText: {
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(12),
    color: Colors.textGray,
    textAlign: 'center',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: s(12),
  },
  socialButton: {
    width: s(40),
    height: s(40),
    borderRadius: s(63),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
