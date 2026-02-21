import React, { useEffect, forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
            onInitialized,
            children,
        },
        ref
    ) => {
        const device = useCameraDevice('back');
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
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isActive}
                    photo={photo}
                    video={video}
                    audio={audio}
                    onInitialized={onInitialized}
                />
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
});

export default BaseCamera;
