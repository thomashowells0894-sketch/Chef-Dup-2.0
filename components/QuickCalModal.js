import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../constants/theme';
import { hapticSuccess, hapticLight } from '../lib/haptics';

const mealPills = [
  { id: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { id: 'lunch', label: 'Lunch', emoji: '🌤️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  { id: 'snacks', label: 'Snack', emoji: '🍿' },
];

function getDefaultMealType() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 20) return 'dinner';
  return 'snacks';
}

export default function QuickCalModal({ visible, onClose, onLog, initialMealType }) {
  const [calories, setCalories] = useState('');
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState(initialMealType || getDefaultMealType());
  const [logged, setLogged] = useState(false);
  const inputRef = useRef(null);
  const dismissTimer = useRef(null);

  useEffect(() => {
    if (visible) {
      setCalories('');
      setName('');
      setLogged(false);
      setMealType(initialMealType || getDefaultMealType());
      // Auto-focus with slight delay for modal animation
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [visible, initialMealType]);

  const handleLog = useCallback(async () => {
    const cal = parseInt(calories, 10);
    if (!cal || cal <= 0) return;

    const food = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name.trim() || 'Quick entry',
      emoji: '⚡',
      calories: cal,
      protein: 0,
      carbs: 0,
      fat: 0,
      serving: `${cal} kcal`,
    };

    onLog(food, mealType);
    await hapticSuccess();
    setLogged(true);

    // Auto-dismiss after 800ms
    dismissTimer.current = setTimeout(() => {
      setCalories('');
      setName('');
      setLogged(false);
    }, 800);
  }, [calories, name, mealType, onLog]);

  const handleMealSelect = useCallback(async (id) => {
    await hapticLight();
    setMealType(id);
  }, []);

  const canLog = parseInt(calories, 10) > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ReAnimated.View entering={FadeInDown.springify().damping(14)} style={styles.sheet} accessibilityViewIsModal={true} accessibilityLabel="Quick calorie entry">
          {/* Handle */}
          <View style={styles.handleBar} />

          {/* Close */}
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <X size={20} color={Colors.textSecondary} />
          </Pressable>

          {/* Title */}
          <Text style={styles.title}>Quick Cal</Text>

          {/* Large Calorie Input */}
          <TextInput
            ref={inputRef}
            style={styles.calorieInput}
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            maxLength={5}
            selectTextOnFocus
          />
          <Text style={styles.kcalLabel}>kcal</Text>

          {/* Optional Name Input */}
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="⚡ Quick entry"
            placeholderTextColor={Colors.textTertiary}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          {/* Meal Type Pills */}
          <View style={styles.pillRow}>
            {mealPills.map((meal) => (
              <Pressable
                key={meal.id}
                style={[styles.pill, mealType === meal.id && styles.pillActive]}
                onPress={() => handleMealSelect(meal.id)}
              >
                <Text style={styles.pillEmoji}>{meal.emoji}</Text>
                <Text style={[styles.pillLabel, mealType === meal.id && styles.pillLabelActive]}>
                  {meal.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Log Button */}
          <Pressable
            onPress={handleLog}
            disabled={!canLog || logged}
            style={({ pressed }) => [styles.logButton, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={logged ? [Colors.success, Colors.successDim] : canLog ? Gradients.primary : [Colors.surfaceElevated, Colors.surfaceElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logButtonGradient}
            >
              <Text style={[styles.logButtonText, !canLog && !logged && { color: Colors.textTertiary }]}>
                {logged ? 'Logged!' : 'Log'}
              </Text>
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  calorieInput: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black,
    color: Colors.text,
    textAlign: 'center',
    minWidth: 160,
    paddingVertical: Spacing.sm,
  },
  kcalLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.md,
  },
  nameInput: {
    width: '100%',
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary + '40',
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  pillLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  logButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  logButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  logButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});
