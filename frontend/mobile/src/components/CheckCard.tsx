import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageSourcePropType,
    Animated,
} from 'react-native';

type Props = {
    title: string;
    image: ImageSourcePropType;
    isChecked: boolean;
    onPress: () => void;
};

/* ──────── Icon Components ──────── */

function CheckIcon() {
    return (
        <View style={iconStyles.checkContainer}>
            <View style={iconStyles.checkShort} />
            <View style={iconStyles.checkLong} />
        </View>
    );
}

const iconStyles = StyleSheet.create({
    checkContainer: {
        width: 10,
        height: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkShort: {
        width: 5,
        height: 1.5,
        backgroundColor: '#FFFFFF',
        borderRadius: 1,
        position: 'absolute',
        left: 0,
        bottom: 1,
        transform: [{ rotate: '45deg' }],
    },
    checkLong: {
        width: 9,
        height: 1.5,
        backgroundColor: '#FFFFFF',
        borderRadius: 1,
        position: 'absolute',
        right: 0,
        bottom: 2.5,
        transform: [{ rotate: '-45deg' }],
    },
});

/* ──────── Main Component ──────── */

export default function CheckCard({ title, image, isChecked, onPress }: Props) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: isChecked ? 1.05 : 1,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
        }).start();
    }, [isChecked, scaleAnim]);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[
                    styles.card,
                    isChecked && styles.cardDone
                ]}
                activeOpacity={0.8}
                onPress={onPress}>
                <View style={[styles.cardBorder, isChecked && styles.cardBorderDone]} />
                <Image source={image} style={styles.cardImage} resizeMode="contain" />
                <View style={styles.cardBottom}>
                    <Text style={[styles.cardLabel, isChecked && styles.cardLabelDone]}>{title}</Text>
                    <View
                        style={[
                            styles.checkbox,
                            isChecked ? styles.checkboxChecked : styles.checkboxUnchecked,
                        ]}>
                        {isChecked && <CheckIcon />}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
    card: {
        width: 154.5,
        height: 154.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'visible', // To show the glow
        // Default subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardDone: {
        backgroundColor: '#F8F9FE',
        // Premium Blue Glow
        shadowColor: '#FFB800',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    cardBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E8E9F1',
    },
    cardBorderDone: {
        borderColor: '#FFB800',
        borderWidth: 2,
    },
    cardImage: {
        width: 90,
        height: 90,
        marginBottom: 4,
    },
    cardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
    },
    cardLabel: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '500',
        fontSize: 14,
        color: '#1F2024',
    },
    cardLabelDone: {
        fontWeight: '700',
        color: '#FFB800',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#FFB800',
        borderWidth: 0,
    },
    checkboxUnchecked: {
        backgroundColor: '#F8F9FE',
        borderWidth: 1,
        borderColor: '#C5C6CC',
    },
});
