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
import {s, ms} from '../utils';
import {Colors, Fonts} from '../utils';

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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        {/* Login Options */}
        <View style={styles.loginOptions}>
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
                  placeholderTextColor={Colors.textGrayAlt}
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
                  placeholderTextColor={Colors.textGrayAlt}
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
                  placeholderTextColor={Colors.textGrayAlt}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={securePassword}
                />
                <TouchableOpacity
                  onPress={() => setSecurePassword(!securePassword)}
                  style={styles.eyeIconContainer}>
                  <EyeIcon color={Colors.textGrayAlt} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.field}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textGrayAlt}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirm}
              />
              <TouchableOpacity
                onPress={() => setSecureConfirm(!secureConfirm)}
                style={styles.eyeIconContainer}>
                <EyeIcon color={Colors.textGrayAlt} />
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loginOptions: {
    paddingHorizontal: s(24),
    paddingTop: s(24),
    paddingBottom: s(24),
    gap: s(24),
  },
  headerSection: {
    gap: s(8),
  },
  title: {
    fontFamily: Fonts.inter,
    fontWeight: '800',
    fontSize: ms(16),
    color: Colors.textDark,
  },
  subtitle: {
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(12),
    color: Colors.textGray,
  },
  form: {
    gap: s(16),
  },
  textFieldContainer: {
    gap: s(8),
  },
  fieldTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '700',
    fontSize: ms(12),
    color: Colors.textDarkSub,
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
  fieldFocused: {
    borderColor: Colors.primary,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(14),
    color: Colors.textDark,
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
  termsRow: {
    flexDirection: 'row',
    gap: s(12),
    alignItems: 'flex-start',
  },
  checkbox: {
    width: s(24),
    height: s(24),
    borderRadius: s(6),
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: ms(14),
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(12),
    color: Colors.textGray,
    lineHeight: ms(16),
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
