import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  X,
  Search,
  Zap,
  Clock,
  TrendingUp,
  Trash2,
  Coffee,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react-native';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { useFrequentFoods } from '../hooks/useFrequentFoods';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

const mealMeta = {
  breakfast: { label: 'Breakfast', icon: Coffee, color: Colors.warning },
  lunch: { label: 'Lunch', icon: Sun, color: Colors.primary },
  dinner: { label: 'Dinner', icon: Sunset, color: Colors.secondary },
  snacks: { label: 'Snacks', icon: Moon, color: Colors.accentPurple || '#BF5AF2' },
};

// ---------- Macro Mini Bar ----------
const MacroMiniBar = memo(function MacroMiniBar({ protein, carbs, fat }) {
  const total = (protein || 0) + (carbs || 0) + (fat || 0);
  if (total === 0) return null;
  const pPct = ((protein || 0) / total) * 100;
  const cPct = ((carbs || 0) / total) * 100;
  const fPct = ((fat || 0) / total) * 100;

  return (
    <View style={macroStyles.container}>
      <View style={macroStyles.bar}>
        <View style={[macroStyles.segment, { width: `${pPct}%`, backgroundColor: Colors.protein }]} />
        <View style={[macroStyles.segment, { width: `${cPct}%`, backgroundColor: Colors.carbs }]} />
        <View style={[macroStyles.segment, { width: `${fPct}%`, backgroundColor: Colors.fat }]} />
      </View>
      <View style={macroStyles.labels}>
        <Text style={[macroStyles.label, { color: Colors.protein }]}>P{protein}g</Text>
        <Text style={macroStyles.dot}>.</Text>
        <Text style={[macroStyles.label, { color: Colors.carbs }]}>C{carbs}g</Text>
        <Text style={macroStyles.dot}>.</Text>
        <Text style={[macroStyles.label, { color: Colors.fat }]}>F{fat}g</Text>
      </View>
    </View>
  );
});

const macroStyles = StyleSheet.create({
  container: { marginTop: 4 },
  bar: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    marginBottom: 3,
  },
  segment: { height: '100%' },
  labels: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 10, fontWeight: FontWeight.medium },
  dot: { fontSize: 10, color: Colors.textTertiary, marginHorizontal: 2 },
});

// ---------- Quick Food Item ----------
const QuickFoodItem = memo(function QuickFoodItem({ item, onLog, onRemove, index }) {
  const handleLog = useCallback(async () => {
    await hapticSuccess();
    onLog(item);
  }, [item, onLog]);

  const handleLongPress = useCallback(() => {
    Alert.alert(
      item.name,
      `${item.emoji || '?'}  ${item.calories} kcal\n` +
        `Protein: ${item.protein}g | Carbs: ${item.carbs}g | Fat: ${item.fat}g\n` +
        `Serving: ${item.serving || '1 serving'}\n` +
        `Logged ${item.count || 1} time${(item.count || 1) !== 1 ? 's' : ''}`,
      [
        {
          text: 'Remove from Frequent',
          style: 'destructive',
          onPress: () => onRemove(item.id),
        },
        { text: 'OK' },
      ]
    );
  }, [item, onRemove]);

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 40).springify().mass(0.5).damping(12)}>
      <Pressable
        style={styles.foodItem}
        onPress={handleLog}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <View style={styles.foodItemEmoji}>
          <Text style={styles.foodItemEmojiText}>{item.emoji || '?'}</Text>
        </View>
        <View style={styles.foodItemInfo}>
          <Text style={styles.foodItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <MacroMiniBar protein={item.protein} carbs={item.carbs} fat={item.fat} />
        </View>
        <View style={styles.foodItemRight}>
          <View style={styles.caloriesBadge}>
            <Text style={styles.caloriesBadgeText}>{item.calories}</Text>
            <Text style={styles.caloriesUnitText}>kcal</Text>
          </View>
          {(item.count || 0) > 1 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{item.count}x</Text>
            </View>
          )}
        </View>
      </Pressable>
    </ReAnimated.View>
  );
});

// ---------- Tab Pills ----------
const TabPills = memo(function TabPills({ active, onTabChange }) {
  return (
    <View style={styles.tabContainer}>
      <Pressable
        style={[styles.tabPill, active === 'frequent' && styles.tabPillActive]}
        onPress={() => onTabChange('frequent')}
      >
        <TrendingUp
          size={14}
          color={active === 'frequent' ? Colors.background : Colors.textSecondary}
        />
        <Text
          style={[styles.tabPillText, active === 'frequent' && styles.tabPillTextActive]}
        >
          Frequent
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tabPill, active === 'recent' && styles.tabPillActive]}
        onPress={() => onTabChange('recent')}
      >
        <Clock
          size={14}
          color={active === 'recent' ? Colors.background : Colors.textSecondary}
        />
        <Text
          style={[styles.tabPillText, active === 'recent' && styles.tabPillTextActive]}
        >
          Recent
        </Text>
      </Pressable>
    </View>
  );
});

