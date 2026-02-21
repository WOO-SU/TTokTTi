import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FavoriteScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>즐겨찾기 화면입니다.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    text: {
        fontFamily: 'Inter',
        fontSize: 16,
        color: '#1F2024',
    },
});
