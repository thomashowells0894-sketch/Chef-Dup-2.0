import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShoppingCart, Check, Sparkles, ExternalLink, Truck } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { hapticLight } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useMeals } from '../context/MealContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ShoppingItem({ item, isChecked, onToggle }) {
  const handlePress = async () => {
    await hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <Pressable
      style={[styles.itemCard, isChecked && styles.itemCardChecked]}
      onPress={handlePress}
    >
      <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
        {isChecked && <Check size={14} color={Colors.background} strokeWidth={3} />}
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemEmoji}>{item.emoji}</Text>
          <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
            {item.name}
          </Text>
        </View>
        <Text style={[styles.itemMeta, isChecked && styles.itemMetaChecked]}>
          {item.count} serving{item.count > 1 ? 's' : ''} · {item.totalCals} cal
        </Text>
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>×{item.count}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <ShoppingCart size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No groceries needed yet</Text>
      <Text style={styles.emptySubtitle}>
        Plan some meals for tomorrow to see them here!
      </Text>
      <Pressable
        style={styles.planButton}
        onPress={() => router.back()}
      >
        <Sparkles size={18} color={Colors.primary} />
        <Text style={styles.planButtonText}>Start Planning</Text>
      </Pressable>
    </View>
  );
}

export default function ShoppingListScreen() {
  const router = useRouter();
  const { getShoppingList } = useMeals();
  const [checkedItems, setCheckedItems] = useState({});

  const shoppingList = useMemo(() => getShoppingList(), [getShoppingList]);

  const toggleItem = (itemName) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = shoppingList.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const totalCalories = shoppingList.reduce((sum, item) => sum + item.totalCals, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Grocery Run</Text>
          <Text style={styles.headerSubtitle}>Next 7 Days</Text>
        </View>
        <View style={styles.headerRight}>
          <ShoppingCart size={24} color={Colors.primary} />
        </View>
      </View>

      {shoppingList.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Shopping Progress</Text>
              <Text style={styles.progressCount}>
                {checkedCount} of {totalCount} items
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            {checkedCount === totalCount && totalCount > 0 && (
              <Text style={styles.completeText}>All done! Ready to cook!</Text>
            )}
          </View>

          {/* Summary Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCalories.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Cal</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>7</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          </View>

          {/* Shopping List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Shopping List</Text>

            {shoppingList.map((item) => (
              <ShoppingItem
                key={item.name}
                item={item}
                isChecked={checkedItems[item.name] || false}
                onToggle={() => toggleItem(item.name)}
              />
            ))}

            {/* Grocery Delivery */}
            <View style={styles.deliverySection}>
              <View style={styles.deliverySectionHeader}>
                <Truck size={18} color={Colors.primary} />
                <Text style={styles.deliverySectionTitle}>Order Groceries</Text>
              </View>
              <Text style={styles.deliverySectionSubtitle}>
                Get everything delivered to your door
              </Text>
              <View style={styles.deliveryButtons}>
                {[
                  { name: 'Instacart', color: '#43B02A', url: 'https://www.instacart.com/' },
                  { name: 'Amazon Fresh', color: '#FF9900', url: 'https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo' },
                  { name: 'Walmart', color: '#0071CE', url: 'https://www.walmart.com/grocery' },
                  { name: 'Kroger', color: '#0A3D8F', url: 'https://www.kroger.com/' },
                ].map((service) => (
                  <Pressable
                    key={service.name}
                    style={[styles.deliveryButton, { borderColor: service.color + '40' }]}
                    onPress={async () => {
                      await hapticLight();
                      // Build search query from unchecked items
                      const unchecked = shoppingList
                        .filter((item) => !checkedItems[item.name])
                        .map((item) => item.name)
                        .slice(0, 10);
                      const query = encodeURIComponent(unchecked.join(', '));
                      const url = service.name === 'Instacart'
                        ? `https://www.instacart.com/store/search/${query}`
                        : service.url;
                      Linking.openURL(url).catch(() => {});
                    }}
                  >
                    <View style={[styles.deliveryDot, { backgroundColor: service.color }]} />
                    <Text style={styles.deliveryButtonText}>{service.name}</Text>
                    <ExternalLink size={14} color={Colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  progressCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  completeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  itemCardChecked: {
    backgroundColor: Colors.surfaceElevated,
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemEmoji: {
    fontSize: 18,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  itemMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemMetaChecked: {
    color: Colors.textTertiary,
  },
  countBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  bottomSpacer: {
    height: 40,
  },
  deliverySection: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  deliverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  deliverySectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  deliverySectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  deliveryButtons: {
    gap: Spacing.sm,
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deliveryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deliveryButtonText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  planButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
