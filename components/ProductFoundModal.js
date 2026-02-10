import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Check, X, AlertCircle, Coffee, Sun, Sunset, Moon } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Sun },
  { id: 'dinner', label: 'Dinner', icon: Sunset },
  { id: 'snacks', label: 'Snack', icon: Moon },
];

function MacroCircle({ label, value, unit, color }) {
  return (
    <View style={styles.macroCircle}>
      <View style={[styles.macroRing, { borderColor: color }]}>
        <Text style={styles.macroValue}>{value}</Text>
        <Text style={styles.macroUnit}>{unit}</Text>
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

export default function ProductFoundModal({
  visible,
  product,
  onClose,
  onConfirm,
  loading,
  error,
  defaultMeal = 'snacks',
}) {
  const [selectedMeal, setSelectedMeal] = useState(defaultMeal);

  // Update selected meal when defaultMeal changes
  useEffect(() => {
    if (defaultMeal) {
      setSelectedMeal(defaultMeal);
    }
  }, [defaultMeal]);

  const handleConfirm = () => {
    onConfirm(selectedMeal);
  };

  // Error state
  if (error) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.container}>
            <View style={styles.errorIcon}>
              <AlertCircle size={48} color={Colors.danger} />
            </View>
            <Text style={styles.errorTitle}>Product Not Found</Text>
            <Text style={styles.errorText}>
              {error || "We couldn't find this product in our database. Try scanning again or add it manually."}
            </Text>
            <Pressable style={styles.closeErrorButton} onPress={onClose}>
              <Text style={styles.closeErrorButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // No product yet
  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.successBadge}>
              <Check size={16} color={Colors.background} />
            </View>
            <Text style={styles.successText}>Product Found!</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            {product.image && (
              <Image source={{ uri: product.image }} style={styles.productImage} />
            )}
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            {product.brand && (
              <Text style={styles.productBrand}>{product.brand}</Text>
            )}
            {product.serving && (
              <Text style={styles.productServing}>Per {product.serving}</Text>
            )}
          </View>

          {/* Nutrition */}
          <View style={styles.nutritionContainer}>
            <View style={styles.caloriesBox}>
              <Text style={styles.caloriesValue}>{product.calories}</Text>
              <Text style={styles.caloriesLabel}>calories</Text>
            </View>
            <View style={styles.macrosRow}>
              <MacroCircle
                label="Protein"
                value={product.protein}
                unit="g"
                color={Colors.protein}
              />
              <MacroCircle
                label="Carbs"
                value={product.carbs}
                unit="g"
                color={Colors.carbs}
              />
              <MacroCircle
                label="Fat"
                value={product.fat}
                unit="g"
                color={Colors.fat}
              />
            </View>
          </View>

          {/* Meal Selector */}
          <Text style={styles.mealSelectorLabel}>Add to</Text>
          <View style={styles.mealSelector}>
            {mealTypes.map((meal) => {
              const Icon = meal.icon;
              const isSelected = selectedMeal === meal.id;
              return (
                <Pressable
                  key={meal.id}
                  style={[
                    styles.mealButton,
                    isSelected && styles.mealButtonActive,
                  ]}
                  onPress={() => setSelectedMeal(meal.id)}
                >
                  <Icon
                    size={18}
                    color={isSelected ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.mealButtonText,
                      isSelected && styles.mealButtonTextActive,
                    ]}
                  >
                    {meal.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Check size={20} color={Colors.background} />
              <Text style={styles.confirmButtonText}>Add to Log</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  successText: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    marginBottom: Spacing.sm,
  },
  productName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  productBrand: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  productServing: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  nutritionContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  caloriesBox: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  caloriesLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroCircle: {
    alignItems: 'center',
  },
  macroRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  macroValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  macroLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  mealSelectorLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  mealSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  mealButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  mealButtonActive: {
    backgroundColor: Colors.surface,
  },
  mealButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  mealButtonTextActive: {
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  // Error state
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    alignSelf: 'center',
  },
  errorTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  closeErrorButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignSelf: 'center',
  },
  closeErrorButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
});