// ---------- Empty State ----------
const EmptyState = memo(function EmptyState() {
  return (
    <ReAnimated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyContainer}>
      <Zap size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No frequent foods yet</Text>
      <Text style={styles.emptySubtitle}>
        Log some foods first{'\n'}your favorites will appear here
      </Text>
    </ReAnimated.View>
  );
});

// ---------- Toast Notification ----------
function ToastNotification({ visible, foodName }) {
  if (!visible) return null;
  return (
    <ReAnimated.View entering={FadeInUp.springify().mass(0.4).damping(12)} style={styles.toast}>
      <Text style={styles.toastText}>Added {foodName}</Text>
    </ReAnimated.View>
  );
}

// =============================================
// QuickLogSheet Component
// =============================================
export default function QuickLogSheet({ visible, onClose, mealType = 'snacks', onLog }) {
  const { getTopFoods, getRecentFoods, removeFood, frequentFoods } = useFrequentFoods();
  const [activeTab, setActiveTab] = useState('frequent');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFood, setToastFood] = useState('');

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setActiveTab('frequent');
    }
  }, [visible]);

  const meal = mealMeta[mealType] || mealMeta.snacks;
  const MealIcon = meal.icon;

  // Get data based on active tab
  const tabFoods = useMemo(() => {
    if (activeTab === 'frequent') return getTopFoods(50);
    return getRecentFoods(50);
  }, [activeTab, getTopFoods, getRecentFoods]);

  // Apply search filter
  const filteredFoods = useMemo(() => {
    if (!searchQuery.trim()) return tabFoods;
    const query = searchQuery.toLowerCase().trim();
    return tabFoods.filter((f) => f.name.toLowerCase().includes(query));
  }, [tabFoods, searchQuery]);

  // Handle tapping a food to log it
  const handleLog = useCallback(
    (food) => {
      if (onLog) {
        onLog(food, mealType);
      }
      // Show toast
      setToastFood(food.name);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 1500);
    },
    [onLog, mealType]
  );

  // Handle removing a food from the frequent list
  const handleRemove = useCallback(
    async (id) => {
      await hapticLight();
      removeFood(id);
    },
    [removeFood]
  );

  const handleTabChange = useCallback(async (tab) => {
    await hapticLight();
    setActiveTab(tab);
  }, []);

  const handleClose = useCallback(async () => {
    await hapticLight();
    onClose();
  }, [onClose]);

  // FlatList callbacks
  const renderItem = useCallback(
    ({ item, index }) => (
      <QuickFoodItem
        item={item}
        onLog={handleLog}
        onRemove={handleRemove}
        index={index}
      />
    ),
    [handleLog, handleRemove]
  );

  const keyExtractor = useCallback((item) => item.id || item.name, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheetOuter} onPress={(e) => e.stopPropagation()}>
          <ReAnimated.View entering={FadeInUp.springify().mass(0.5).damping(14)}>
            <LinearGradient
              colors={['rgba(30, 30, 36, 0.98)', 'rgba(22, 22, 26, 0.99)']}
              style={styles.sheet}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Zap size={22} color={Colors.primary} />
                  <Text style={styles.headerTitle}>Quick Add</Text>
                  <View style={[styles.mealBadge, { backgroundColor: meal.color + '20' }]}>
                    <MealIcon size={12} color={meal.color} />
                    <Text style={[styles.mealBadgeText, { color: meal.color }]}>
                      {meal.label}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.closeButton} onPress={handleClose}>
                  <X size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={18} color={Colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search frequent foods..."
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <X size={16} color={Colors.textTertiary} />
                  </Pressable>
                )}
              </View>

              {/* Tab Pills */}
              <TabPills active={activeTab} onTabChange={handleTabChange} />

              {/* Food List */}
              {filteredFoods.length === 0 ? (
                <EmptyState />
              ) : (
                <FlatList
                  data={filteredFoods}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={10}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  removeClippedSubviews={true}
                />
              )}

              {/* Toast */}
              <ToastNotification visible={toastVisible} foodName={toastFood} />
            </LinearGradient>
          </ReAnimated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// =============================================
// Styles
// =============================================
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetOuter: {
    maxHeight: SHEET_HEIGHT,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingBottom: Spacing.xxl,
    minHeight: SHEET_HEIGHT * 0.6,
    maxHeight: SHEET_HEIGHT,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  mealBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    height: '100%',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
  },
  tabPillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  tabPillTextActive: {
    color: Colors.background,
  },

  // Food list
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Food item
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  foodItemEmoji: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodItemEmojiText: {
    fontSize: 22,
  },
  foodItemInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  foodItemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  foodItemRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  caloriesBadgeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  caloriesUnitText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  countBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: Spacing.xxl + 10,
    alignSelf: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    ...Shadows.glowSuccess,
  },
  toastText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});
