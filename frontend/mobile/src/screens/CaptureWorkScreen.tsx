import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

export default function CaptureWorkScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RouteProp<RootStackParamList, 'CaptureWork'>>();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>작업물 촬영</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.placeholderText}>작업물 촬영 화면 (준비중)</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EAF2FF',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    backText: { fontSize: 24, color: '#1F2024' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2024', marginLeft: 8 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 16, color: '#71727A' },
});
