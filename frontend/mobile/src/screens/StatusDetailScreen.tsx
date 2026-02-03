import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const mascotNeutral = require('../assets/mascot_neutral.png');

// ── Colors ──
const C = {
  purple: '#6425FE',
  purpleGrid: '#6F6AF8',
  blue: '#006FFD',
  white: '#FFFFFF',
  lightBlue: '#EAF2FF',
  darkText: '#1F2024',
  grayText: '#838383',
  statValue: '#2C2C2C',
  descText: '#71727A',
  black: '#000000',
};

// ── Chart Data Points (normalized 0-1 for 90-180 range) ──
const CHART_DATA = [
  0.0, 0.05, 0.15, 0.35, 0.45, 0.42, 0.38, 0.33,
  0.28, 0.25, 0.35, 0.42, 0.48, 0.45, 0.52, 0.55,
  0.58, 0.62, 0.68, 0.72, 0.78, 0.85, 0.88, 0.82,
  0.85, 0.9, 0.88, 0.92, 0.85, 0.88,
];

// ── Components ──

function ChartLine() {
  const chartWidth = SCREEN_WIDTH - 24 - 24 - 50; // container padding + y-axis space
  const chartHeight = 160;
  const pointCount = CHART_DATA.length;
  const stepX = chartWidth / (pointCount - 1);

  // Build SVG-like path using Views
  // We'll render the line using small positioned dots and connecting segments
  return (
    <View style={{width: chartWidth, height: chartHeight, position: 'relative'}}>
      {/* Gradient fill area */}
      {CHART_DATA.map((val, i) => {
        const x = i * stepX;
        const y = chartHeight - val * chartHeight;
        const barHeight = chartHeight - y;
        return (
          <View
            key={`fill-${i}`}
            style={{
              position: 'absolute',
              left: x - stepX / 2,
              top: y,
              width: stepX,
              height: barHeight,
              backgroundColor: C.purple,
              opacity: 0.08,
            }}
          />
        );
      })}

      {/* Line segments */}
      {CHART_DATA.map((val, i) => {
        if (i === 0) return null;
        const prevVal = CHART_DATA[i - 1];
        const x1 = (i - 1) * stepX;
        const y1 = chartHeight - prevVal * chartHeight;
        const x2 = i * stepX;
        const y2 = chartHeight - val * chartHeight;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={`line-${i}`}
            style={{
              position: 'absolute',
              left: x1,
              top: y1 - 1,
              width: length,
              height: 2,
              backgroundColor: C.purple,
              opacity: 0.5,
              transform: [{rotate: `${angle}deg`}],
              transformOrigin: 'left center',
            }}
          />
        );
      })}
    </View>
  );
}

