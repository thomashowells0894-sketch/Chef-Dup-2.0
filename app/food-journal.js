import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Camera,
  X,
  Trash2,
  CalendarDays,
  Clock,
  MessageSquare,
  Flame,
  ChevronRight,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticImpact } from '../lib/haptics';
import { useFoodPhotos } from '../hooks/useFoodPhotos';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = Spacing.xs;
const GRID_PADDING = Spacing.md;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

// Meal type config
const MEAL_TYPES = {
  breakfast: { label: 'B', color: '#FF9500', fullLabel: 'Breakfast' },
  lunch: { label: 'L', color: '#34C759', fullLabel: 'Lunch' },
  dinner: { label: 'D', color: '#5856D6', fullLabel: 'Dinner' },
  snack: { label: 'S', color: '#FF2D55', fullLabel: 'Snack' },
};

// Helper: format date to YYYY-MM-DD
function toDateString(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Helper: format date for display
function formatDisplayDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper: format time for display
function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Helper: get day label
function getDayLabel(dateStr) {
  const today = toDateString(new Date());
  const yesterday = toDateString(
    new Date(Date.now() - 86400000)
  );
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Helper: generate last 7 days
function getLast7Days() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateString(d));
  }
  return days;
}

// Helper: get days in a month
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// ============================================================
// DatePill component
// ============================================================
const DatePill = React.memo(function DatePill({ dateStr, isActive, photoCount, onPress }) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = d.getDate();

  return (
    <Pressable
      style={[styles.datePill, isActive && styles.datePillActive]}
      onPress={onPress}
    >
      <Text style={[styles.datePillDay, isActive && styles.datePillDayActive]}>{dayName}</Text>
      <Text style={[styles.datePillNum, isActive && styles.datePillNumActive]}>{dayNum}</Text>
      {photoCount > 0 && (
        <View style={[styles.datePillDot, isActive && styles.datePillDotActive]} />
      )}
    </Pressable>
  );
});

// ============================================================
// PhotoCell component for the grid
// ============================================================
const PhotoCell = React.memo(function PhotoCell({ photo, index, onPress }) {
  const meal = MEAL_TYPES[photo.mealType] || MEAL_TYPES.snack;

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(60 + Math.floor(index / 2) * 80)
        .springify()
        .mass(0.5)
        .damping(10)}
    >
      <Pressable style={styles.photoCell} onPress={() => onPress(photo)}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.photoCellImage}
          contentFit="cover"
          transition={200}
        />
        {/* Meal type badge */}
        <View style={[styles.mealBadge, { backgroundColor: meal.color }]}>
          <Text style={styles.mealBadgeText}>{meal.label}</Text>
        </View>
        {/* Calorie badge */}
        <View style={styles.calorieBadge}>
          <Flame size={10} color={Colors.secondary} />
          <Text style={styles.calorieBadgeText}>{photo.calories}</Text>
        </View>
        {/* Bottom overlay with food name */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.photoCellOverlay}
        >
          <Text style={styles.photoCellName} numberOfLines={1}>
            {photo.foodName}
          </Text>
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
});

// ============================================================
// MacroBar for detail modal
// ============================================================
function MacroBarDisplay({ label, value, color, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <Text style={[styles.macroBarLabel, { color }]}>{label}</Text>
        <Text style={[styles.macroBarValue, { color }]}>{value}g</Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View
          style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

// ============================================================
// MonthlyCalendar component
// ============================================================
const MonthlyCalendar = React.memo(function MonthlyCalendar({ photos }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build a map of date -> first photo URI
  const photoMap = useMemo(() => {
    const map = {};
    photos.forEach((p) => {
      const d = p.date;
      if (d && d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
        if (!map[d]) {
          map[d] = p.uri;
        }
      }
    });
    return map;
  }, [photos, year, month]);

  const cells = [];
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
  }
  // Add day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const photoUri = photoMap[dateStr];
    const isToday = day === now.getDate();

    cells.push(
      <View key={dateStr} style={[styles.calendarCell, isToday && styles.calendarCellToday]}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.calendarCellImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.calendarCellEmpty} />
        )}
        <Text style={[styles.calendarCellDay, isToday && styles.calendarCellDayToday]}>
          {day}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.monthlySection}>
      <Text style={styles.monthlySectionTitle}>Monthly Overview</Text>
      <Text style={styles.monthlySubtitle}>{monthName}</Text>
      <View style={styles.calendarWeekHeaders}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.calendarWeekDay}>{d}</Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>{cells}</View>
    </View>
  );
});

