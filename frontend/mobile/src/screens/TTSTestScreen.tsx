import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import Tts from 'react-native-tts';

type Props = {
    navigation: NativeStackNavigationProp<HomeStackParamList, 'TTSTest'>;
};

type AssistantState = 'idle' | 'speaking';

export default function TTSTestScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [assistantState, setAssistantState] = useState<AssistantState>('idle');
    const [textToSpeak, setTextToSpeak] = useState('안전모 미착용이 감지되었습니다. 즉시 안전모를 착용해 주세요.');
    const [statusMessage, setStatusMessage] = useState('TTS가 준비되었습니다.');

    useEffect(() => {
        let isMounted = true;

        // TTS 설정 초기화
        Tts.setDefaultLanguage('ko-KR');
        Tts.setDefaultRate(0.5); // 읽는 속도 조절 (너무 빠르면 기계음처럼 들릴 수 있음)

        // 이벤트 리스너 등록
        const onStart = () => {
            if (isMounted) {
                setAssistantState('speaking');
                setStatusMessage('음성 출력 중입니다...');
            }
        };

        const onFinish = () => {
            if (isMounted) {
                setAssistantState('idle');
                setStatusMessage('음성 출력이 완료되었습니다.');
            }
        };

        const onError = (err: any) => {
            if (isMounted) {
                console.error("TTS Error:", err);
                setAssistantState('idle');
                setStatusMessage('음성 출력 중 오류가 발생했습니다.');
            }
        };

        Tts.addEventListener('tts-start', onStart);
        Tts.addEventListener('tts-finish', onFinish);
        Tts.addEventListener('tts-error', onError);
        Tts.addEventListener('tts-cancel', onFinish);

        return () => {
            isMounted = false;
            Tts.stop();
            // 리스너 해제
            Tts.removeEventListener('tts-start', onStart);
            Tts.removeEventListener('tts-finish', onFinish);
            Tts.removeEventListener('tts-error', onError);
            Tts.removeEventListener('tts-cancel', onFinish);
        };
    }, []);

    const handleSpeak = () => {
        if (!textToSpeak.trim()) {
            setStatusMessage('출력할 텍스트를 입력해주세요.');
            return;
        }

        // 혹시 작동 중일 수 있는 TTS 정지 후 재실행
        Tts.stop();
        Tts.speak(textToSpeak);
    };

    const handleStop = () => {
        Tts.stop();
        setAssistantState('idle');
        setStatusMessage('음성 출력을 중단했습니다.');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <TopHeader title="TTS 테스트" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.content}>
                        <View style={styles.statusBox}>
                            <Text style={styles.stateTitle}>
                                {statusMessage}
                            </Text>
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>출력할 텍스트 입력</Text>
                            <TextInput
                                style={styles.textInput}
                                value={textToSpeak}
                                onChangeText={setTextToSpeak}
                                multiline
                                placeholder="TTS로 읽을 텍스트를 입력하세요."
                                placeholderTextColor="#A0A0A0"
                            />
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    assistantState === 'speaking' ? styles.stopButton : styles.speakButton
                                ]}
                                onPress={assistantState === 'speaking' ? handleStop : handleSpeak}
                            >
                                <Text style={styles.actionButtonText}>
                                    {assistantState === 'speaking' ? '말하기 중지' : '음성으로 듣기'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
    },
    content: {
        padding: 24,
        flex: 1,
        gap: 20,
        paddingBottom: 100, // 하단 탭바 여백
    },
    statusBox: {
        padding: 16,
        backgroundColor: '#E8F0FE',
        borderRadius: 12,
        alignItems: 'center',
    },
    stateTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A73E8',
        textAlign: 'center',
    },
    inputBox: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E2E2',
    },
    inputLabel: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 12,
        fontWeight: '600',
    },
    textInput: {
        flex: 1,
        fontSize: 18,
        color: '#1F2024',
        textAlignVertical: 'top', // 안드로이드 다중 줄 시작점 위로
        padding: 0,
        lineHeight: 28,
    },
    buttonContainer: {
        marginTop: 'auto',
    },
    actionButton: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    speakButton: {
        backgroundColor: '#FFB800',
    },
    stopButton: {
        backgroundColor: '#FF3B30',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
