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
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const heroImage = require('../assets/login-hero.png');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
                    placeholder="Email Address"
                    placeholderTextColor="#8F9098"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
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
              </View>

              {/* Forgot Password */}
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsSection}>
              {/* Login Button */}
              <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
                <Text style={styles.loginButtonText}>Login</Text>
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
                style={[styles.socialButton, {backgroundColor: '#ED3241'}]}
                activeOpacity={0.8}>
                <GoogleIcon />
              </TouchableOpacity>

              {/* Apple */}
              <TouchableOpacity
                style={[styles.socialButton, {backgroundColor: '#1F2024'}]}
                activeOpacity={0.8}>
                <AppleIcon />
              </TouchableOpacity>

              {/* Facebook */}
              <TouchableOpacity
                style={[styles.socialButton, {backgroundColor: '#006FFD'}]}
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
      <View
        style={[
          iconStyles.eyeOuter,
          {borderColor: color},
        ]}
      />
      <View
        style={[
          iconStyles.eyeInner,
          {backgroundColor: color},
        ]}
      />
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
  socialIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 251,
  },
  loginOptions: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 24,
  },
  welcomeTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 24,
    letterSpacing: 0.24,
    color: '#000000',
  },
  loginSection: {
    gap: 24,
  },
  form: {
    gap: 16,
  },
  textFieldContainer: {
    gap: 8,
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
    color: '#000000',
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
  forgotPassword: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#006FFD',
    textAlign: 'right',
  },
  buttonsSection: {
    gap: 16,
  },
  loginButton: {
    height: 48,
    backgroundColor: '#006FFD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#FFFFFF',
  },
  registerText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
    textAlign: 'center',
  },
  registerLink: {
    fontWeight: '600',
    color: '#006FFD',
  },
  divider: {
    height: 1,
    backgroundColor: '#D3D5DD',
  },
  socialSection: {
    gap: 16,
  },
  socialText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
    textAlign: 'center',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 63,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
