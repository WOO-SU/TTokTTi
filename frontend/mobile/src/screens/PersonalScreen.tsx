import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/* ──────── Icon Components ──────── */

function PersonAvatarIcon() {
  return (
    <View style={iconStyles.avatarIconContainer}>
      <View style={iconStyles.avatarHead} />
      <View style={iconStyles.avatarBody} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function PersonalScreen() {
  const insets = useSafeAreaInsets();
  const [company, setCompany] = useState('');
  const [area, setArea] = useState('');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Nav Bar */}
      <View style={[styles.navBar, {paddingTop: insets.top}]}>
        <View style={styles.navSpacer} />
        <Text style={styles.pageTitle}>Personal</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={[styles.scrollContent, {paddingBottom: insets.bottom + 24}]}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Profile Photo Section */}
          <Text style={styles.sectionTitle}>Profile Photo</Text>

          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <PersonAvatarIcon />
            </View>
            <Text style={styles.userName}>김반장</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* User Details Section */}
          <Text style={styles.sectionTitle}>User Details</Text>

          <View style={styles.formFields}>
            {/* 회사 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>회사</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="detail"
                  placeholderTextColor="#A2A6B0"
                  value={company}
                  onChangeText={setCompany}
                />
              </View>
            </View>

            {/* 작업 구역 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>작업 구역</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="detail"
                  placeholderTextColor="#A2A6B0"
                  value={area}
                  onChangeText={setArea}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  avatarIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#A2A6B0',
    position: 'absolute',
    top: 2,
  },
  avatarBody: {
    width: 24,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#A2A6B0',
    position: 'absolute',
    bottom: 2,
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  navSpacer: {
    width: 20,
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2024',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* Card */
  card: {
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
  },

  /* Section */
  sectionTitle: {
    fontFamily: 'Roboto',
    fontWeight: '700',
    fontSize: 18,
    color: '#21272A',
    marginBottom: 16,
  },

  /* Profile Row */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F2F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 14,
    color: '#001D6C',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#DDE1E6',
    marginBottom: 24,
  },

  /* Form Fields */
  formFields: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 14,
    color: '#21272A',
  },
  inputContainer: {
    height: 48,
    backgroundColor: '#F2F4F8',
    borderBottomWidth: 1,
    borderBottomColor: '#A2A6B0',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 14,
    color: '#21272A',
    padding: 0,
  },
});
