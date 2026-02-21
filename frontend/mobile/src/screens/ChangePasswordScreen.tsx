import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PersonalStackParamList } from '../../App';
import { changePassword } from '../api/user';

type Props = {
    navigation: NativeStackNavigationProp<PersonalStackParamList, 'ChangePassword'>;
};

/* ──────── Icon Components ──────── */

function BackArrowIcon() {
    return (
        <View style={iconStyles.backContainer}>
            <View style={iconStyles.arrowTop} />
            <View style={iconStyles.arrowBottom} />
        </View>
    );
}

/* ──────── Main Component ──────── */

export default function ChangePasswordScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async () => {
        // 1. Validation
        if (!currentPassword) {
            Alert.alert('알림', '현재 비밀번호를 입력해주세요.');
            return;
        }
        if (!newPassword) {
            Alert.alert('알림', '새 비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('알림', '새 비밀번호 판별이 일치하지 않습니다.');
            return;
        }
        if (currentPassword === newPassword) {
            Alert.alert('알림', '새 비밀번호는 기존 비밀번호와 달라야 합니다.');
            return;
        }

        // 2. API Call
        setIsLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            Alert.alert('성공', '비밀번호가 성공적으로 변경되었습니다.', [
                { text: '확인', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            console.error('Password change error:', error);

            // Axios error message parsing
            let errorMessage = '비밀번호 변경에 실패했습니다.';
            if (error.response?.status === 400) {
                if (error.response.data?.detail?.includes('incorrect')) {
                    errorMessage = '현재 비밀번호가 틀렸습니다.';
                }
            }
            Alert.alert('오류', errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [currentPassword, newPassword, confirmPassword, navigation]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}>
                    <BackArrowIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>비밀번호 변경</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.descriptionText}>
                    계정 보호를 위해 새로운 비밀번호를 입력해주세요.
                </Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>현재 비밀번호</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="현재 비밀번호를 입력하세요"
                            placeholderTextColor="#A2A6B0"
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>새 비밀번호</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="새 비밀번호를 입력하세요"
                            placeholderTextColor="#A2A6B0"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>새 비밀번호 확인</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="새 비밀번호를 다시 입력하세요"
                            placeholderTextColor="#A2A6B0"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>변경하기</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

/* ──────── Icon Styles ──────── */
const iconStyles = StyleSheet.create({
    backContainer: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowTop: {
        width: 14,
        height: 2,
        backgroundColor: '#006FFD',
        borderRadius: 1,
        position: 'absolute',
        transform: [{ rotate: '-45deg' }, { translateY: -5.5 }],
    },
    arrowBottom: {
        width: 14,
        height: 2,
        backgroundColor: '#006FFD',
        borderRadius: 1,
        position: 'absolute',
        transform: [{ rotate: '45deg' }, { translateY: 5.5 }],
    },
});

/* ──────── Styles ──────── */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#FFFFFF',
        gap: 8,
    },
    backButton: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 18,
        color: '#1F2024',
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 24,
        flex: 1,
    },
    descriptionText: {
        fontFamily: 'Inter',
        fontSize: 14,
        color: '#71727A',
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: 14,
        color: '#21272A',
        marginBottom: 8,
    },
    inputContainer: {
        height: 48,
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#DDE1E6',
        borderRadius: 8,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    input: {
        fontFamily: 'Inter',
        fontSize: 14,
        color: '#1F2024',
        padding: 0,
    },
    submitButton: {
        height: 52,
        backgroundColor: '#006FFD',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonDisabled: {
        backgroundColor: '#A2A6B0',
    },
    submitButtonText: {
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
