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

function CheckIcon() {
  return (
    <View style={iconStyles.checkContainer}>
      <View style={iconStyles.checkShort} />
      <View style={iconStyles.checkLong} />
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
                <TouchableOpacity
                  key={item.id}
                  style={styles.equipmentCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (item.checked) return;
                    navigation.navigate('EquipmentCamera', {
                      title: item.title,
                      worksession_id,
                    });
                  }}>
                  <View style={styles.cardBorder} />
                  <Image
                    source={item.image}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardLabel}>{item.title}</Text>
                    <View
                      style={[
                        styles.checkbox,
                        item.checked
                          ? styles.checkboxChecked
                          : styles.checkboxUnchecked,
                      ]}>
                      {item.checked && <CheckIcon />}
                    </View>
                  </View>
                </TouchableOpacity>
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

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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

  /* Equipment Card */
  equipmentCard: {
    width: 154.5,
    height: 154.5,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.25)',
      },
    ],
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: '#EAF2FF',
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
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 15,
    color: '#000000',
  },

  /* Checkbox */
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

  /* Button */
});
