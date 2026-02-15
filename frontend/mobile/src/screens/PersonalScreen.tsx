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
import {s, ms} from '../utils';
import {Colors, Fonts} from '../utils';

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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Nav Bar */}
      <View style={[styles.navBar, {paddingTop: insets.top}]}>
        <View style={styles.navSpacer} />
        <Text style={styles.pageTitle}>Personal</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={styles.scrollContent}
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
                  placeholderTextColor={Colors.textGrayLight}
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
                  placeholderTextColor={Colors.textGrayLight}
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
    width: s(40),
    height: s(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHead: {
    width: s(14),
    height: s(14),
    borderRadius: s(7),
    borderWidth: 2,
    borderColor: Colors.textGrayLight,
    position: 'absolute',
    top: s(2),
  },
  avatarBody: {
    width: s(24),
    height: s(12),
    borderTopLeftRadius: s(12),
    borderTopRightRadius: s(12),
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: Colors.textGrayLight,
    position: 'absolute',
    bottom: s(2),
  },
});

/* ──────── Main Styles ──────── */

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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: s(16),
    paddingBottom: s(24),
  },

  /* Card */
  card: {
    borderWidth: 1,
    borderColor: Colors.borderGray,
    borderRadius: s(4),
    paddingHorizontal: s(16),
    paddingTop: s(32),
    paddingBottom: s(16),
  },

  /* Section */
  sectionTitle: {
    fontFamily: Fonts.roboto,
    fontWeight: '700',
    fontSize: ms(18),
    color: Colors.textDarkAlt,
    marginBottom: s(16),
  },

  /* Profile Row */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(24),
    marginBottom: s(24),
  },
  avatar: {
    width: s(96),
    height: s(96),
    borderRadius: s(48),
    backgroundColor: Colors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontFamily: Fonts.roboto,
    fontWeight: '400',
    fontSize: ms(14),
    color: Colors.textNavy,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: Colors.borderGray,
    marginBottom: s(24),
  },

  /* Form Fields */
  formFields: {
    gap: s(16),
  },
  fieldGroup: {
    gap: s(8),
  },
  fieldLabel: {
    fontFamily: Fonts.roboto,
    fontWeight: '400',
    fontSize: ms(14),
    color: Colors.textDarkAlt,
  },
  inputContainer: {
    height: s(48),
    backgroundColor: Colors.bgInput,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textGrayLight,
    justifyContent: 'center',
    paddingHorizontal: s(16),
  },
  input: {
    fontFamily: Fonts.roboto,
    fontWeight: '400',
    fontSize: ms(14),
    color: Colors.textDarkAlt,
    padding: 0,
  },
});