// ============================================================
// Main Screen
// ============================================================
export default function FoodJournalScreen() {
  const router = useRouter();
  const {
    photos,
    isLoading,
    deletePhoto,
    getPhotosByDate,
    getPhotoCount,
  } = useFoodPhotos();

  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [detailPhoto, setDetailPhoto] = useState(null);
  const [showAllDates, setShowAllDates] = useState(false);

  const last7Days = useMemo(() => getLast7Days(), []);
  const photoCount = getPhotoCount();

  // Build a map of date -> count for dot indicators
  const dateCountMap = useMemo(() => {
    const map = {};
    photos.forEach((p) => {
      if (p.date) {
        map[p.date] = (map[p.date] || 0) + 1;
      }
    });
    return map;
  }, [photos]);

  // Filtered photos for the selected date, or all if showAllDates
  const filteredPhotos = useMemo(() => {
    if (showAllDates) {
      return photos;
    }
    return getPhotosByDate(selectedDate);
  }, [photos, selectedDate, showAllDates, getPhotosByDate]);

  const handleDateSelect = useCallback(
    (dateStr) => {
      hapticLight();
      setSelectedDate(dateStr);
      setShowAllDates(false);
    },
    []
  );

  const handleShowAll = useCallback(() => {
    hapticLight();
    setShowAllDates(true);
  }, []);

  const handleOpenDetail = useCallback((photo) => {
    hapticLight();
    setDetailPhoto(photo);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailPhoto(null);
  }, []);

  const handleDeletePhoto = useCallback(
    (id) => {
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to remove this food photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await hapticImpact();
              await deletePhoto(id);
              setDetailPhoto(null);
            },
          },
        ]
      );
    },
    [deletePhoto]
  );

  const handleOpenCamera = useCallback(async () => {
    await hapticLight();
    router.push('/scan-food');
  }, [router]);

  // Render a single grid cell
  const renderPhotoCell = useCallback(
    ({ item, index }) => (
      <PhotoCell photo={item} index={index} onPress={handleOpenDetail} />
    ),
    [handleOpenDetail]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  // Header for the FlatList
  const ListHeader = useMemo(
    () => (
      <View>
        {/* Date Filter Pills */}
        <ReAnimated.View
          entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
            contentContainerStyle={styles.dateScrollContent}
          >
            {/* All dates pill */}
            <Pressable
              style={[styles.datePill, showAllDates && styles.datePillActive]}
              onPress={handleShowAll}
            >
              <CalendarDays size={14} color={showAllDates ? Colors.background : Colors.textSecondary} />
              <Text style={[styles.datePillNum, showAllDates && styles.datePillNumActive, { fontSize: FontSize.xs }]}>
                All
              </Text>
            </Pressable>
            {last7Days.map((dateStr) => (
              <DatePill
                key={dateStr}
                dateStr={dateStr}
                isActive={!showAllDates && selectedDate === dateStr}
                photoCount={dateCountMap[dateStr] || 0}
                onPress={() => handleDateSelect(dateStr)}
              />
            ))}
          </ScrollView>
        </ReAnimated.View>

        {/* Date label */}
        <ReAnimated.View
          entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}
          style={styles.dateLabel}
        >
          <Text style={styles.dateLabelText}>
            {showAllDates
              ? `All Photos (${filteredPhotos.length})`
              : `${getDayLabel(selectedDate)} (${filteredPhotos.length})`}
          </Text>
        </ReAnimated.View>
      </View>
    ),
    [
      last7Days,
      selectedDate,
      showAllDates,
      dateCountMap,
      filteredPhotos.length,
      handleDateSelect,
      handleShowAll,
    ]
  );

  // Footer with monthly calendar
  const ListFooter = useMemo(
    () => (
      <View>
        {photos.length > 0 && <MonthlyCalendar photos={photos} />}
        <View style={styles.bottomSpacer} />
      </View>
    ),
    [photos]
  );

  // Empty state
  const EmptyComponent = useMemo(
    () => (
      <ReAnimated.View
        entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}
        style={styles.emptyState}
      >
        <View style={styles.emptyIcon}>
          <Camera size={48} color={Colors.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>
          {showAllDates ? 'Your food journal is empty' : 'No photos for this day'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {showAllDates
            ? 'Snap your first meal!'
            : 'Use the food scanner to capture your meals'}
        </Text>
        <Pressable style={styles.emptyButton} onPress={handleOpenCamera}>
          <Camera size={18} color={Colors.background} />
          <Text style={styles.emptyButtonText}>Scan Food</Text>
        </Pressable>
      </ReAnimated.View>
    ),
    [showAllDates, handleOpenCamera]
  );

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading food journal...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View
        entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
        style={styles.header}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Food Journal</Text>
          {photoCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{photoCount}</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.cameraButton} onPress={handleOpenCamera}>
          <Camera size={20} color={Colors.background} />
        </Pressable>
      </ReAnimated.View>

      {/* Photo Grid */}
      <FlatList
        data={filteredPhotos}
        renderItem={renderPhotoCell}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={EmptyComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />

      {/* Photo Detail Modal */}
      <Modal
        visible={!!detailPhoto}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDetail}
      >
        {detailPhoto && (
          <View style={styles.detailOverlay}>
            {/* Full size image */}
            <Image
              source={{ uri: detailPhoto.uri }}
              style={styles.detailImage}
              contentFit="cover"
              transition={300}
            />

            {/* Close button */}
            <Pressable style={styles.detailCloseBtn} onPress={handleCloseDetail}>
              <X size={22} color={Colors.text} />
            </Pressable>

            {/* Bottom info panel */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
              style={styles.detailInfoGradient}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Food name */}
                <Text style={styles.detailFoodName}>{detailPhoto.foodName}</Text>

                {/* Meal type + date/time */}
                <View style={styles.detailMetaRow}>
                  <View
                    style={[
                      styles.detailMealBadge,
                      {
                        backgroundColor:
                          (MEAL_TYPES[detailPhoto.mealType] || MEAL_TYPES.snack).color +
                          '30',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailMealBadgeText,
                        {
                          color: (MEAL_TYPES[detailPhoto.mealType] || MEAL_TYPES.snack)
                            .color,
                        },
                      ]}
                    >
                      {(MEAL_TYPES[detailPhoto.mealType] || MEAL_TYPES.snack).fullLabel}
                    </Text>
                  </View>
                  <View style={styles.detailDateRow}>
                    <CalendarDays size={13} color={Colors.textSecondary} />
                    <Text style={styles.detailDateText}>
                      {formatDisplayDate(detailPhoto.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.detailDateRow}>
                    <Clock size={13} color={Colors.textSecondary} />
                    <Text style={styles.detailDateText}>
                      {formatTime(detailPhoto.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Calories hero */}
                <View style={styles.detailCaloriesRow}>
                  <Flame size={20} color={Colors.secondary} />
                  <Text style={styles.detailCaloriesValue}>
                    {detailPhoto.calories}
                  </Text>
                  <Text style={styles.detailCaloriesUnit}>kcal</Text>
                </View>

                {/* Macro bars */}
                <View style={styles.detailMacros}>
                  <MacroBarDisplay
                    label="Protein"
                    value={detailPhoto.protein}
                    color={Colors.protein}
                    max={Math.max(detailPhoto.protein, detailPhoto.carbs, detailPhoto.fat, 1)}
                  />
                  <MacroBarDisplay
                    label="Carbs"
                    value={detailPhoto.carbs}
                    color={Colors.carbs}
                    max={Math.max(detailPhoto.protein, detailPhoto.carbs, detailPhoto.fat, 1)}
                  />
                  <MacroBarDisplay
                    label="Fat"
                    value={detailPhoto.fat}
                    color={Colors.fat}
                    max={Math.max(detailPhoto.protein, detailPhoto.carbs, detailPhoto.fat, 1)}
                  />
                </View>

                {/* Notes */}
                {detailPhoto.notes ? (
                  <View style={styles.detailNotesSection}>
                    <View style={styles.detailNotesHeader}>
                      <MessageSquare size={14} color={Colors.textSecondary} />
                      <Text style={styles.detailNotesLabel}>Notes</Text>
                    </View>
                    <Text style={styles.detailNotesText}>{detailPhoto.notes}</Text>
                  </View>
                ) : null}

                {/* Delete button */}
                <Pressable
                  style={styles.detailDeleteBtn}
                  onPress={() => handleDeletePhoto(detailPhoto.id)}
                >
                  <Trash2 size={18} color={Colors.error} />
                  <Text style={styles.detailDeleteText}>Delete Photo</Text>
                </Pressable>
              </ScrollView>
            </LinearGradient>
          </View>
        )}
      </Modal>
    </ScreenWrapper>
  );
}

// ============================================================
// Styles
// ============================================================
const CALENDAR_CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - Spacing.xs * 6) / 7;

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glowSecondary,
  },

  // Date scroll
  dateScroll: {
    marginTop: Spacing.sm,
  },
  dateScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  datePill: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 52,
  },
  datePillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  datePillDay: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  datePillDayActive: {
    color: Colors.text,
  },
  datePillNum: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  datePillNumActive: {
    color: Colors.text,
  },
  datePillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
    marginTop: 3,
  },
  datePillDotActive: {
    backgroundColor: Colors.text,
  },

  // Date label
  dateLabel: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dateLabelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  // Grid
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: Spacing.lg,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // Photo cell
  photoCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  photoCellImage: {
    width: '100%',
    height: '100%',
  },
  mealBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  calorieBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  calorieBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  photoCellOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  photoCellName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.glowSecondary,
  },
  emptyButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // Monthly calendar section
  monthlySection: {
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  monthlySectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  monthlySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  calendarWeekHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  calendarWeekDay: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    width: CALENDAR_CELL_SIZE,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  calendarCell: {
    width: CALENDAR_CELL_SIZE,
    height: CALENDAR_CELL_SIZE,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  calendarCellImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xs,
  },
  calendarCellEmpty: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xs,
  },
  calendarCellDay: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    zIndex: 1,
  },
  calendarCellDayToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 100,
  },

  // ========== Detail Modal ==========
  detailOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  detailImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 56,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailInfoGradient: {
    flex: 1,
    marginTop: -40,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  detailFoodName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailMealBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  detailMealBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailDateText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  detailCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailCaloriesValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.heavy,
    color: Colors.text,
  },
  detailCaloriesUnit: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },

  // Macro bars
  detailMacros: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  macroBarContainer: {
    gap: Spacing.xs,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBarLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  macroBarValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  macroBarTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Notes section
  detailNotesSection: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  detailNotesLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  detailNotesText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },

  // Delete button
  detailDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorSoft,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  detailDeleteText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },
});
