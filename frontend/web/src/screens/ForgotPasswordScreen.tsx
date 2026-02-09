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
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({navigation}: Props) {
  const [email, setEmail] = useState('');

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
            <View style={styles.headerSection}>
              <Text style={styles.title}>Forgotten your password?</Text>
              <Text style={styles.subtitle}>
                There is nothing to worry about, we'll send you a message to help
                you reset your password.
              </Text>
            </View>

            {/* Email Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter personal or work email address"
                  placeholderTextColor="#8F9098"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Send Reset Link Button */}
            <TouchableOpacity style={styles.resetButton} activeOpacity={0.8}>
              <Text style={styles.resetButtonText}>Send Reset Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

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
  headerSection: {
    gap: 12,
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
    lineHeight: 20,
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
  resetButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#006FFD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
