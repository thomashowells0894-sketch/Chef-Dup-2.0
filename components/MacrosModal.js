import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { hapticLight } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { useFood } from '../context/FoodContext';

const { width } = Dimensions.get('window');
const PIE_SIZE = width * 0.5;
const PIE_RADIUS = PIE_SIZE / 2 - 20;
const PIE_CENTER = PIE_SIZE / 2;

function PieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <View style={styles.emptyPie}>
        <Text style={styles.emptyPieText}>No macros logged yet</Text>
      </View>
    );
  }

  let currentAngle = -90; // Start from top
  const circumference = 2 * Math.PI * PIE_RADIUS;

  return (
    <Svg width={PIE_SIZE} height={PIE_SIZE}>
      <G>
        {data.map((item, index) => {
          const percentage = item.value / total;
          const strokeDasharray = `${percentage * circumference} ${circumference}`;
          const rotation = currentAngle;
          currentAngle += percentage * 360;

          return (
            <Circle
              key={index}
              cx={PIE_CENTER}
              cy={PIE_CENTER}
              r={PIE_RADIUS}
              fill="none"
              stroke={item.color}
              strokeWidth={30}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform={`rotate(${rotation} ${PIE_CENTER} ${PIE_CENTER})`}
            />
          );
        })}
      </G>
    </Svg>
  );
}

function MacroRow({ label, current, goal, color, unit = 'g' }) {
  const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  const remaining = Math.max(goal - current, 0);

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <View style={[styles.macroIndicator, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <View style={styles.macroStats}>
        <Text style={styles.macroCurrent}>
          {current}{unit} <Text style={styles.macroGoal}>/ {goal}{unit}</Text>
        </Text>
        <Text style={[styles.macroPercentage, { color }]}>{percentage}%</Text>
      </View>
      <View style={styles.macroBarContainer}>
        <View style={styles.macroBarTrack}>
          <View
            style={[
              styles.macroBarFill,
              { width: `${Math.min(percentage, 100)}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
      <Text style={styles.macroRemaining}>
        {remaining > 0 ? `${remaining}${unit} remaining` : 'Goal reached!'}
      </Text>
    </View>
  );
}

export default function MacrosModal({ visible, onClose }) {
  const { totals, goals } = useFood();

  const pieData = [
    { label: 'Protein', value: totals.protein, color: Colors.protein },
    { label: 'Carbs', value: totals.carbs, color: Colors.carbs },
    { label: 'Fat', value: totals.fat, color: Colors.fat },
  ];

  const handleClose = async () => {
    await hapticLight();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Macro Breakdown</Text>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.pieContainer}>
            <PieChart data={pieData} />
            <View style={styles.pieCenter}>
              <Text style={styles.totalCalories}>{totals.calories}</Text>
              <Text style={styles.totalLabel}>kcal</Text>
            </View>
          </View>

          <View style={styles.macrosContainer}>
            <MacroRow
              label="Protein"
              current={totals.protein}
              goal={goals.protein}
              color={Colors.protein}
            />
            <MacroRow
              label="Carbohydrates"
              current={totals.carbs}
              goal={goals.carbs}
              color={Colors.carbs}
            />
            <MacroRow
              label="Fat"
              current={totals.fat}
              goal={goals.fat}
              color={Colors.fat}
            />
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Macro Tip</Text>
            <Text style={styles.tipText}>
              Aim for balanced macros each meal. Protein helps build muscle, carbs provide energy, and healthy fats support hormone function.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  totalCalories: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  totalLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  emptyPie: {
    width: PIE_SIZE,
    height: PIE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: PIE_SIZE / 2,
  },
  emptyPieText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  macrosContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  macroRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  macroIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  macroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  macroCurrent: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroGoal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
  },
  macroPercentage: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  macroBarContainer: {
    marginBottom: Spacing.xs,
  },
  macroBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroRemaining: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  tipCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
