import React, { useEffect, forwardRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useMicrophonePermission,
} from 'react-native-vision-camera';

export interface BaseCameraProps {
    isActive: boolean;
    photo?: boolean;
    video?: boolean;
    audio?: boolean;
    guideText?: string;
    showControls?: boolean;
    isRecording?: boolean;
    onCapture?: () => void;
    onInitialized?: () => void;
    children?: React.ReactNode;
}

const BaseCamera = forwardRef<Camera, BaseCameraProps>(
    (
        {
            isActive,
            photo = true,
            video = false,
            audio = false,
            guideText,
            showControls = true,
            isRecording = false,
            onCapture,
            onInitialized,
            children,
        },
        ref
    ) => {
        const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
        const device = useCameraDevice(cameraType);
        const { hasPermission: hasCamPermission, requestPermission: requestCamPermission } = useCameraPermission();
        const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();

        useEffect(() => {
            if (!hasCamPermission) {
                requestCamPermission();
            }
            if (audio && !hasMicPermission) {
                requestMicPermission();
            }
        }, [hasCamPermission, requestCamPermission, audio, hasMicPermission, requestMicPermission]);

        const toggleCameraType = useCallback(() => {
            setCameraType((prev) => (prev === 'back' ? 'front' : 'back'));
        }, []);

        if (!hasCamPermission || (audio && !hasMicPermission)) {
            return (
                <View style={styles.fallbackContainer}>
                    <Text style={styles.fallbackText}>카메라 (및 마이크) 권한이 필요합니다</Text>
                </View>
            );
        }

        if (!device) {
            return (
                <View style={styles.fallbackContainer}>
                    <Text style={styles.fallbackText}>카메라 기기를 찾을 수 없습니다</Text>
                </View>
            );
        }

        return (
            <View style={[StyleSheet.absoluteFill, styles.container]}>
                <Camera
                    ref={ref}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
                    device={device}
                    isActive={isActive}
                    photo={photo}
                    video={video}
                    audio={audio}
                    onInitialized={onInitialized}
                />

                {/* Camera Overlay Controls */}
                {isActive && showControls && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        {guideText && (
                            <View style={styles.guideOverlay}>
                                <Text style={styles.guideOverlayText}>{guideText}</Text>
                            </View>
                        )}

                        {onCapture && (
                            <TouchableOpacity
                                style={[
                                    styles.captureButton,
                                    isRecording && styles.captureButtonRecording
                                ]}
                                activeOpacity={0.7}
                                onPress={onCapture}>
                                {isRecording ? (
                                    <View style={styles.stopIcon} />
                                ) : (
                                    <View style={styles.cameraContainer}>
                                        <View style={styles.cameraBody}>
                                            <View style={styles.cameraLens} />
                                        </View>
                                        <View style={styles.cameraTop} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.flipButton}
                            activeOpacity={0.7}
                            onPress={toggleCameraType}>
                            <View style={styles.syncIconContainer}>
                                <View style={styles.syncArc} />
                                <View style={styles.syncArrow} />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {children && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        {children}
                    </View>
                )}
            </View>
        );
    }
);

BaseCamera.displayName = 'BaseCamera';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    fallbackText: {
        fontFamily: 'Noto Sans KR',
        fontSize: 14,
        color: '#FFFFFF',
    },
    /* ──────── UI Controls Styles ──────── */
    captureButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#006FFD',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
    },
    captureButtonRecording: {
        backgroundColor: '#FF3B30',
    },
    flipButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 31,
        right: 24,
    },
    guideOverlay: {
        position: 'absolute',
        bottom: 110,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'center',
    },
    guideOverlayText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '500',
        fontSize: 14,
        color: '#FFFFFF',
    },
    /* ──────── Icon Styles ──────── */
    cameraContainer: {
        width: 28,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBody: {
        width: 28,
        height: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
    },
    cameraTop: {
        width: 12,
        height: 6,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        position: 'absolute',
        top: 0,
    },
    cameraLens: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#006FFD',
    },
    stopIcon: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    /* Sync Icon (Flip Button) - Single Arrow Refresh Style */
    syncIconContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    syncArc: {
        position: 'absolute',
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2.2,
        borderColor: '#1F2024',
        borderRightColor: 'transparent',
        transform: [{ rotate: '-30deg' }],
    },
    syncArrow: {
        position: 'absolute',
        top: 2.5,
        right: 3,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderBottomWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#1F2024',
        transform: [{ rotate: '110deg' }],
    },
});

export default BaseCamera;
