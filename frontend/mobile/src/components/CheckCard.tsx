import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageSourcePropType,
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
    return (
        <TouchableOpacity
            style={[styles.card, isChecked && styles.cardDone]}
            activeOpacity={0.8}
            onPress={onPress}>
            <View style={[styles.cardBorder, isChecked && styles.cardBorderDone]} />
            <Image source={image} style={styles.cardImage} resizeMode="contain" />
            <View style={styles.cardBottom}>
                <Text style={styles.cardLabel}>{title}</Text>
                <View
                    style={[
                        styles.checkbox,
                        isChecked ? styles.checkboxChecked : styles.checkboxUnchecked,
                    ]}>
                    {isChecked && <CheckIcon />}
                </View>
            </View>
        </TouchableOpacity>
    );
}

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
    card: {
        width: 154.5,
        height: 154.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FE',
        borderRadius: 16,
        overflow: 'hidden',
        // MenuBanner shadow style
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 2,
    },
    cardDone: {
        opacity: 0.85,
    },
    cardBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        borderWidth: 5,
        borderColor: 'transparent',
    },
    cardBorderDone: {
        borderColor: '#006FFD',
    },
    cardImage: {
        width: 100,
        height: 100,
    },
    cardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    cardLabel: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '400',
        fontSize: 15,
        color: '#000000',
    },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#006FFD',
        borderWidth: 1.5,
        borderColor: '#006FFD',
    },
    checkboxUnchecked: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#C5C6CC',
    },
});
