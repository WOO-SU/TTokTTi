import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhotoResultViewProps {
    photoPath: string;
    onRetake: () => void;
    onConfirm: () => void;
    confirmText: string;
    isConfirming?: boolean;
    showControls?: boolean;
    children?: React.ReactNode;
}

export default function PhotoResultView({
    photoPath,
    onRetake,
    onConfirm,
    confirmText,
    isConfirming = false,
    showControls = true,
    children,
}: PhotoResultViewProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={styles.imageContainer}>
                <Image source={{ uri: photoPath }} style={styles.capturedImage} />
                {children}
            </View>

            {showControls && (
                <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.retakeButton}
                            activeOpacity={0.8}
                            disabled={isConfirming}
                            onPress={onRetake}>
                            <Text style={styles.retakeButtonText}>다시 촬영</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            activeOpacity={0.8}
                            disabled={isConfirming}
                            onPress={onConfirm}>
                            {isConfirming ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    imageContainer: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#F8F8F8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    capturedImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },
    bottomSection: {
        alignItems: 'center',
        paddingHorizontal: 5, // Small padding to match camera overlay horizontal alignment
        backgroundColor: '#FFFFFF',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 16,
    },
    retakeButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#006FFD',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    retakeButtonText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '600',
        fontSize: 16,
        color: '#006FFD',
    },
    confirmButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#006FFD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '600',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
