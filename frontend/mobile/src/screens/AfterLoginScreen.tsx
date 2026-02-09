import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AfterLogin'>;
};

// ── Logout Dialog Component ──
interface LogoutDialogProps {
    visible: boolean;
    onCancel: () => void;
    onLogout: () => void;
}

function LogoutDialog({ visible, onCancel, onLogout }: LogoutDialogProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.dialogContent}>
                        <Text style={styles.dialogTitle}>Log out</Text>
                        <Text style={styles.dialogDescription}>
                            Are you sure you want to log out?
                        </Text>
                    </View>
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

export default function AfterLoginScreen({ navigation }: Props) {
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    const handleLogout = () => {
        setLogoutModalVisible(false);
        // Reset navigation stack to Login
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.welcomeText}>Login Successful!</Text>
                <Text style={styles.subText}>You are now logged in.</Text>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => setLogoutModalVisible(true)}>
                    <Text style={styles.logoutButtonText}>Log out</Text>
                </TouchableOpacity>
            </View>

            <LogoutDialog
                visible={logoutModalVisible}
                onCancel={() => setLogoutModalVisible(false)}
                onLogout={handleLogout}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        gap: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2024',
    },
    subText: {
        fontSize: 16,
        color: '#71727A',
    },
    logoutButton: {
        marginTop: 40,
        backgroundColor: '#FF3B30',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
    // Dialog Styles
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(31, 32, 36, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialog: {
        width: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
    },
    dialogContent: {
        padding: 8,
        alignItems: 'center',
    },
    dialogTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1F2024',
    },
    dialogDescription: {
        fontSize: 14,
        color: '#71727A',
        textAlign: 'center',
    },
    dialogActions: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    buttonSecondary: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C5C6CC',
        alignItems: 'center',
    },
    buttonSecondaryText: {
        color: '#1F2024',
        fontWeight: '600',
    },
    buttonPrimary: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
    },
    buttonPrimaryText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
