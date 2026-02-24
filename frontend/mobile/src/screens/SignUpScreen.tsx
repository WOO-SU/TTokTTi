import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const isNameFocused = name.length > 0;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        {/* Login Options */}
        <View style={[styles.loginOptions, {paddingBottom: insets.bottom + 24}]}>
          {/* Header Text */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Sign up</Text>
            <Text style={styles.subtitle}>
              Create an account to get started{' '}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Field */}
            <View style={styles.textFieldContainer}>
              <Text style={styles.fieldTitle}>Name</Text>
              <View
                style={[
                  styles.field,
                  isNameFocused && styles.fieldFocused,
                ]}>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor="#8F9098"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.textFieldContainer}>
              <Text style={styles.fieldTitle}>Email Address</Text>
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
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
              <Text style={styles.fieldTitle}>Password</Text>
              <View style={styles.field}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a password"
                  placeholderTextColor="#8F9098"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={securePassword}
                />
                <TouchableOpacity
                  onPress={() => setSecurePassword(!securePassword)}
                  style={styles.eyeIconContainer}>
                  <EyeIcon color="#8F9098" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.field}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm password"
                placeholderTextColor="#8F9098"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirm}
              />
              <TouchableOpacity
                onPress={() => setSecureConfirm(!secureConfirm)}
                style={styles.eyeIconContainer}>
                <EyeIcon color="#8F9098" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms Checkbox */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                agreeTerms && styles.checkboxChecked,
              ]}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.7}>
              {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I've read and agree with the{' '}
              <Text style={styles.termsLink}>Terms and Conditions</Text> and
              the <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loginOptions: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  headerSection: {
    gap: 8,
  },
  title: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '800',
    fontSize: 16,
    color: '#1F2024',
  },
  subtitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
  },
  form: {
    gap: 16,
  },
  textFieldContainer: {
    gap: 8,
  },
  fieldTitle: {
    fontFamily: 'Noto Sans KR',
    fontWeight: '700',
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
  fieldFocused: {
    borderColor: '#006FFD',
  },
  input: {
    flex: 1,
    fontFamily: 'Noto Sans KR',
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
  termsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontFamily: 'Noto Sans KR',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
    lineHeight: 16,
  },
  termsLink: {
    color: '#006FFD',
    fontWeight: '600',
  },
});