function Chart() {
  const chartAreaWidth = SCREEN_WIDTH - 24 - 24 - 50;
  const yLabels = ['180', '150', '120', '90'];
  const xLabels = ['08 am', '13 pm', '18 pm'];

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartArea}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          {yLabels.map(label => (
            <Text key={label} style={styles.yAxisLabel}>
              {label}
            </Text>
          ))}
        </View>

        {/* Chart Grid + Line */}
        <View style={{flex: 1}}>
          {/* Grid */}
          <View style={[styles.gridContainer, {height: 160}]}>
            {/* Horizontal grid lines */}
            {[0, 1, 2, 3].map(i => (
              <View
                key={`h-${i}`}
                style={[
                  styles.gridLineH,
                  {top: i * (160 / 3)},
                  {width: chartAreaWidth},
                ]}
              />
            ))}
            {/* Vertical grid lines */}
            {[0, 1, 2, 3].map(i => (
              <View
                key={`v-${i}`}
                style={[
                  styles.gridLineV,
                  {left: i * (chartAreaWidth / 3)},
                  {height: 160},
                ]}
              />
            ))}
          </View>

          {/* Chart Line */}
          <View style={{position: 'absolute', top: 0, left: 0}}>
            <ChartLine />
          </View>
        </View>
      </View>

      {/* X-Axis Labels */}
      <View style={styles.xAxis}>
        {xLabels.map(label => (
          <Text key={label} style={styles.xAxisLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={styles.statValue}>172</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Prev Close (Avr 28 Days)</Text>
            <Text style={styles.statValue}>144</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={styles.statValue}>90</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Open</Text>
            <Text style={styles.statValue}>90</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SendIcon() {
  return (
    <View style={{width: 20, height: 20, justifyContent: 'center', alignItems: 'center'}}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 10,
          borderBottomWidth: 6,
          borderTopWidth: 6,
          borderLeftColor: C.blue,
          borderBottomColor: 'transparent',
          borderTopColor: 'transparent',
          transform: [{rotate: '-30deg'}],
        }}
      />
    </View>
  );
}

function PlusIcon() {
  return (
    <View style={{width: 12, height: 12, justifyContent: 'center', alignItems: 'center'}}>
      <View style={{width: 12, height: 2, backgroundColor: C.white, borderRadius: 1, position: 'absolute'}} />
      <View style={{width: 2, height: 12, backgroundColor: C.white, borderRadius: 1, position: 'absolute'}} />
    </View>
  );
}

// ── Main Screen ──

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

function BackIcon() {
  return (
    <View style={{width: 24, height: 24, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 20, color: C.darkText}}>{'‹'}</Text>
    </View>
  );
}

export default function StatusDetailScreen({navigation}: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Chart Section (blue background) */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>위험도 경향</Text>
          <Chart />
        </View>

        {/* Details Section (white background) */}
        <View style={styles.detailsSection}>
          {/* Date + Send Icon */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.dateText}>2026/02/01</Text>
              <View style={styles.riskRow}>
                <Text style={styles.riskText}>중위험</Text>
                <Image source={mascotNeutral} style={styles.riskMascot} resizeMode="contain" />
              </View>
            </View>
            <TouchableOpacity>
              <SendIcon />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.descriptionText}>
            주의가 필요합니다
          </Text>

          {/* Blood Pressure Section */}
          <View style={styles.bpSection}>
            <Text style={styles.bpTitle}>상세분석</Text>
            <View style={styles.bpStatusContainer}>
              <Text style={styles.bpStatusText}>
                심장 변이도(HRV)가 낮아 스트레스 지수가 높습니다.
              </Text>
              <Text style={styles.bpStatusText}>가벼운 휴식을 권장 합니다</Text>
            </View>
          </View>

          {/* Bottom Button */}
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
            <PlusIcon />
            <Text style={styles.actionButtonText}>10분 휴식하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.lightBlue,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.lightBlue,
  },
  backButton: {
    padding: 4,
  },

  // Chart Section
  chartSection: {
    backgroundColor: C.lightBlue,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.darkText,
    fontFamily: 'Inter',
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  // Tab Bar (unused but kept for reference)
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingRight: 8,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabSelected: {
    backgroundColor: C.purple,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.grayText,
    fontFamily: 'Inter',
  },
  tabTextSelected: {
    color: C.white,
  },

  // Chart Card
  chartCard: {
    backgroundColor: C.lightBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  chartArea: {
    flexDirection: 'row',
    height: 160,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    marginRight: 8,
  },
  yAxisLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.grayText,
    fontFamily: 'Inter',
  },
  gridContainer: {
    position: 'relative',
  },
  gridLineH: {
    position: 'absolute',
    height: 1,
    borderTopWidth: 1,
    borderColor: C.purpleGrid,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  gridLineV: {
    position: 'absolute',
    width: 1,
    borderLeftWidth: 1,
    borderColor: C.purpleGrid,
    borderStyle: 'dashed',
    opacity: 0.3,
    top: 0,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 38,
  },
  xAxisLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.grayText,
    fontFamily: 'Inter',
  },

  // Stats
  statsContainer: {
    marginTop: 20,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 96,
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: C.grayText,
    textTransform: 'capitalize',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: C.statValue,
    fontFamily: 'Inter',
  },

  // Details Section
  detailsSection: {
    backgroundColor: C.white,
    paddingHorizontal: 24,
    paddingVertical: 24,
    flex: 1,
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.darkText,
    fontFamily: 'Inter',
    letterSpacing: 0.09,
    lineHeight: 22,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  riskText: {
    fontSize: 16,
    fontWeight: '400',
    color: C.darkText,
    fontFamily: 'Inter',
    lineHeight: 22,
  },
  riskMascot: {
    width: 35,
    height: 35,
  },

  // Description
  descriptionText: {
    fontSize: 12,
    fontWeight: '400',
    color: C.descText,
    fontFamily: 'Inter',
    letterSpacing: 0.12,
    lineHeight: 16,
    marginTop: 24,
  },

  // Blood Pressure
  bpSection: {
    marginTop: 40,
    gap: 8,
  },
  bpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.darkText,
    fontFamily: 'Inter',
  },
  bpStatusContainer: {
    gap: 4,
  },
  bpStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.black,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
  },

  // Action Button
  actionButton: {
    backgroundColor: C.blue,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.white,
    fontFamily: 'Inter',
  },
});