import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Camera, FlashlightOff, Flashlight, Search } from 'lucide-react-native';
import { hapticImpact, hapticSuccess, hapticWarning, hapticError } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useFood } from '../context/FoodContext';
import { useFasting } from '../context/FastingContext';
import { fetchProductByBarcode, productToFood } from '../services/openFoodFacts';
import FoodDetailModal from '../components/FoodDetailModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.75;

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFood, getDefaultMealType } = useFood();
  const { recordMealLogged } = useFasting();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastScannedRef = useRef(null);

  // Food detail modal state
  const [foodDetailVisible, setFoodDetailVisible] = useState(false);
  const [scannedFood, setScannedFood] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(params.meal || getDefaultMealType());

  // Scan line animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate scan line up and down
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate();
  }, [scanLineAnim]);

  const handleBarcodeScanned = useCallback(async ({ data }) => {
    // Prevent duplicate scans
    if (scanned || lastScannedRef.current === data || isLoading) return;

    lastScannedRef.current = data;
    setScanned(true);
    setIsLoading(true);

    await hapticImpact();

    try {
      const product = await fetchProductByBarcode(data);

      if (product) {
        // Convert to food format and show detail modal immediately
        const food = productToFood(product);
        setScannedFood({
          ...food,
          image: product.image,
          brand: product.brand,
          serving: product.serving || '100g',
          servingSize: product.servingSize || 100,
          servingUnit: product.servingUnit || 'g',
        });

        await hapticSuccess();

        setFoodDetailVisible(true);
      } else {
        // Product not found
        await hapticWarning();

        Alert.alert(
          'Product Not Found',
          'This barcode is not in our database. Would you like to search manually?',
          [
            {
              text: 'Scan Again',
              onPress: resetScanner,
            },
            {
              text: 'Search Manually',
              onPress: () => {
                router.replace({
                  pathname: '/(tabs)/add',
                  params: { meal: selectedMeal },
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      if (__DEV__) console.error('Barcode scan error:', error);

      await hapticError();

      Alert.alert(
        'Lookup Failed',
        'Could not look up product. Check your connection and try again.',
        [
          { text: 'Try Again', onPress: resetScanner },
          { text: 'Cancel', onPress: () => router.back() },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [scanned, isLoading, router, selectedMeal]);

  const resetScanner = () => {
    setScanned(false);
    setIsLoading(false);
    lastScannedRef.current = null;
  };

  const handleConfirmFood = async (food, mealType) => {
    await hapticSuccess();

    addFood(food, mealType);
    recordMealLogged(mealType);
    setFoodDetailVisible(false);
    setScannedFood(null);

    // Navigate back to dashboard
    router.replace('/');
  };

  const handleCloseDetail = () => {
    setFoodDetailVisible(false);
    setScannedFood(null);
    resetScanner();
  };

  const handleClose = () => {
    router.back();
  };

  // Permission not determined
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking camera permissions...</Text>
        </View>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Camera size={48} color={Colors.textSecondary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            FuelIQ needs camera access to scan barcodes on food products for instant nutrition lookup.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE * 0.5],
  });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'code93',
            'itf14',
            'codabar',
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top overlay */}
        <View style={styles.overlayTop} />

        {/* Middle row with scan area */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanArea}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {/* Animated scan line */}
            {!scanned && !isLoading && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineTranslate }] },
                ]}
              />
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* Bottom overlay with instructions */}
        <View style={styles.overlayBottom}>
          <Text style={styles.instructionText}>
            {isLoading
              ? 'Looking up nutrition info...'
              : scanned
              ? 'Processing...'
              : 'Point at barcode for instant lookup'}
          </Text>
          <Text style={styles.hintText}>
            Works with most packaged foods
          </Text>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <X size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <Text style={styles.headerSubtitle}>Instant nutrition lookup</Text>
        </View>
        <Pressable style={styles.torchButton} onPress={() => setTorch(!torch)}>
          {torch ? (
            <Flashlight size={24} color={Colors.warning} />
          ) : (
            <FlashlightOff size={24} color={Colors.text} />
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

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        {scanned && !isLoading && !foodDetailVisible && (
          <Pressable style={styles.retryButton} onPress={resetScanner}>
            <Text style={styles.retryButtonText}>Scan Again</Text>
          </Pressable>
        )}
        <Pressable style={styles.searchButton} onPress={() => router.replace('/(tabs)/add')}>
          <Search size={20} color={Colors.primary} />
          <Text style={styles.searchButtonText}>Search Instead</Text>
        </Pressable>
      </View>

      {/* Food Detail Modal */}
      <FoodDetailModal
        visible={foodDetailVisible}
        food={scannedFood}
        mealType={selectedMeal}
        onClose={handleCloseDetail}
        onConfirm={handleConfirmFood}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  permissionIcon: {
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
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  cancelButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.55,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  instructionText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  hintText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  torchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingCardText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 50,
    left: Spacing.md,
    right: Spacing.md,
    gap: Spacing.sm,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  searchButton: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  searchButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
