import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RiskAssessment'>;
  route: RouteProp<RootStackParamList, 'RiskAssessment'>;
};

type AssessmentItem = {
  id: string;
  title: string;
  checked: boolean;
};

const INITIAL_ITEMS: AssessmentItem[] = [
  { id: '1', title: '안전모', checked: false },
  { id: '2', title: '조끼', checked: false },
  { id: '3', title: '안전화', checked: false },
  { id: '4', title: '장갑', checked: false },
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

function ChevronRightIcon() {
  return (
    <View style={iconStyles.chevronContainer}>
      <View style={iconStyles.chevronTop} />
      <View style={iconStyles.chevronBottom} />
    </View>
  );
}

/* ──────── Main Component ──────── */

export default function RiskAssessmentScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AssessmentItem[]>(INITIAL_ITEMS);

  // 카메라 화면에서 성공 후 돌아오면 해당 항목 자동 체크
  useEffect(() => {
    const completedTitle = route.params?.completedTitle;
    if (completedTitle) {
      setItems(prev =>
        prev.map(item =>
          item.title === completedTitle ? { ...item, checked: true } : item,
        ),
      );
    }
  }, [route.params?.completedTitle]);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Nav Bar */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>안전 장비 점검</Text>
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        {items.map((item, index) => (
          <View key={item.id}>
            <View style={styles.listItem}>
              {/* Title */}
              <Text style={styles.itemTitle}>{item.title}</Text>

              {/* Right Side */}
              <View style={styles.itemRight}>
                {/* Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    item.checked
                      ? styles.checkboxChecked
                      : styles.checkboxUnchecked,
                  ]}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.7}>
                  {item.checked && <CheckIcon />}
                </TouchableOpacity>

                {/* Chevron */}
                <TouchableOpacity
                  style={styles.chevronButton}
                  onPress={() =>
                    navigation.navigate('EquipmentCamera', {
                      title: item.title,
                    })
                  }>
                  <ChevronRightIcon />
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            {index < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
        {/* Bottom divider */}
        <View style={styles.divider} />
      </View>

      {/* 요청보내기 Button */}
      <View style={[styles.submitSection, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
          <Text style={styles.submitText}>요청보내기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ──────── Icon Styles ──────── */

const iconStyles = StyleSheet.create({
  backContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowTop: {
    width: 12,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }, { translateY: -4.5 }],
  },
  backArrowBottom: {
    width: 12,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 4.5 }],
  },
  checkContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkShort: {
    width: 6,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    position: 'absolute',
    left: 1,
    bottom: 3,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    width: 12,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    position: 'absolute',
    right: 0,
    bottom: 5,
    transform: [{ rotate: '-45deg' }],
  },
  chevronContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronTop: {
    width: 7,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: -2 }],
  },
  chevronBottom: {
    width: 7,
    height: 2,
    backgroundColor: '#006FFD',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }, { translateY: 2 }],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Nav Bar */
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  backButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2024',
    textAlign: 'center',
  },

  /* List */
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 64,
  },
  itemTitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#1F2024',
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  /* Checkbox */
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#006FFD',
    borderWidth: 1,
    borderColor: '#006FFD',
  },
  checkboxUnchecked: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C5C6CC',
  },

  /* Chevron */
  chevronButton: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#D3D5DD',
  },

  /* Submit Button */
  submitSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 16,
  },
  submitButton: {
    width: 153,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#006FFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
