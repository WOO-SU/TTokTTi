import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../App';
import {s, ms} from '../utils';
import {Colors, Fonts} from '../utils';

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
  {id: '1', title: '안전모', checked: false},
  {id: '2', title: '조끼', checked: false},
  {id: '3', title: '안전화', checked: false},
  {id: '4', title: '장갑', checked: false},
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

export default function RiskAssessmentScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AssessmentItem[]>(INITIAL_ITEMS);

  // 카메라 화면에서 성공 후 돌아오면 해당 항목 자동 체크
  useEffect(() => {
    const completedTitle = route.params?.completedTitle;
    if (completedTitle) {
      setItems(prev =>
        prev.map(item =>
          item.title === completedTitle ? {...item, checked: true} : item,
        ),
      );
    }
  }, [route.params?.completedTitle]);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? {...item, checked: !item.checked} : item,
      ),
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Nav Bar */}
      <View style={[styles.navBar, {paddingTop: insets.top}]}>
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
      <View
        style={[styles.submitSection, {paddingBottom: insets.bottom + s(16)}]}>
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
    width: s(20),
    height: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowTop: {
    width: s(12),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    transform: [{rotate: '-45deg'}, {translateY: s(-4.5)}],
  },
  backArrowBottom: {
    width: s(12),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    transform: [{rotate: '45deg'}, {translateY: s(4.5)}],
  },
  checkContainer: {
    width: s(16),
    height: s(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkShort: {
    width: s(6),
    height: s(2),
    backgroundColor: Colors.white,
    borderRadius: s(1),
    position: 'absolute',
    left: s(1),
    bottom: s(3),
    transform: [{rotate: '45deg'}],
  },
  checkLong: {
    width: s(12),
    height: s(2),
    backgroundColor: Colors.white,
    borderRadius: s(1),
    position: 'absolute',
    right: 0,
    bottom: s(5),
    transform: [{rotate: '-45deg'}],
  },
  chevronContainer: {
    width: s(12),
    height: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronTop: {
    width: s(7),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    transform: [{rotate: '45deg'}, {translateY: s(-2)}],
  },
  chevronBottom: {
    width: s(7),
    height: s(2),
    backgroundColor: Colors.primary,
    borderRadius: s(1),
    position: 'absolute',
    transform: [{rotate: '-45deg'}, {translateY: s(2)}],
  },
});

/* ──────── Main Styles ──────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  /* Nav Bar */
  navBar: {
    height: s(56),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(24),
    backgroundColor: Colors.white,
    gap: s(8),
  },
  backButton: {
    width: s(20),
    height: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '700',
    fontSize: ms(14),
    color: Colors.textDark,
    textAlign: 'center',
  },

  /* List */
  listContainer: {
    paddingHorizontal: s(16),
    paddingTop: s(24),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingVertical: s(16),
    minHeight: s(64),
  },
  itemTitle: {
    fontFamily: Fonts.inter,
    fontWeight: '400',
    fontSize: ms(14),
    color: Colors.textDark,
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(16),
  },

  /* Checkbox */
  checkbox: {
    width: s(32),
    height: s(32),
    borderRadius: s(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  checkboxUnchecked: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  /* Chevron */
  chevronButton: {
    width: s(12),
    height: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  /* Submit Button */
  submitSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: s(16),
  },
  submitButton: {
    width: s(153),
    height: s(38),
    borderRadius: s(15),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontFamily: Fonts.inter,
    fontWeight: '600',
    fontSize: ms(14),
    color: Colors.white,
  },
});
