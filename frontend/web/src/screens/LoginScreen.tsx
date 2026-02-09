import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

function HeartbeatIcon() {
  return (
    <View style={iconStyles.heartContainer}>
      <View style={iconStyles.heartBody}>
        <View style={iconStyles.heartLeft} />
        <View style={iconStyles.heartRight} />
        <View style={iconStyles.heartBottom} />
      </View>
      <View style={iconStyles.pulseLineContainer}>
        <View style={iconStyles.pulseLine} />
        <View style={iconStyles.pulseUp} />
        <View style={iconStyles.pulseDown} />
        <View style={iconStyles.pulseEnd} />
      </View>
    </View>
  );
}

function EyeIcon({color}: {color: string}) {
  return (
    <View style={iconStyles.eyeContainer}>
      <View style={[iconStyles.eyeOuter, {borderColor: color}]} />
      <View style={[iconStyles.eyeInner, {backgroundColor: color}]} />
    </View>
  );
}

export default function LoginScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.centerWrapper}>
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoHeart}>&#x2764;&#xFE0F;</Text>
                <Text style={styles.logoPulse}>~</Text>
              </View>
              <Text style={styles.logoText}>riskpulse</Text>
            </View>

            {/* Welcome */}
            <Text style={styles.welcomeTitle}>Welcome</Text>

            {/* Form */}
            <View style={styles.form}>
              {/* Email */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.field}>
                  <TextInput
                    style={styles.input}
                    placeholder="Placeholder"
                    placeholderTextColor="#8F9098"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.field}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Placeholder"
                    placeholderTextColor="#8F9098"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureText}
                  />
                  <TouchableOpacity
                    onPress={() => setSecureText(!secureText)}
                    style={styles.eyeIconContainer}>
                    <EyeIcon color="#8F9098" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordHint}>
                  It must be a combination of minimum 8 letters, numbers, and symbols.
                </Text>
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxChecked,
                    ]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpText}>
                No account yet?{' '}
                <Text style={styles.signUpLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  heartContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBody: {
    width: 40,
    height: 36,
    position: 'relative',
  },
  heartLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E87C5D',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heartRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E87C5D',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  heartBottom: {
    width: 28,
    height: 28,
    backgroundColor: '#E87C5D',
    transform: [{rotate: '45deg'}],
    position: 'absolute',
    bottom: -2,
    left: 6,
  },
  pulseLineContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    bottom: 14,
  },
  pulseLine: {
    width: 8,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  pulseUp: {
    width: 4,
    height: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    marginLeft: 1,
    borderRadius: 1,
    marginBottom: 6,
  },
  pulseDown: {
    width: 4,
    height: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    marginLeft: 1,
    borderRadius: 1,
    marginTop: 4,
  },
  pulseEnd: {
    width: 8,
    height: 2,
    backgroundColor: '#FFFFFF',
    marginLeft: 1,
  },
  eyeContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeOuter: {
    width: 14,
    height: 10,
    borderWidth: 1.5,
    borderRadius: 7,
  },
  eyeInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C5C6CC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoSection: {
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoHeart: {
    fontSize: 40,
  },
  logoPulse: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  logoText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 20,
    color: '#1F2024',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 20,
    color: '#1F2024',
  },
  form: {
    width: '100%',
    gap: 16,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#2E3036',
  },
  field: {
    height: 48,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#1F2024',
    padding: 0,
    height: '100%',
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordHint: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 10,
    color: '#8F9098',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C5C6CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#006FFD',
    borderColor: '#006FFD',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rememberText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
  },
  forgotText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#006FFD',
  },
  loginButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#006FFD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
  signUpText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
    textDecorationLine: 'underline',
  },
  signUpLink: {
    fontWeight: '600',
    color: '#006FFD',
  },
});
