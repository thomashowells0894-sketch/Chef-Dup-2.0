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
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Zap, ZapOff, ScanBarcode } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../constants/theme';
import { useFood } from '../context/FoodContext';
import { hapticSuccess, hapticWarning } from '../lib/haptics';
import { lookupBarcode } from '../services/barcodeService';

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

  const lastScannedRef = useRef(null);
  const debounceRef = useRef(false);

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

      await hapticSuccess();

      try {
        const response = await lookupBarcode(data);
        setResult(response);
        setShowResult(true);

        if (!response.found) {
          await hapticWarning();
        }
      } catch {
        setResult({ found: false });
        setShowResult(true);
        await hapticWarning();
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

  const handleAddManually = useCallback(() => {
    router.replace('/create-food');
  }, [router]);

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
            <View style={styles.sheetContent}>
              <View style={styles.notFoundIcon}>
                <ScanBarcode size={36} color={Colors.textTertiary} />
              </View>
              <Text style={styles.notFoundTitle}>Product Not Found</Text>
              <Text style={styles.notFoundSubtitle}>
                This barcode is not in our database yet.
              </Text>

              <Pressable style={styles.scanAnotherButton} onPress={handleScanAnother}>
                <Text style={styles.scanAnotherText}>Try Again</Text>
              </Pressable>

              <Pressable style={styles.addManuallyButton} onPress={handleAddManually}>
                <Text style={styles.addManuallyText}>Add Manually</Text>
              </Pressable>
            </View>
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
  addButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
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

  // ── Not found ──
  notFoundIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  notFoundTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  notFoundSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
