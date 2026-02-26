import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';

import { useMicrophonePermission } from 'react-native-vision-camera';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

type Props = {
    navigation: NativeStackNavigationProp<HomeStackParamList, 'STTTest'>;
};

type AssistantState = 'idle' | 'listening_for_question';

export default function STTTestScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();

    const [assistantState, setAssistantState] = useState<AssistantState>('idle');
    const [recognizedText, setRecognizedText] = useState<string>('');

    // Permissions:
    const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();

    useEffect(() => {
        if (!hasMicPermission) {
            requestMicPermission();
        }
    }, [hasMicPermission, requestMicPermission]);

    // Voice Assistant Setup
    useEffect(() => {
        let isMounted = true;

        const initVoiceAssistant = async () => {
            // 1. Init STT (Voice)
            Voice.onSpeechStart = (e: any) => {
                console.log('[STTTest Debug] Speech Started:', e);
            };

            Voice.onSpeechRecognized = (e: any) => {
                console.log('[STTTest Debug] Speech Recognized:', e);
            };

            Voice.onSpeechPartialResults = (e) => {
                const text = e.value?.[0] || '';
                console.log('[STTTest Debug] Partial Results:', text);
                if (text && isMounted) {
                    setRecognizedText(text);
                }
            };

            Voice.onSpeechResults = (e: SpeechResultsEvent) => {
                const text = e.value?.[0] || '';
                console.log('[STTTest Debug] Final Results:', text);
                if (text && isMounted) {
                    setRecognizedText(text);
                }

                // STT 종료 후 상태 업데이트
                if (isMounted) {
                    setAssistantState('idle');
                }
            };

            Voice.onSpeechError = (e: any) => {
                console.error('Voice Error:', e);
                if (isMounted) {
                    // e.error.code === '7' means "No match" (speech was heard but not recognized)
                    if (e.error?.code === '7') {
                        setRecognizedText('목소리를 인식하지 못했습니다. 더 크고 또렷하게 말씀해주세요.');
                    } else {
                        setRecognizedText('듣기가 중단되었습니다. 하단의 버튼을 눌러 다시 시작하세요.');
                    }
                    setAssistantState('idle');
                }
            };

            // 화면 진입 시 오디오 서버 준비시간(0.5초) 확보 후 시작
            setTimeout(async () => {
                try {
                    if (!isMounted) return;
                    setAssistantState('listening_for_question');
                    setRecognizedText('듣고 있습니다...');
                    await Voice.start('ko-KR');
                } catch (error) {
                    console.error('Voice start Error:', error);
                }
            }, 500);
        };

        if (hasMicPermission) {
            initVoiceAssistant();
        }

        return () => {
            isMounted = false;
            Voice.stop().catch(() => { });
            Voice.destroy().then(Voice.removeAllListeners).catch(() => { });
        };
    }, [hasMicPermission]);

    // 수동 시작 지원
    const handleManualStart = async () => {
        setAssistantState('listening_for_question');
        setRecognizedText('듣고 있습니다...');
        try {
            await Voice.start('ko-KR');
        } catch (e) {
            console.error("Voice start error:", e);
            setAssistantState('idle');
            setRecognizedText('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <TopHeader title="STT 테스트" />

            <View style={styles.content}>
                <View style={styles.statusBox}>
                    <Text style={styles.stateTitle}>
                        현재 상태: {assistantState === 'listening_for_question' ? "음성 인식 중..." : "대기 중"}
                    </Text>
                </View>

                <View style={styles.resultBox}>
                    <Text style={styles.resultLabel}>STT 인식 결과</Text>
                    <Text style={styles.resultText}>
                        {recognizedText || '인식된 텍스트가 여기에 표시됩니다.'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.manualButton, assistantState === 'listening_for_question' && styles.manualButtonActive]}
                    onPress={handleManualStart}
                    disabled={assistantState === 'listening_for_question'}
                >
                    <Text style={styles.manualButtonText}>
                        {assistantState === 'listening_for_question' ? '듣는 중...' : '음성 인식 시작'}
                    </Text>
                </TouchableOpacity>
            </View>
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
        paddingBottom: 100, // 하단 탭바에 가리지 않도록 여백 증가
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
    },
    resultBox: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultLabel: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 12,
    },
    resultText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2024',
        textAlign: 'center',
    },
    manualButton: {
        height: 56,
        borderRadius: 12,
        backgroundColor: '#FFB800',
        justifyContent: 'center',
        alignItems: 'center',
    },
    manualButtonActive: {
        backgroundColor: '#FF3B30',
    },
    manualButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
