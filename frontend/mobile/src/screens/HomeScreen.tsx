import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// ── Assets ──
const mascotHappy = require('../assets/mascot_image4.png');
const mascotSad = require('../assets/mascot_image3.png');

// ── Colors ──
const COLORS = {
  primary: '#006FFD',
  white: '#FFFFFF',
  black: '#000000',
  darkText: '#1F2024',
  iconDark: '#2E3036',
  cardBg: '#F8F9FE',
  bannerBg: '#EAF2FF',
  imagePlaceholder: '#EBF2FF',
  imagePlaceholderIcon: '#B4DBFF',
  muted: '#C5C6CC',
  border: '#F0F0F0',
  secondaryText: '#494A50',
};

// ── Icons ──

function SearchIcon() {
  return (
    <View style={{width: 20, height: 20, justifyContent: 'center', alignItems: 'center'}}>
      <View style={{width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: COLORS.iconDark}} />
      <View
        style={{
          width: 2,
          height: 5,
          backgroundColor: COLORS.iconDark,
          position: 'absolute',
          bottom: 1,
          right: 2,
          transform: [{rotate: '-45deg'}],
          borderRadius: 1,
        }}
      />
    </View>
  );
}

function HeartIcon() {
  return (
    <View style={{width: 24, height: 24, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 18, color: COLORS.darkText}}>♡</Text>
    </View>
  );
}

function HamburgerIcon() {
  return (
    <View style={{width: 24, height: 24, justifyContent: 'center', alignItems: 'center', gap: 4}}>
      <View style={{width: 16, height: 2, backgroundColor: COLORS.primary, borderRadius: 1}} />
      <View style={{width: 12, height: 2, backgroundColor: COLORS.primary, borderRadius: 1, alignSelf: 'flex-end'}} />
      <View style={{width: 16, height: 2, backgroundColor: COLORS.primary, borderRadius: 1}} />
    </View>
  );
}

function ImagePlaceholderIcon() {
  return (
    <View style={{width: 32, height: 32, justifyContent: 'center', alignItems: 'center'}}>
      <View
        style={{
          width: 28,
          height: 22,
          borderWidth: 1.5,
          borderColor: COLORS.imagePlaceholderIcon,
          borderRadius: 4,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.imagePlaceholderIcon, position: 'absolute', top: 3, left: 4}} />
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            left: 3,
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderBottomWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: COLORS.imagePlaceholderIcon,
            transform: [{rotate: '180deg'}],
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            right: 4,
            width: 0,
            height: 0,
            borderLeftWidth: 4,
            borderRightWidth: 4,
            borderBottomWidth: 6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: COLORS.imagePlaceholderIcon,
            transform: [{rotate: '180deg'}],
          }}
        />
      </View>
    </View>
  );
}

function LeftArrowIcon() {
  return <Text style={{fontSize: 16, color: COLORS.muted}}>{'‹'}</Text>;
}

function RightArrowIcon() {
  return <Text style={{fontSize: 16, color: COLORS.darkText}}>{'›'}</Text>;
}

function SparkleIcon() {
  return <Text style={{fontSize: 12, color: COLORS.primary}}>✦</Text>;
}

// ── Data ──

const WORK_HELPER_ITEMS = [
  {id: '1', title: '현황', subtitle: '교대 근무 현황'},
  {id: '2', title: '알림', subtitle: '공지사항 알림'},
  {id: '3', title: '매뉴얼', subtitle: '업무라인별 특이 사항'},
  {id: '4', title: '진단', subtitle: '주간 자가진단'},
  {id: '5', title: '뉴스', subtitle: '보건 관련 기사 조회'},
  {id: '6', title: '퇴근', subtitle: '퇴근하기'},
  {id: '7', title: '휴식', subtitle: '휴식하기'},
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── Calendar Helper ──

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: {day: number; isCurrentMonth: boolean}[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({day: daysInPrevMonth - i, isCurrentMonth: false});
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({day: i, isCurrentMonth: true});
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({day: i, isCurrentMonth: false});
    }
  }
  return days;
}

// ── Components ──

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity>
        <SearchIcon />
      </TouchableOpacity>
      <View style={styles.headerRight}>
        <TouchableOpacity>
          <HeartIcon />
        </TouchableOpacity>
        <TouchableOpacity>
          <View>
            <HamburgerIcon />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>9</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BannerCard({
  mascot,
  label,
  score,
}: {
  mascot: any;
  label: string;
  score: number;
}) {
  return (
    <View style={styles.bannerCard}>
      <Image source={mascot} style={styles.bannerMascot} resizeMode="contain" />
      <View style={styles.bannerTextArea}>
        <Text style={styles.bannerLabel}>{label}</Text>
        <Text style={styles.bannerScore}>{score}</Text>
      </View>
    </View>
  );
}

