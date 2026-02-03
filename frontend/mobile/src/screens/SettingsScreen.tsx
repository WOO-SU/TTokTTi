import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// ── Colors (Figma Design System) ──
const COLORS = {
  primary: '#006FFD',
  white: '#FFFFFF',
  darkest: '#1F2024',
  darkLight: '#71727A',
  divider: '#D4D6DD',
  chevron: '#8F9098',
  overlay: '#1F2024',
};

// ── Icons ──

function ChevronRightIcon() {
  return (
    <View style={{width: 12, height: 12, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 14, color: COLORS.chevron}}>›</Text>
    </View>
  );
}

function BackIcon() {
  return (
    <View style={{width: 24, height: 24, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 20, color: COLORS.darkest}}>‹</Text>
    </View>
  );
}

// ── Settings List Item Component ──

interface ListItemProps {
  title: string;
  onPress?: () => void;
  showDivider?: boolean;
}

function ListItem({title, onPress, showDivider = true}: ListItemProps) {
  return (
    <>
      <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.listItemTitle}>{title}</Text>
        <ChevronRightIcon />
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

// ── Logout Dialog Component ──

interface LogoutDialogProps {
  visible: boolean;
  onCancel: () => void;
  onLogout: () => void;
}

function LogoutDialog({visible, onCancel, onLogout}: LogoutDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Dialog */}
        <View style={styles.dialog}>
          {/* Content */}
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>Log out</Text>
            <Text style={styles.dialogDescription}>
              Are you sure you want to log out? You'll need to login again to use the app.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={onCancel}
              activeOpacity={0.7}>
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={onLogout}
              activeOpacity={0.7}>
              <Text style={styles.buttonPrimaryText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Settings Screen ──

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    setLogoutModalVisible(false);
    // Navigate to Login screen after logout
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  };

  const settingsItems = [
    {id: '1', title: '근무 부서'},
    {id: '2', title: '근무 연차'},
    {id: '3', title: '사번'},
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Settings List */}
        <View style={styles.settingsSection}>
          {settingsItems.map((item, index) => (
            <ListItem
              key={item.id}
              title={item.title}
              showDivider={index < settingsItems.length - 1}
              onPress={() => {
                // Handle navigation to detail screens if needed
              }}
            />
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.7}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Dialog */}
      <LogoutDialog
        visible={logoutModalVisible}
        onCancel={() => setLogoutModalVisible(false)}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkest,
    fontFamily: 'Inter',
    letterSpacing: 0.08,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Settings Section
  settingsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },

  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.darkest,
    fontFamily: 'Inter',
    lineHeight: 20,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: COLORS.divider,
    marginHorizontal: 16,
  },

  // Logout Section
  logoutSection: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    fontFamily: 'Inter',
  },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 32, 36, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Dialog
  dialog: {
    width: 300,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  dialogContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkest,
    fontFamily: 'Inter',
    letterSpacing: 0.08,
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.darkLight,
    fontFamily: 'Inter',
    lineHeight: 16,
    letterSpacing: 0.12,
    textAlign: 'center',
  },

  // Dialog Actions
  dialogActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  buttonSecondary: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'Inter',
  },
  buttonPrimary: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: 'Inter',
  },
});
