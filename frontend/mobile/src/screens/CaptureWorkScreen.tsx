import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import BaseCamera from '../components/BaseCamera';
import PhotoResultView from '../components/PhotoResultView';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { getSasToken, uploadToBlob, requestTargetPhoto } from '../api/equipment';

type ScreenState = 'idle' | 'camera' | 'preview' | 'sending' | 'sent';

function LargeCheckIcon() {
    return (
        <View style={iconStyles.largeCheckContainer}>
            <View style={iconStyles.largeCheckShort} />
            <View style={iconStyles.largeCheckLong} />
        </View>
    );
}

export default function CaptureWorkScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'CaptureWork'>>();
    const { worksession_id } = route.params;
    const insets = useSafeAreaInsets();
    const [screenState, setScreenState] = useState<ScreenState>('idle');
    const [photoPath, setPhotoPath] = useState<string | null>(null);

    const cameraRef = useRef<Camera>(null);

    const handleStartCamera = useCallback(() => {
        setScreenState('camera');
    }, []);

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current) {
            return;
        }
        const photo = await cameraRef.current.takePhoto();
        const fileUri = `file://${photo.path}`;
        setPhotoPath(fileUri);
        setScreenState('preview');
    }, []);

    const handleRetake = useCallback(() => {
        setPhotoPath(null);
        setScreenState('camera');
    }, []);

    const handleSend = useCallback(async () => {
        if (!photoPath) {
            return;
        }
        setScreenState('sending');
        try {
            const { upload_url, blob_name } = await getSasToken();
            await uploadToBlob(upload_url, photoPath);
            // 업로드 성공 후 백엔드 DB에 기록 요청
            await requestTargetPhoto(blob_name, worksession_id, 'BEFORE');
            setScreenState('sent');
        } catch (err) {
            console.error('CaptureWork upload error:', err);
            Alert.alert(
                '업로드 실패',
                '사진 업로드 또는 DB 기록에 실패했습니다. 다시 시도해주세요.',
            );
            setScreenState('preview');
        }
    }, [photoPath, worksession_id]);

    const handleDone = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <TopHeader title="작업물 촬영" />

            {/* Idle State */}
            {screenState === 'idle' && (
                <View style={styles.idleContent}>
                    <Text style={styles.idleTitle}>작업물 상태를 촬영합니다</Text>
                    <Text style={styles.idleSubtitle}>현장 사진을 촬영해주세요</Text>
                    <TouchableOpacity
                        style={styles.startCameraButton}
                        activeOpacity={0.8}
                        onPress={handleStartCamera}>
                        <Text style={styles.startCameraButtonText}>촬영 시작</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Camera & Preview States */}
            {screenState !== 'idle' && (
                <>
                    <View style={styles.cameraPreview}>
                        {screenState === 'camera' && (
                            <BaseCamera
                                ref={cameraRef}
                                isActive={true}
                                photo={true}
                                guideText="작업물 상태를 촬영하세요"
                                onCapture={handleCapture}
                            />
                        )}
                        {screenState === 'preview' && photoPath && (
                            <PhotoResultView
                                photoPath={photoPath}
                                onRetake={handleRetake}
                                onConfirm={handleSend}
                                confirmText="사진 보내기"
                            />
                        )}
                        {screenState === 'sending' && photoPath && (
                            <PhotoResultView
                                photoPath={photoPath}
                                onRetake={handleRetake}
                                onConfirm={handleSend}
                                confirmText="사진 보내기"
                                showControls={false}
                            >
                                <View style={styles.resultOverlay}>
                                    <ActivityIndicator size="large" color="#006FFD" />
                                    <Text style={styles.resultOverlayText}>업로드 중...</Text>
                                </View>
                            </PhotoResultView>
                        )}
                        {screenState === 'sent' && photoPath && (
                            <PhotoResultView
                                photoPath={photoPath}
                                onRetake={handleRetake}
                                onConfirm={handleDone}
                                confirmText="확인"
                            >
                                <View style={styles.resultOverlay}>
                                    <LargeCheckIcon />
                                    <Text style={styles.resultOverlayText}>전송 완료</Text>
                                </View>
                            </PhotoResultView>
                        )}
                    </View>

                    {/* Bottom Spacer Section to match EquipmentCameraScreen Layout */}
                    {screenState === 'camera' && (
                        <View
                            style={[
                                styles.bottomSection,
                                { height: insets.bottom + 16 },
                            ]}
                        />
                    )}
                </>
            )}
        </View>
    );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
    largeCheckContainer: {
        width: 112,
        height: 112,
        justifyContent: 'center',
        alignItems: 'center',
    },
    largeCheckShort: {
        width: 36,
        height: 8,
        backgroundColor: '#006FFD',
        borderRadius: 4,
        position: 'absolute',
        left: 16,
        bottom: 24,
        transform: [{ rotate: '45deg' }],
    },
    largeCheckLong: {
        width: 72,
        height: 8,
        backgroundColor: '#006FFD',
        borderRadius: 4,
        position: 'absolute',
        right: 8,
        bottom: 36,
        transform: [{ rotate: '-45deg' }],
    },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
    },

    /* Idle */
    idleContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    idleTitle: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '600',
        fontSize: 20,
        color: '#1F2024',
    },
    idleSubtitle: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '400',
        fontSize: 14,
        color: '#71727A',
    },
    startCameraButton: {
        width: 200,
        height: 52,
        borderRadius: 15,
        backgroundColor: '#006FFD',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    startCameraButtonText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '600',
        fontSize: 16,
        color: '#FFFFFF',
    },

    /* Camera */
    cameraPreview: {
        flex: 1,
        marginTop: 16,
        marginHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'stretch',
    },
    resultOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    resultOverlayText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '700',
        fontSize: 20,
        color: '#1F2024',
    },
    noCameraText: {
        fontFamily: 'Noto Sans KR',
        fontSize: 14,
        color: '#FFFFFF',
    },

    /* Result Card */
    resultCard: {
        width: 229,
        height: 169,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        zIndex: 1,
    },
    resultText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '400',
        fontSize: 20,
        color: '#000000',
    },

    /* Bottom Buttons */
    bottomSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    retakeButton: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#006FFD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    retakeButtonText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '500',
        fontSize: 16,
        color: '#006FFD',
    },
    sendButton: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#006FFD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '500',
        fontSize: 16,
        color: '#FFFFFF',
    },
    doneButton: {
        width: '100%',
        height: 48,
        borderRadius: 10,
        backgroundColor: '#006FFD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButtonText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '500',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
