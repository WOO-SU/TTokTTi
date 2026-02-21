import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export function BackArrowIcon() {
    return (
        <View style={iconStyles.backContainer}>
            <View style={iconStyles.arrowTop} />
            <View style={iconStyles.arrowBottom} />
        </View>
    );
}

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

interface TopHeaderProps {
    title: string;
    showBackButton?: boolean;
    rightComponent?: React.ReactNode;
}

export default function TopHeader({ title, showBackButton = true, rightComponent }: TopHeaderProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    return (
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            {showBackButton ? (
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <BackArrowIcon />
                </TouchableOpacity>
            ) : (
                <View style={styles.backButton} />
            )}
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.rightContainer}>
                {rightComponent}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
        flex: 1,
    },
    rightContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
