import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    type StyleProp,
    type ImageStyle,
    type ImageSourcePropType,
} from 'react-native';

interface MenuBannerProps {
    title: string;
    imageSource: ImageSourcePropType;
    imageStyle?: StyleProp<ImageStyle>;
    onPress: () => void;
}

export default function MenuBanner({ title, imageSource, imageStyle, onPress }: MenuBannerProps) {
    return (
        <TouchableOpacity
            style={styles.bannerSection}
            activeOpacity={0.8}
            onPress={onPress}>
            <View style={styles.bannerCard}>
                <Image
                    source={imageSource}
                    style={[styles.bannerImageBase, imageStyle]}
                    resizeMode="contain"
                />
                <Text style={styles.bannerText}>
                    {title}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    bannerSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    bannerCard: {
        height: 120, // Reduced from 140 to 120 based on HomeScreen visual weight
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        overflow: 'hidden',
        // Add subtle shadow for premium feel
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 2,
    },
    bannerImageBase: {
        position: 'absolute',
        right: 5,
        bottom: -10,
    },
    bannerText: {
        fontFamily: 'Noto Sans KR',
        fontWeight: '700',
        fontSize: 20,
        color: '#1F2024',
        lineHeight: 28,
    },
});
