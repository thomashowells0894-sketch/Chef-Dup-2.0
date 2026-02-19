import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { hapticImpact, hapticSuccess, hapticError } from '../lib/haptics';
import {
  X,
  Camera,
  Sparkles,
  Check,
  Edit3,
  RotateCcw,
  Zap,
} from 'lucide-react-native';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { analyzeFoodImage } from '../services/ai';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import PremiumGate from '../components/PremiumGate';
import { useFood } from '../context/FoodContext';
import { useFasting } from '../context/FastingContext';
import { useOffline } from '../context/OfflineContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.75;

function ScanScreenInner() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { addFood, getDefaultMealType } = useFood();
  const { recordMealLogged } = useFasting();
  const { isOnline } = useOffline();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFood, setEditedFood] = useState(null);

  const selectedMeal = params.meal || getDefaultMealType();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current || isAnalyzing) return;
    if (!isOnline) {
      Alert.alert('No Connection', 'Food scanning requires an internet connection.');
      return;
    }

    try {
      await hapticImpact();
      setIsAnalyzing(true);

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
      });

      // Analyze with Gemini, then release base64 reference
      const analysis = await analyzeFoodImage(photo.base64);
      photo.base64 = null;

      setResult(analysis);
      setEditedFood(analysis);
      setResultModalVisible(true);
      await hapticSuccess();
    } catch (error) {
      if (__DEV__) console.error('Scan error:', error);
      Alert.alert(
        'Analysis Failed',
        error.message || 'Could not analyze the image. Please try again.',
        [{ text: 'OK' }]
      );
      await hapticError();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!editedFood) return;

    try {
      await hapticSuccess();

      const foodToAdd = {
        name: editedFood.name,
        emoji: editedFood.emoji || '🍽️',
        calories: parseInt(editedFood.calories, 10) || 0,
        protein: parseInt(editedFood.protein, 10) || 0,
        carbs: parseInt(editedFood.carbs, 10) || 0,
        fat: parseInt(editedFood.fat, 10) || 0,
        serving: editedFood.serving || '1 serving',
        servingSize: 1,
        servingUnit: 'serving',
        source: 'ai_scan',
      };

      await addFood(foodToAdd, selectedMeal);
      recordMealLogged(selectedMeal);

      setResultModalVisible(false);
      router.back();
    } catch (error) {
      if (__DEV__) console.error('Error adding food:', error);
      Alert.alert('Error', 'Failed to log food. Please try again.');
    }
  };

  const handleRetry = () => {
    setResultModalVisible(false);
    setResult(null);
    setEditedFood(null);
    setIsEditing(false);
  };

  const handleClose = () => {
    router.back();
  };

  const updateEditedField = (field, value) => {
    setEditedFood((prev) => ({ ...prev, [field]: value }));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient colors={Gradients.background} style={StyleSheet.absoluteFill} />
        <Camera size={64} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Allow camera access to scan food and get instant nutritional information.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={handleClose}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full Screen Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top Section */}
        <View style={styles.topSection}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.titleContainer}>
            <Sparkles size={20} color={Colors.primary} />
            <Text style={styles.title}>Food Lens</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Frame Section */}
        <View style={styles.frameSection}>
          <View style={styles.frameContainer}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Analyzing overlay */}
            {isAnalyzing && (
              <BlurView intensity={50} tint="dark" style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.analyzingText}>Analyzing...</Text>
              </BlurView>
            )}
          </View>
          <Text style={styles.frameHint}>Align food in the frame</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.mealBadge}>
            <Text style={styles.mealBadgeText}>
              Logging to {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
            </Text>
          </View>

          <Pressable
            style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={Gradients.electric}
              style={styles.captureButtonGradient}
            >
              {isAnalyzing ? (
                <ActivityIndicator size={32} color="#fff" />
              ) : (
                <Camera size={32} color="#fff" />
              )}
            </LinearGradient>
          </Pressable>

          <Text style={styles.poweredBy}>Powered by Google Gemini</Text>
        </View>
      </View>

      {/* Result Modal */}
      <Modal
        visible={resultModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleRetry}
      >
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.resultEmoji}>
                <Text style={styles.resultEmojiText}>{editedFood?.emoji || '🍽️'}</Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Zap size={12} color={Colors.primary} />
                <Text style={styles.confidenceText}>
                  {result?.confidence || 'medium'} confidence
                </Text>
              </View>
            </View>

            {/* Food Name */}
            {isEditing ? (
              <TextInput
                style={styles.nameInput}
                value={editedFood?.name || ''}
                onChangeText={(text) => updateEditedField('name', text)}
                placeholder="Food name"
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
            ) : (
              <Text style={styles.resultName}>{editedFood?.name}</Text>
            )}

            {/* Serving */}
            <Text style={styles.servingText}>{editedFood?.serving}</Text>

            {/* Macros */}
            <View style={styles.macrosContainer}>
              {/* Calories */}
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Calories</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.macroInput}
                    value={String(editedFood?.calories || '')}
                    onChangeText={(text) => updateEditedField('calories', text)}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                ) : (
                  <Text style={styles.macroValue}>{editedFood?.calories}</Text>
                )}
                <Text style={styles.macroUnit}>kcal</Text>
              </View>

              {/* Protein */}
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: Colors.protein }]}>Protein</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.macroInput}
                    value={String(editedFood?.protein || '')}
                    onChangeText={(text) => updateEditedField('protein', text)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                ) : (
                  <Text style={styles.macroValue}>{editedFood?.protein}</Text>
                )}
                <Text style={styles.macroUnit}>g</Text>
              </View>

              {/* Carbs */}
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: Colors.carbs }]}>Carbs</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.macroInput}
                    value={String(editedFood?.carbs || '')}
                    onChangeText={(text) => updateEditedField('carbs', text)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                ) : (
                  <Text style={styles.macroValue}>{editedFood?.carbs}</Text>
                )}
                <Text style={styles.macroUnit}>g</Text>
              </View>

              {/* Fat */}
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: Colors.fat }]}>Fat</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.macroInput}
                    value={String(editedFood?.fat || '')}
                    onChangeText={(text) => updateEditedField('fat', text)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                ) : (
                  <Text style={styles.macroValue}>{editedFood?.fat}</Text>
                )}
                <Text style={styles.macroUnit}>g</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.editButton}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Edit3 size={18} color={Colors.primary} />
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Done' : 'Edit'}
                </Text>
              </Pressable>

              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <RotateCcw size={18} color={Colors.textSecondary} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>

            {/* Confirm Button */}
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <LinearGradient
                colors={Gradients.success}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                <Check size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Log Food</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  permissionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  permissionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  backButton: {
    marginTop: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 44,
  },
  frameSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameContainer: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: Spacing.sm,
  },
  analyzingText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  frameHint: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 50,
    gap: Spacing.md,
  },
  mealBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  mealBadgeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    ...Shadows.fab,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultEmoji: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resultEmojiText: {
    fontSize: 36,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  confidenceText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
    textTransform: 'capitalize',
  },
  resultName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  nameInput: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: Spacing.xs,
  },
  servingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  macroItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: FontWeight.medium,
  },
  macroValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  macroInput: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    minWidth: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
  },
  macroUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editButtonText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
  },
  retryButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  confirmButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glowSuccess,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  confirmButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});

export default function ScanScreen(props) {
  return (
    <ScreenErrorBoundary screenName="ScanScreen">
      <PremiumGate>
        <ScanScreenInner {...props} />
      </PremiumGate>
    </ScreenErrorBoundary>
  );
}
