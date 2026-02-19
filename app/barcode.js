import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Animated,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Zap, ZapOff, ScanBarcode, Search, Users, Flame, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../constants/theme';
import { useFood } from '../context/FoodContext';
import { hapticSuccess, hapticWarning, hapticLight } from '../lib/haptics';
import { lookupBarcode, submitBarcodeData } from '../services/barcodeService';
import { setCachedBarcode } from '../lib/barcodeCache';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_RECT_W = SCREEN_WIDTH * 0.78;
const SCAN_RECT_H = SCAN_RECT_W * 0.45;

export default function BarcodeScreen() {
  const router = useRouter();
  const { addFood, getDefaultMealType } = useFood();

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // { found, food } or null
  const [showResult, setShowResult] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  // Quick-entry form state (for not-found fallback)
  const [entryName, setEntryName] = useState('');
  const [entryCalories, setEntryCalories] = useState('');
  const [entryProtein, setEntryProtein] = useState('');
  const [entryCarbs, setEntryCarbs] = useState('');
  const [entryFat, setEntryFat] = useState('');
  const [entryServing, setEntryServing] = useState('1 serving');
  const [isSaving, setIsSaving] = useState(false);

  const lastScannedRef = useRef(null);
  const debounceRef = useRef(false);
  const calorieInputRef = useRef(null);

  // Scan line animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  // Bottom sheet slide animation
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanLineAnim]);

  // Animate bottom sheet
  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: showResult ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showResult, sheetAnim]);

  const handleBarcodeScanned = useCallback(
    async ({ data }) => {
      if (debounceRef.current || isLoading || !data) return;
      if (lastScannedRef.current === data) return;

      debounceRef.current = true;
      lastScannedRef.current = data;
      setIsLoading(true);
      setScannedBarcode(data);

      await hapticSuccess();

      try {
        const response = await lookupBarcode(data);
        setResult(response);
        setShowResult(true);

        if (!response.found) {
          await hapticWarning();
          // Pre-fill the quick-entry form
          setEntryName('Scanned Item');
          setEntryCalories('');
          setEntryProtein('');
          setEntryCarbs('');
          setEntryFat('');
          setEntryServing('1 serving');
          // Auto-focus calories input after animation
          setTimeout(() => calorieInputRef.current?.focus(), 400);
        }
      } catch {
        setResult({ found: false });
        setShowResult(true);
        await hapticWarning();
        // Pre-fill the quick-entry form
        setEntryName('Scanned Item');
        setEntryCalories('');
        setEntryProtein('');
        setEntryCarbs('');
        setEntryFat('');
        setEntryServing('1 serving');
        setTimeout(() => calorieInputRef.current?.focus(), 400);
      } finally {
        setIsLoading(false);
        // 2-second debounce window
        setTimeout(() => {
          debounceRef.current = false;
        }, 2000);
      }
    },
    [isLoading]
  );

  const handleAddToDiary = useCallback(() => {
    if (!result?.food) return;
    const mealType = getDefaultMealType();
    const foodEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: result.food.name,
      calories: result.food.calories || 0,
      protein: result.food.protein || 0,
      carbs: result.food.carbs || 0,
      fat: result.food.fat || 0,
      fiber: result.food.fiber || 0,
      sodium: result.food.sodium || 0,
      sugar: result.food.sugar || 0,
      serving: result.food.serving || '100g',
      servingSize: 1,
      servingUnit: 'serving',
      brand: result.food.brand || '',
      image: result.food.image || null,
      barcode: result.food.barcode || '',
    };

    addFood(foodEntry, mealType);
    hapticSuccess();
    router.back();
  }, [result, addFood, getDefaultMealType, router]);

  const handleScanAnother = useCallback(() => {
    setShowResult(false);
    setResult(null);
    lastScannedRef.current = null;
    debounceRef.current = false;
  }, []);

  // Save & Add: save manual entry to barcode cache and add to diary
  const handleSaveAndAdd = useCallback(async () => {
    const cal = parseInt(entryCalories, 10);
    if (!cal || cal <= 0) return;

    setIsSaving(true);
    await hapticLight();

    const foodData = {
      name: entryName.trim() || 'Scanned Item',
      calories: cal,
      protein: parseFloat(entryProtein) || 0,
      carbs: parseFloat(entryCarbs) || 0,
      fat: parseFloat(entryFat) || 0,
      serving: entryServing.trim() || '1 serving',
      brand: '',
    };

    // Cache to both barcode caches so re-scanning finds it instantly
    if (scannedBarcode) {
      try {
        await setCachedBarcode(scannedBarcode, foodData);
        await submitBarcodeData(scannedBarcode, {
          ...foodData,
          fiber: 0,
          sodium: 0,
          sugar: 0,
          image: null,
          barcode: scannedBarcode,
        });
      } catch {
        // Silent fail - still add to diary
      }
    }

    // Add to diary
    const mealType = getDefaultMealType();
    const foodEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: foodData.name,
      calories: foodData.calories,
      protein: foodData.protein,
      carbs: foodData.carbs,
      fat: foodData.fat,
      serving: foodData.serving,
      servingSize: 1,
      servingUnit: 'serving',
      barcode: scannedBarcode,
    };

    addFood(foodEntry, mealType);
    await hapticSuccess();
    setIsSaving(false);
    router.back();
  }, [entryName, entryCalories, entryProtein, entryCarbs, entryFat, entryServing, scannedBarcode, addFood, getDefaultMealType, router]);

  // Search Instead: navigate to add screen with barcode digits as query
  const handleSearchInstead = useCallback(() => {
    hapticLight();
    router.replace({
      pathname: '/(tabs)/add',
      params: { query: scannedBarcode },
    });
  }, [router, scannedBarcode]);

  // Submit to Community: navigate to submit-food screen
  const handleSubmitToCommunity = useCallback(() => {
    hapticLight();
    router.push({
      pathname: '/submit-food',
      params: { barcode: scannedBarcode, name: entryName.trim() || '' },
    });
  }, [router, scannedBarcode, entryName]);

  // Permission loading
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Checking camera permissions...</Text>
        </View>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredMessage}>
          <View style={styles.permissionIconWrap}>
            <ScanBarcode size={48} color={Colors.textSecondary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionBody}>
            Allow camera access to scan barcodes and instantly look up nutrition information.
          </Text>
          <Pressable style={styles.grantButton} onPress={requestPermission}>
            <Text style={styles.grantButtonText}>Allow Camera</Text>
          </Pressable>
          <Pressable style={styles.settingsButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </Pressable>
          <Pressable style={styles.backTextButton} onPress={() => router.back()}>
            <Text style={styles.backTextButtonLabel}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_RECT_H - 4],
  });

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={showResult || isLoading ? undefined : handleBarcodeScanned}
      />

      {/* Semi-transparent overlay with cutout */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top dark region */}
        <View style={styles.overlayFill} />

        {/* Middle row: side dark | scan rect | side dark */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlayFill} />
          <View style={styles.scanRect}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />

            {/* Scan line */}
            {!isLoading && !showResult && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineTranslate }] },
                ]}
              />
            )}
          </View>
          <View style={styles.overlayFill} />
        </View>

        {/* Instruction text between scan rect and bottom */}
        <View style={styles.overlayBottom}>
          <ScanBarcode size={20} color={Colors.textSecondary} style={{ marginBottom: 6 }} />
          <Text style={styles.instructionText}>
            {isLoading ? 'Looking up product...' : 'Scan a barcode'}
          </Text>
        </View>
      </View>

      {/* Header controls */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Pressable style={styles.headerBtn} onPress={() => setTorch((t) => !t)}>
          {torch ? (
            <Zap size={22} color={Colors.warning} />
          ) : (
            <ZapOff size={22} color={Colors.text} />
          )}
        </Pressable>
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingCardText}>Fetching nutrition data...</Text>
          </View>
        </View>
      )}

      {/* Result bottom sheet */}
      {showResult && (
        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.sheetHandle} />

          {result?.found ? (
            <View style={styles.sheetContent}>
              {/* Product image + info row */}
              <View style={styles.productRow}>
                {result.food.image ? (
                  <Image
                    source={{ uri: result.food.image }}
                    style={styles.productImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.productImage, styles.productImagePlaceholder]}>
                    <ScanBarcode size={28} color={Colors.textTertiary} />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {result.food.name}
                  </Text>
                  {!!result.food.brand && (
                    <Text style={styles.productBrand} numberOfLines={1}>
                      {result.food.brand}
                    </Text>
                  )}
                  <Text style={styles.productServing}>
                    Per {result.food.serving}
                  </Text>
                </View>
              </View>

              {/* Calorie badge */}
              <View style={styles.calorieBadge}>
                <Text style={styles.calorieBadgeValue}>{result.food.calories}</Text>
                <Text style={styles.calorieBadgeLabel}>kcal</Text>
              </View>

              {/* Macro row */}
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{result.food.protein}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{result.food.carbs}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>{result.food.fat}g</Text>
                </View>
              </View>

              {/* Action buttons */}
              <Pressable style={styles.addButton} onPress={handleAddToDiary}>
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Text style={styles.addButtonText}>Add to Diary</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.scanAnotherButton} onPress={handleScanAnother}>
                <Text style={styles.scanAnotherText}>Scan Another</Text>
              </Pressable>
            </View>
          ) : (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}
            >
              <ScrollView
                style={styles.fallbackScroll}
                contentContainerStyle={styles.fallbackScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Encouraging header */}
                <View style={styles.fallbackHeader}>
                  <View style={styles.fallbackIconWrap}>
                    <Flame size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.fallbackTitle}>
                    Let's add this food manually
                  </Text>
                  <Text style={styles.fallbackSubtitle}>
                    It only takes a few seconds!
                  </Text>
                </View>

                {/* Food name input */}
                <View style={styles.fallbackField}>
                  <Text style={styles.fallbackLabel}>Food Name</Text>
                  <TextInput
                    style={styles.fallbackInput}
                    value={entryName}
                    onChangeText={setEntryName}
                    placeholder="e.g., Protein Bar"
                    placeholderTextColor={Colors.textTertiary}
                    returnKeyType="next"
                    maxLength={80}
                  />
                </View>

                {/* Calories - prominent large input */}
                <View style={styles.fallbackCalorieCard}>
                  <Flame size={20} color={Colors.primary} />
                  <TextInput
                    ref={calorieInputRef}
                    style={styles.fallbackCalorieInput}
                    value={entryCalories}
                    onChangeText={setEntryCalories}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    maxLength={5}
                    selectTextOnFocus
                  />
                  <Text style={styles.fallbackCalorieLabel}>kcal</Text>
                </View>

                {/* Macros row - optional, smaller inputs */}
                <View style={styles.fallbackMacroRow}>
                  <View style={styles.fallbackMacroField}>
                    <View style={[styles.fallbackMacroDot, { backgroundColor: Colors.protein }]} />
                    <Text style={styles.fallbackMacroLabel}>Protein</Text>
                    <TextInput
                      style={styles.fallbackMacroInput}
                      value={entryProtein}
                      onChangeText={setEntryProtein}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.fallbackMacroUnit}>g</Text>
                  </View>
                  <View style={styles.fallbackMacroField}>
                    <View style={[styles.fallbackMacroDot, { backgroundColor: Colors.carbs }]} />
                    <Text style={styles.fallbackMacroLabel}>Carbs</Text>
                    <TextInput
                      style={styles.fallbackMacroInput}
                      value={entryCarbs}
                      onChangeText={setEntryCarbs}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.fallbackMacroUnit}>g</Text>
                  </View>
                  <View style={styles.fallbackMacroField}>
                    <View style={[styles.fallbackMacroDot, { backgroundColor: Colors.fat }]} />
                    <Text style={styles.fallbackMacroLabel}>Fat</Text>
                    <TextInput
                      style={styles.fallbackMacroInput}
                      value={entryFat}
                      onChangeText={setEntryFat}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.fallbackMacroUnit}>g</Text>
                  </View>
                </View>

                {/* Serving size */}
                <View style={styles.fallbackField}>
                  <Text style={styles.fallbackLabel}>Serving Size</Text>
                  <TextInput
                    style={styles.fallbackInput}
                    value={entryServing}
                    onChangeText={setEntryServing}
                    placeholder="e.g., 1 serving, 1 cup"
                    placeholderTextColor={Colors.textTertiary}
                    maxLength={40}
                  />
                </View>

                {/* Save & Add button */}
                <Pressable
                  style={[
                    styles.addButton,
                    (!entryCalories || parseInt(entryCalories, 10) <= 0) && styles.addButtonDisabled,
                  ]}
                  onPress={handleSaveAndAdd}
                  disabled={!entryCalories || parseInt(entryCalories, 10) <= 0 || isSaving}
                >
                  <LinearGradient
                    colors={
                      entryCalories && parseInt(entryCalories, 10) > 0
                        ? Gradients.primary
                        : [Colors.surfaceElevated, Colors.surfaceElevated]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addButtonGradient}
                  >
                    <Check size={20} color={
                      entryCalories && parseInt(entryCalories, 10) > 0
                        ? Colors.background
                        : Colors.textTertiary
                    } />
                    <Text style={[
                      styles.addButtonText,
                      (!entryCalories || parseInt(entryCalories, 10) <= 0) && { color: Colors.textTertiary },
                    ]}>
                      {isSaving ? 'Saving...' : 'Save & Add'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Secondary actions */}
                <View style={styles.fallbackActions}>
                  <Pressable style={styles.fallbackActionLink} onPress={handleSearchInstead}>
                    <Search size={16} color={Colors.primary} />
                    <Text style={styles.fallbackActionText}>Search Instead</Text>
                  </Pressable>

                  <View style={styles.fallbackActionDivider} />

                  <Pressable style={styles.fallbackActionLink} onPress={handleSubmitToCommunity}>
                    <Users size={16} color={Colors.secondary} />
                    <Text style={[styles.fallbackActionText, { color: Colors.secondaryText }]}>
                      Submit to Community
                    </Text>
                  </Pressable>
                </View>

                {/* Scan Another */}
                <Pressable style={styles.scanAnotherButton} onPress={handleScanAnother}>
                  <Text style={styles.scanAnotherText}>Scan Another</Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Centered permission / loading messages ──
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centeredText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  permissionIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  permissionBody: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  grantButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  grantButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  settingsButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  settingsButtonText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  backTextButton: {
    paddingVertical: Spacing.sm,
  },
  backTextButtonLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // ── Overlay ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayFill: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  scanRect: {
    width: SCAN_RECT_W,
    height: SCAN_RECT_H,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: Colors.primary,
  },
  cTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  instructionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // ── Header ──
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Loading overlay ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  loadingCard: {
    backgroundColor: 'rgba(22, 22, 26, 0.92)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingCardText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },

  // ── Bottom sheet ──
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(22, 22, 26, 0.95)',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetContent: {
    alignItems: 'center',
  },

  // ── Found result ──
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  productName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  productBrand: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  productServing: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 4,
  },

  // ── Calorie badge ──
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
    gap: 4,
  },
  calorieBadgeValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.heavy,
    color: Colors.primary,
  },
  calorieBadgeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // ── Macro row ──
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  macroItem: {
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  macroValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // ── Buttons ──
  addButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonGradient: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  scanAnotherButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  scanAnotherText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  addManuallyButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  addManuallyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },

  // ── Quick-entry fallback form ──
  fallbackScroll: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  fallbackScrollContent: {
    paddingBottom: Spacing.md,
  },
  fallbackHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  fallbackIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  fallbackTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  fallbackField: {
    marginBottom: Spacing.md,
  },
  fallbackLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  fallbackInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fallbackCalorieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: Spacing.sm,
  },
  fallbackCalorieInput: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textAlign: 'center',
    minWidth: 80,
    paddingVertical: Spacing.xs,
  },
  fallbackCalorieLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  fallbackMacroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fallbackMacroField: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fallbackMacroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  fallbackMacroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  fallbackMacroInput: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 2,
  },
  fallbackMacroUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  fallbackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  fallbackActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  fallbackActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryText,
  },
  fallbackActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
