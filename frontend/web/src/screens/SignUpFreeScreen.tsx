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
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUpFree'>;
};

function EyeIcon({color}: {color: string}) {
  return (
    <View style={iconStyles.eyeContainer}>
      <View style={[iconStyles.eyeOuter, {borderColor: color}]} />
      <View style={[iconStyles.eyeInner, {backgroundColor: color}]} />
    </View>
  );
}

export default function SignUpFreeScreen({navigation}: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#D5DAE1" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.centerWrapper}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>Sign Up Free</Text>
              <Text style={styles.subtitle}>
                14 day free access to unlimited resources
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* First Name / Last Name Row */}
              <View style={styles.nameRow}>
                <View style={[styles.fieldContainer, styles.halfField]}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <View style={styles.field}>
                    <TextInput
                      style={styles.input}
                      placeholder="Placeholder"
                      placeholderTextColor="#8F9098"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <View style={[styles.fieldContainer, styles.halfField]}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <View style={styles.field}>
                    <TextInput
                      style={styles.input}
                      placeholder="Placeholder"
                      placeholderTextColor="#8F9098"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              {/* Email */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Email</Text>
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
              </View>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.checkbox,
                  agreeTerms && styles.checkboxChecked,
                ]}>
                {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                Vestibulum faucibus odio vitae erat auctor lectus.
              </Text>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <TouchableOpacity style={styles.signUpButton} activeOpacity={0.8}>
              <Text style={styles.signUpButtonText}>Button Text</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerSection}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                activeOpacity={0.8}>
                <Text style={styles.socialButtonIcon}>G</Text>
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                activeOpacity={0.8}>
                <Text style={styles.socialButtonIcon}>{'\uF8FF'}</Text>
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, styles.twitterButton]}
                activeOpacity={0.8}>
                <Text style={styles.socialButtonIcon}>T</Text>
                <Text style={styles.socialButtonText}>Twitter</Text>
              </TouchableOpacity>
            </View>

            {/* Already have account */}
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Already have an account?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: '#D5DAE1',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerSection: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 22,
    color: '#1F2024',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 13,
    color: '#71727A',
  },
  form: {
    width: '100%',
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  checkbox: {
    width: 20,
    height: 20,
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
    fontSize: 12,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
  },
  signUpButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#006FFD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  googleButton: {
    borderColor: '#D5DAE1',
  },
  appleButton: {
    borderColor: '#D5DAE1',
  },
  twitterButton: {
    borderColor: '#D5DAE1',
  },
  socialButtonIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2024',
  },
  socialButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#1F2024',
  },
  loginLink: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#006FFD',
  },
});
