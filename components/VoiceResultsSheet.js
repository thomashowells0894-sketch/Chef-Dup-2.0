import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import {
  X,
  Mic,
  Plus,
  Check,
  Zap,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticSuccess, hapticLight } from '../lib/haptics';

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snacks', label: 'Snack' },
];

// Voice Results Sheet
function VoiceResultsSheet({ visible, transcript, foods, selectedMeal, onAddFood, onAddAll, onClose, addedIndices }) {
  if (!visible) return null;

  const mealLabel = mealTypes.find(m => m.id === selectedMeal)?.label || 'Meal';
  const remainingFoods = foods.filter((_, i) => !addedIndices.has(i));
  const remainingCalories = remainingFoods.reduce((sum, f) => sum + (f.calories || 0), 0);
  const remainingProtein = remainingFoods.reduce((sum, f) => sum + (f.protein || 0), 0);
  const allAdded = foods.length > 0 && remainingFoods.length === 0;

  const handleQuickAddAll = useCallback(() => {
    hapticSuccess();
    onAddAll?.();
  }, [onAddAll]);

  const handleAddSingle = useCallback((food, meal, idx) => {
    hapticLight();
    onAddFood?.(food, meal, idx);
  }, [onAddFood]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.voiceResultsOverlay}>
        <View style={styles.voiceResultsCard}>
          <View style={styles.voiceResultsHandle} />

          <View style={styles.voiceResultsHeader}>
            <Text style={styles.voiceResultsTitle}>Voice Results</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {transcript ? (
            <View style={styles.voiceTranscriptBox}>
              <Mic size={14} color={Colors.textSecondary} />
              <Text style={styles.voiceTranscriptText}>"{transcript}"</Text>
            </View>
          ) : null}

          {foods.length === 0 ? (
            <View style={styles.voiceNoFoods}>
              <Text style={styles.voiceNoFoodsText}>
                No foods detected. Try speaking more clearly.
              </Text>
            </View>
          ) : (
            <>
              {/* Quick Add All button -- prominent, always visible when items remain */}
              {remainingFoods.length > 0 && (
                <Pressable
                  style={styles.voiceQuickAddAllBtn}
                  onPress={handleQuickAddAll}
                  accessibilityRole="button"
                  accessibilityLabel={`Quick add all ${remainingFoods.length} items to ${mealLabel}, ${remainingCalories} calories total`}
                >
                  <View style={styles.voiceQuickAddAllIcon}>
                    <Zap size={20} color={Colors.background} fill={Colors.background} />
                  </View>
                  <View style={styles.voiceQuickAddAllInfo}>
                    <Text style={styles.voiceQuickAddAllTitle}>
                      Quick Add All {remainingFoods.length} Item{remainingFoods.length !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.voiceQuickAddAllSub}>
                      {remainingCalories} kcal {'\u00B7'} {remainingProtein}g protein {'\u2192'} {mealLabel}
                    </Text>
                  </View>
                  <Plus size={20} color={Colors.background} />
                </Pressable>
              )}

              {/* All added confirmation */}
              {allAdded && (
                <View style={styles.voiceAllAddedBanner}>
                  <Check size={18} color={Colors.success} />
                  <Text style={styles.voiceAllAddedText}>All items added to {mealLabel}!</Text>
                </View>
              )}

              <ScrollView style={styles.voiceFoodsList} showsVerticalScrollIndicator={false}>
                {foods.map((food, idx) => {
                  const isAdded = addedIndices.has(idx);
                  return (
                    <View key={idx} style={[styles.voiceFoodCard, isAdded && styles.voiceFoodCardAdded]}>
                      <Text style={styles.voiceFoodEmoji}>{food.emoji || '\uD83C\uDF7D\uFE0F'}</Text>
                      <View style={styles.voiceFoodInfo}>
                        <Text style={styles.voiceFoodName}>{food.name}</Text>
                        <Text style={styles.voiceFoodMacros}>
                          {food.calories} kcal {'\u00B7'} P{food.protein}g {'\u00B7'} C{food.carbs}g {'\u00B7'} F{food.fat}g
                        </Text>
                        <Text style={styles.voiceFoodServing}>{food.serving}</Text>
                      </View>
                      <Pressable
                        style={[styles.voiceFoodAddBtn, isAdded && styles.voiceFoodAddedBtn]}
                        onPress={() => !isAdded && handleAddSingle(food, selectedMeal, idx)}
                        disabled={isAdded}
                      >
                        {isAdded ? (
                          <>
                            <Check size={16} color={Colors.primary} />
                            <Text style={[styles.voiceFoodAddText, { color: Colors.primary }]}>Added</Text>
                          </>
                        ) : (
                          <>
                            <Plus size={16} color={Colors.background} />
                            <Text style={styles.voiceFoodAddText}>Add</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voiceResultsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  voiceResultsCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
  },
  voiceResultsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  voiceResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  voiceResultsTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  voiceTranscriptBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  voiceTranscriptText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  voiceQuickAddAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  voiceQuickAddAllIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceQuickAddAllInfo: {
    flex: 1,
  },
  voiceQuickAddAllTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  voiceQuickAddAllSub: {
    fontSize: FontSize.xs,
    color: Colors.background,
    opacity: 0.8,
    marginTop: 1,
  },
  voiceAllAddedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  voiceAllAddedText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  voiceNoFoods: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  voiceNoFoodsText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  voiceFoodsList: {
    flexGrow: 0,
  },
  voiceFoodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  voiceFoodCardAdded: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  voiceFoodEmoji: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  voiceFoodInfo: {
    flex: 1,
  },
  voiceFoodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  voiceFoodMacros: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  voiceFoodServing: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  voiceFoodAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  voiceFoodAddedBtn: {
    backgroundColor: Colors.primary + '20',
  },
  voiceFoodAddText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
});

export default VoiceResultsSheet;
