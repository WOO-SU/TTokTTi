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
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
};

function EyeIcon({color}: {color: string}) {
  return (
    <View style={iconStyles.eyeContainer}>
      <View style={[iconStyles.eyeOuter, {borderColor: color}]} />
      <View style={[iconStyles.eyeInner, {backgroundColor: color}]} />
    </View>
  );
}

export default function SignUpScreen({navigation}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#D5DAE1" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.centerWrapper}>
          <View style={styles.card}>
            {/* Title */}
            <Text style={styles.title}>Sign up</Text>

            {/* Form */}
            <View style={styles.form}>
              {/* Name */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Name</Text>
                <View style={styles.field}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last"
                    placeholderTextColor="#8F9098"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Email Address</Text>
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

              {/* Password */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Password</Text>
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

              {/* Confirm Password */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Password</Text>
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
            </View>

            {/* Terms Text */}
            <Text style={styles.termsText}>
              I've read and agree with the{' '}
              <Text style={styles.termsLink}>Terms and Conditions</Text> and the{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
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
    gap: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 22,
    color: '#1F2024',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter',
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
  termsText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#71727A',
    lineHeight: 18,
  },
  termsLink: {
    color: '#006FFD',
    fontWeight: '600',
  },
});
