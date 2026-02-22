import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../../App';
import TopHeader from '../components/TopHeader';
import { useWorkSession } from '../context/WorkSessionContext';
import CheckCard from '../components/CheckCard';

type Props = {
  navigation: NativeStackNavigationProp<
    HomeStackParamList,
    'SafetyEquipmentCheck'
  >;
  route: RouteProp<HomeStackParamList, 'SafetyEquipmentCheck'>;
};

type EquipmentItem = {
  id: string;
  title: string;
  checked: boolean;
  image: any;
};

const INITIAL_ITEMS: EquipmentItem[] = [
  {
    id: '1',
    title: '안전모',
    checked: false,
    image: require('../assets/helmet.png'),
  },
  {
    id: '2',
    title: '안전조끼',
    checked: false,
    image: require('../assets/vest.png'),
  },
  {
    id: '3',
    title: '안전장갑',
    checked: false,
    image: require('../assets/glove.png'),
  },
];

/* ──────── Icon Components ──────── */

function BackArrowIcon() {
  return (
    <View style={iconStyles.backContainer}>
      <View style={iconStyles.backArrowTop} />
      <View style={iconStyles.backArrowBottom} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function SafetyEquipmentCheckScreen({
  navigation,
  route,
}: Props) {
  const insets = useSafeAreaInsets();
  const { worksession_id } = route.params;
  const { completedItems } = useWorkSession();

  const rows: EquipmentItem[][] = [];
  const displayItems = INITIAL_ITEMS.map(item => ({
    ...item,
    checked: completedItems.includes(item.title),
  }));
  for (let i = 0; i < displayItems.length; i += 2) {
    rows.push(displayItems.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TopHeader title="안전 장비 점검" />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map(item => (
                <CheckCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  isChecked={item.checked}
                  onPress={() => {
                    if (item.checked) return;
                    navigation.navigate('EquipmentCamera', {
                      title: item.title,
                      worksession_id,
                    });
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 요청하기 Button */}

    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  backContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowTop: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }, { translateY: -5.5 }],
  },
  backArrowBottom: {
    width: 14,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 5.5 }],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },

  /* Content */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  gridContainer: {
    gap: 20,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
});
