/**
 * HabitHeatmap - GitHub-style contribution grid for logging consistency.
 *
 * Features:
 * - 52 weeks x 7 days grid
 * - Color intensity based on logging completeness (0%, 25%, 50%, 75%, 100%)
 * - Current streak counter
 * - Total days logged
 * - Scrollable with month labels
 * - Uses react-native-svg for rendering
 */

import React, { memo, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Flame, CalendarDays } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid configuration
const CELL_SIZE = 11;
const CELL_GAP = 2;
const CELL_TOTAL = CELL_SIZE + CELL_GAP;
const WEEKS = 52;
const DAYS = 7;
const LABEL_WIDTH = 24;
const GRID_WIDTH = WEEKS * CELL_TOTAL + LABEL_WIDTH;

// Color levels based on logging completeness
const LEVEL_COLORS = [
  'rgba(255, 255, 255, 0.04)', // 0% - empty
  'rgba(0, 212, 255, 0.15)',   // 1-25%
  'rgba(0, 212, 255, 0.35)',   // 26-50%
  'rgba(0, 212, 255, 0.60)',   // 51-75%
  '#00D4FF',                   // 76-100% - full
];

function getLevel(completeness) {
  if (completeness <= 0) return 0;
  if (completeness <= 0.25) return 1;
  if (completeness <= 0.50) return 2;
  if (completeness <= 0.75) return 3;
  return 4;
}

// Day labels
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

// Month name lookup
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function HabitHeatmap({ dayData, currentStreak = 0 }) {
  const scrollRef = useRef(null);

  // Build 52-week grid of completeness values
  const { grid, monthLabels, totalLogged, dateGrid } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start date (52 weeks ago, aligned to Sunday)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (52 * 7) - today.getDay());

    const grid = [];
    const dateGrid = [];
    const monthLabels = [];
    let totalLogged = 0;
    let lastMonth = -1;

    for (let week = 0; week < WEEKS; week++) {
      const weekData = [];
      const weekDates = [];

      for (let day = 0; day < DAYS; day++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(cellDate.getDate() + week * 7 + day);

        // Skip future dates
        if (cellDate > today) {
          weekData.push(-1); // future
          weekDates.push(null);
          continue;
        }

        const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        weekDates.push(dateStr);

        const data = dayData?.[dateStr];
        let completeness = 0;

        if (data && data.totals) {
          const { calories, protein, carbs, fat } = data.totals;
          // Compute a simple completeness: did user log anything?
          if (calories > 0) {
            completeness = 0.5; // Base: logged something
            // Bonus for hitting multiple goals
            const goalCal = data.goals?.calories || data.totals?.goal || 2000;
            const calRatio = goalCal > 0 ? calories / goalCal : 0;
            if (calRatio >= 0.7 && calRatio <= 1.3) completeness += 0.25;
            if ((protein || 0) > 0 && (carbs || 0) > 0 && (fat || 0) > 0) completeness += 0.25;
            completeness = Math.min(1, completeness);
            totalLogged++;
          }
        }

        weekData.push(completeness);

        // Track month labels
        const cellMonth = cellDate.getMonth();
        if (day === 0 && cellMonth !== lastMonth) {
          monthLabels.push({ week, label: MONTH_NAMES[cellMonth] });
          lastMonth = cellMonth;
        }
      }

      grid.push(weekData);
      dateGrid.push(weekDates);
    }

    return { grid, monthLabels, totalLogged, dateGrid };
  }, [dayData]);

  // Scroll to end on mount so user sees the most recent data
  const handleContentSizeChange = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: false });
    }
  };

  const svgHeight = DAYS * CELL_TOTAL + 20; // extra for month labels
  const svgWidth = GRID_WIDTH;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CalendarDays size={18} color={Colors.primary} />
          <Text style={styles.title}>Activity Heatmap</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Flame size={12} color={Colors.warning} />
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>streak</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{totalLogged}</Text>
            <Text style={styles.statLabel}>days</Text>
          </View>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        {/* Day labels column */}
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((label, i) => (
            <Text key={i} style={styles.dayLabelText}>{label}</Text>
          ))}
        </View>

        {/* Scrollable grid */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={handleContentSizeChange}
          style={styles.scrollView}
        >
          <View>
            {/* Month labels */}
            <View style={styles.monthRow}>
              {monthLabels.map(({ week, label }, i) => (
                <Text
                  key={`month-${i}`}
                  style={[
                    styles.monthLabel,
                    { left: week * CELL_TOTAL },
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>

            {/* SVG Grid */}
            <Svg width={WEEKS * CELL_TOTAL} height={DAYS * CELL_TOTAL}>
              {grid.map((weekData, weekIdx) =>
                weekData.map((completeness, dayIdx) => {
                  if (completeness === -1) return null; // future
                  const level = getLevel(completeness);
                  return (
                    <Rect
                      key={`${weekIdx}-${dayIdx}`}
                      x={weekIdx * CELL_TOTAL}
                      y={dayIdx * CELL_TOTAL}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx={2.5}
                      ry={2.5}
                      fill={LEVEL_COLORS[level]}
                    />
                  );
                })
              )}
            </Svg>
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {LEVEL_COLORS.map((color, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  dayLabels: {
    width: LABEL_WIDTH,
    paddingTop: 16, // offset for month labels
    gap: CELL_GAP,
  },
  dayLabelText: {
    fontSize: 9,
    color: Colors.textTertiary,
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
    textAlign: 'right',
    paddingRight: 4,
  },
  scrollView: {
    flex: 1,
  },
  monthRow: {
    height: 16,
    position: 'relative',
    marginBottom: 0,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    color: Colors.textTertiary,
    top: 0,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: Spacing.md,
  },
  legendLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginHorizontal: 2,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

export default memo(HabitHeatmap);