function WeatherButton() {
  return (
    <View style={styles.weatherFrame}>
      <TouchableOpacity style={styles.weatherButton}>
        <SparkleIcon />
        <Text style={styles.weatherButtonText}>그날의 근무장 환경</Text>
      </TouchableOpacity>
    </View>
  );
}

function WorkHelperCard({title, subtitle}: {title: string; subtitle: string}) {
  return (
    <View style={styles.helperCard}>
      <View style={styles.helperCardImage}>
        <ImagePlaceholderIcon />
      </View>
      <View style={styles.helperCardContent}>
        <Text style={styles.helperCardTitle}>{title}</Text>
        <Text style={styles.helperCardSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function CalendarSection() {
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(11); // December
  const selectedDay = 18;

  const days = getCalendarDays(year, month);
  const calendarCellWidth = (SCREEN_WIDTH - 32 - 40) / 7; // screen - padding - calendar internal padding

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else {
      setMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else {
      setMonth(m => m + 1);
    }
  };

  return (
    <View style={styles.calendarContainer}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarMonthText}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.calendarNavBtn}>
            <LeftArrowIcon />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavBtn}>
            <RightArrowIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day of Week Headers */}
      <View style={styles.calendarGrid}>
        {DAYS_OF_WEEK.map(day => (
          <View key={day} style={[styles.calendarCell, {width: calendarCellWidth}]}>
            <Text style={styles.calendarDayHeaderText}>{day}</Text>
          </View>
        ))}

        {/* Date Cells */}
        {days.map((item, index) => {
          const isSelected = item.isCurrentMonth && item.day === selectedDay;
          return (
            <View key={index} style={[styles.calendarCell, {width: calendarCellWidth}]}>
              <View
                style={[
                  styles.calendarDayInner,
                  isSelected && styles.calendarDaySelected,
                ]}>
                <Text
                  style={[
                    styles.calendarDayText,
                    !item.isCurrentMonth && styles.calendarDayTextMuted,
                    isSelected && styles.calendarDayTextSelected,
                  ]}>
                  {item.day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main Screen ──

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Banner - 컨디션 카드 (터치 시 상태 자세히보기로 이동) */}
        <TouchableOpacity
          style={styles.sectionPadding}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('StatusDetail')}>
          <BannerCard mascot={mascotHappy} label="컨디션 최고!" score={94} />
        </TouchableOpacity>

        {/* Weather Button */}
        <WeatherButton />

        {/* 근무 도우미 Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>근무 도우미</Text>
            <TouchableOpacity>
              <Text style={styles.seeMoreText}>See more</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={WORK_HELPER_ITEMS}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.helperList}
            renderItem={({item}) => (
              <WorkHelperCard title={item.title} subtitle={item.subtitle} />
            )}
          />
        </View>

        {/* 스케줄 + 위험도 Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>스케줄 + 위험도</Text>
          </View>
          <View style={styles.sectionPadding}>
            <CalendarSection />
          </View>
        </View>

        {/* 우리 작업장의 평균 Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>우리 작업장의 평균</Text>
          </View>
          <View style={styles.sectionPadding}>
            <BannerCard mascot={mascotSad} label="우울띠..." score={35} />
          </View>
        </View>

        <View style={{height: 32}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: COLORS.white,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionPadding: {
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
    fontFamily: 'Inter',
  },
  seeMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'Inter',
  },

  // Banner Card (컨디션 / 작업장 평균)
  bannerCard: {
    backgroundColor: COLORS.bannerBg,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerMascot: {
    width: 80,
    height: 80,
  },
  bannerTextArea: {
    marginLeft: 12,
    alignItems: 'center',
  },
  bannerLabel: {
    fontSize: 20,
    fontWeight: '400',
    color: COLORS.black,
    fontFamily: 'Inter',
  },
  bannerScore: {
    fontSize: 50,
    fontWeight: '400',
    color: COLORS.black,
    lineHeight: 56,
  },

  // Weather Button
  weatherFrame: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  weatherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  weatherButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'Inter',
  },

  // Work Helper Cards
  helperList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  helperCard: {
    width: 120,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  helperCardImage: {
    height: 72,
    backgroundColor: COLORS.imagePlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperCardContent: {
    padding: 16,
    gap: 4,
  },
  helperCardTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.darkText,
    fontFamily: 'Inter',
    letterSpacing: 0.12,
  },
  helperCardSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
    fontFamily: 'Inter',
  },

  // Calendar
  calendarContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.black,
    fontFamily: 'Inter',
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 12,
  },
  calendarNavBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.black,
    fontFamily: 'Inter',
  },
  calendarDayInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.darkText,
  },
  calendarDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.black,
    fontFamily: 'Inter',
  },
  calendarDayTextMuted: {
    color: COLORS.muted,
  },
  calendarDayTextSelected: {
    color: COLORS.white,
  },
});
