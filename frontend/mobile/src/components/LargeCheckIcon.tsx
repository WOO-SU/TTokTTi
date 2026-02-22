import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function LargeCheckIcon() {
    return (
        <View style={styles.largeCheckContainer}>
            <View style={styles.largeCheckShort} />
            <View style={styles.largeCheckLong} />
        </View>
    );
}

const styles = StyleSheet.create({
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
