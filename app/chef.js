import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { hapticLight, hapticImpact, hapticSuccess, hapticError } from '../lib/haptics';
import {
  X,
  Camera,
  ChefHat,
  Clock,
  Flame,
  Users,
  AlertTriangle,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Lightbulb,
  UtensilsCrossed,
} from 'lucide-react-native';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';
import { suggestRecipesFromImage } from '../services/ai';
import PremiumGate from '../components/PremiumGate';
import { useOffline } from '../context/OfflineContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.85;
const CARD_WIDTH = SCREEN_WIDTH * 0.75;

// Warm color palette for Chef theme
const ChefColors = {
  primary: '#FF6B35',
  secondary: '#F7931E',
  accent: '#FFB347',
  gradient: ['#FF6B35', '#F7931E'],
  gradientDark: ['#1A0F0A', '#2D1810', '#1A0F0A'],
};

// Difficulty badge colors
const DifficultyColors = {
  Easy: '#10B981',
  Medium: '#F59E0B',
  Hard: '#EF4444',
};

// Ingredient Chip Component
function IngredientChip({ ingredient }) {
  return (
    <View style={styles.ingredientChip}>
      <Text style={styles.ingredientChipText}>{ingredient}</Text>
    </View>
  );
}

// Recipe Card Component
function RecipeCard({ recipe, onPress, isActive }) {
  const difficultyColor = DifficultyColors[recipe.difficulty] || DifficultyColors.Medium;

  return (
    <Pressable
      style={[styles.recipeCard, isActive && styles.recipeCardActive]}
      onPress={onPress}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        style={styles.recipeCardGradient}
      >
        {/* Header */}
        <View style={styles.recipeCardHeader}>
          <Text style={styles.recipeEmoji}>{recipe.emoji}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + '20' }]}>
            <Text style={[styles.difficultyText, { color: difficultyColor }]}>
              {recipe.difficulty}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.recipeName} numberOfLines={2}>
          {recipe.name}
        </Text>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {recipe.description}
        </Text>

        {/* Stats */}
        <View style={styles.recipeStats}>
          <View style={styles.recipeStat}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.recipeStatText}>{recipe.time}</Text>
          </View>
          <View style={styles.recipeStat}>
            <Flame size={14} color={ChefColors.primary} />
            <Text style={styles.recipeStatText}>{recipe.calories} cal</Text>
          </View>
          <View style={styles.recipeStat}>
            <Users size={14} color={Colors.textSecondary} />
            <Text style={styles.recipeStatText}>{recipe.servings} serv</Text>
          </View>
        </View>

        {/* Missing Ingredients Warning */}
        {recipe.missing_ingredients?.length > 0 && (
          <View style={styles.missingBadge}>
            <AlertTriangle size={12} color={Colors.warning} />
            <Text style={styles.missingBadgeText}>
              {recipe.missing_ingredients.length} missing
            </Text>
          </View>
        )}

        {/* View Button */}
        <View style={styles.viewRecipeButton}>
          <Text style={styles.viewRecipeText}>View Recipe</Text>
          <ChevronRight size={16} color={ChefColors.primary} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// Recipe Detail Modal
function RecipeDetailModal({ recipe, visible, onClose }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const toggleStep = (index) => {
    hapticLight();
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const progress = recipe?.instructions
    ? (completedSteps.size / recipe.instructions.length) * 100
    : 0;

  if (!recipe) return null;

  const difficultyColor = DifficultyColors[recipe.difficulty] || DifficultyColors.Medium;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <LinearGradient colors={ChefColors.gradientDark} style={StyleSheet.absoluteFill} />

        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.modalHeader}>
          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalEmoji}>{recipe.emoji}</Text>
            <Text style={styles.modalTitle}>{recipe.name}</Text>
          </View>
          <View style={{ width: 44 }} />
        </SafeAreaView>

        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Macro Cards */}
          <View style={styles.macroCardsRow}>
            <View style={styles.macroCard}>
              <Flame size={20} color={ChefColors.primary} />
              <Text style={styles.macroValue}>{recipe.calories}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={[styles.macroValue, { color: Colors.protein }]}>{recipe.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={[styles.macroValue, { color: Colors.carbs }]}>{recipe.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={[styles.macroValue, { color: Colors.fat }]}>{recipe.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>

          {/* Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{recipe.time}</Text>
            </View>
            <View style={[styles.infoBadge, { backgroundColor: difficultyColor + '20' }]}>
              <Text style={[styles.infoBadgeText, { color: difficultyColor }]}>
                {recipe.difficulty}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Users size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{recipe.servings} servings</Text>
            </View>
          </View>

          {/* Missing Ingredients Warning */}
          {recipe.missing_ingredients?.length > 0 && (
            <View style={styles.missingSection}>
              <View style={styles.missingSectionHeader}>
                <AlertTriangle size={18} color={Colors.warning} />
                <Text style={styles.missingSectionTitle}>Missing Ingredients</Text>
              </View>
              <View style={styles.missingList}>
                {recipe.missing_ingredients.map((item, idx) => (
                  <View key={`missing-${item}-${idx}`} style={styles.missingItem}>
                    <Text style={styles.missingItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Ingredients Used */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Ingredients You Have</Text>
            <View style={styles.ingredientsUsedList}>
              {recipe.ingredients_used?.map((item, idx) => (
                <View key={`used-${item}-${idx}`} style={styles.ingredientUsedItem}>
                  <Check size={14} color={Colors.success} />
                  <Text style={styles.ingredientUsedText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Cooking Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
            {recipe.instructions?.map((step, idx) => {
              const isCompleted = completedSteps.has(idx);
              return (
                <Pressable
                  key={`step-${idx}`}
                  style={[styles.stepCard, isCompleted && styles.stepCardCompleted]}
                  onPress={() => toggleStep(idx)}
                >
                  <View
                    style={[
                      styles.stepCheckbox,
                      isCompleted && styles.stepCheckboxCompleted,
                    ]}
                  >
                    {isCompleted && <Check size={14} color="#fff" />}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepNumber}>Step {idx + 1}</Text>
                    <Text
                      style={[styles.stepText, isCompleted && styles.stepTextCompleted]}
                    >
                      {step}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Chef Tip */}
          {recipe.chef_tip && (
            <View style={styles.chefTipSection}>
              <View style={styles.chefTipHeader}>
                <Lightbulb size={18} color={ChefColors.primary} />
                <Text style={styles.chefTipTitle}>Chef's Tip</Text>
              </View>
              <Text style={styles.chefTipText}>{recipe.chef_tip}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function ChefScreenContent() {
  const router = useRouter();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const flatListRef = useRef(null);
  const { isOnline } = useOffline();

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current || isAnalyzing) return;
    if (!isOnline) {
      Alert.alert('No Connection', 'AI Chef requires an internet connection.');
      return;
    }

    try {
      await hapticImpact();
      setIsAnalyzing(true);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        skipProcessing: true,
      });

      // Analyze then release base64 reference
      const analysis = await suggestRecipesFromImage(photo.base64, {
        goal: 'balanced',
      });
      photo.base64 = null;

      setResult(analysis);
      await hapticSuccess();
    } catch (error) {
      if (__DEV__) console.error('Chef analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        error.message || 'Could not analyze the image. Make sure food items are visible.',
        [{ text: 'OK' }]
      );
      await hapticError();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setSelectedRecipe(null);
    setActiveCardIndex(0);
  };

  const handleClose = () => {
    router.back();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveCardIndex(viewableItems[0].index);
    }
  }).current;

  if (!permission) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={ChefColors.gradientDark} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={ChefColors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient colors={ChefColors.gradientDark} style={StyleSheet.absoluteFill} />
        <ChefHat size={64} color={ChefColors.primary} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Allow camera access to scan your fridge and get recipe suggestions.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <LinearGradient colors={ChefColors.gradient} style={styles.permissionButtonGradient}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.backButton} onPress={handleClose}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Results Screen
  if (result) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={ChefColors.gradientDark} style={StyleSheet.absoluteFill} />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={styles.resultsHeader}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <X size={24} color={Colors.text} />
            </Pressable>
            <View style={styles.titleContainer}>
              <ChefHat size={20} color={ChefColors.primary} />
              <Text style={styles.title}>AI Chef</Text>
            </View>
            <Pressable style={styles.retryHeaderButton} onPress={handleRetry}>
              <RotateCcw size={20} color={ChefColors.primary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.resultsScrollView}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Detected Ingredients */}
            <View style={styles.ingredientsSection}>
              <View style={styles.ingredientsSectionHeader}>
                <Sparkles size={18} color={ChefColors.primary} />
                <Text style={styles.ingredientsSectionTitle}>I found these ingredients</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ingredientsScroll}
              >
                {result.detected_ingredients.map((ingredient, idx) => (
                  <IngredientChip key={`ingredient-${ingredient}-${idx}`} ingredient={ingredient} />
                ))}
              </ScrollView>
            </View>

            {/* Recipe Suggestions */}
            <View style={styles.recipesSection}>
              <View style={styles.recipesSectionHeader}>
                <UtensilsCrossed size={18} color={ChefColors.primary} />
                <Text style={styles.recipesSectionTitle}>Recipe Ideas</Text>
                <Text style={styles.recipesSectionCount}>
                  {result.recipes.length} options
                </Text>
              </View>

              <FlatList
                ref={flatListRef}
                data={result.recipes}
                horizontal
                pagingEnabled
                snapToInterval={CARD_WIDTH + Spacing.md}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recipesCarousel}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                renderItem={({ item, index }) => (
                  <RecipeCard
                    recipe={item}
                    isActive={index === activeCardIndex}
                    onPress={() => setSelectedRecipe(item)}
                  />
                )}
              />

              {/* Pagination Dots */}
              <View style={styles.paginationDots}>
                {result.recipes.map((recipe, idx) => (
                  <View
                    key={recipe.id || `dot-${idx}`}
                    style={[
                      styles.paginationDot,
                      idx === activeCardIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Retry Button */}
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <RotateCcw size={18} color={Colors.textSecondary} />
              <Text style={styles.retryButtonText}>Scan Different Ingredients</Text>
            </Pressable>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>

        {/* Recipe Detail Modal */}
        <RecipeDetailModal
          recipe={selectedRecipe}
          visible={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      </View>
    );
  }

  // Camera View
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Warm Overlay */}
      <LinearGradient
        colors={['rgba(255,107,53,0.1)', 'transparent', 'rgba(255,107,53,0.1)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* UI Overlay */}
      <View style={styles.overlay}>
        {/* Top Section */}
        <SafeAreaView edges={['top']} style={styles.topSection}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.titleContainer}>
            <ChefHat size={20} color={ChefColors.primary} />
            <Text style={styles.title}>AI Chef</Text>
          </View>
          <View style={styles.placeholder} />
        </SafeAreaView>

        {/* Frame Section */}
        <View style={styles.frameSection}>
          <View style={styles.frameContainer}>
            {/* Rounded corners */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Chef hat icon in center when not analyzing */}
            {!isAnalyzing && (
              <View style={styles.frameCenterIcon}>
                <ChefHat size={48} color={ChefColors.primary} strokeWidth={1.5} />
              </View>
            )}

            {/* Analyzing overlay */}
            {isAnalyzing && (
              <BlurView intensity={50} tint="dark" style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color={ChefColors.primary} />
                <Text style={styles.analyzingText}>Finding ingredients...</Text>
              </BlurView>
            )}
          </View>
          <Text style={styles.frameHint}>Show me your ingredients</Text>
          <Text style={styles.frameSubhint}>Fridge, pantry, or countertop</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Pressable
            style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={ChefColors.gradient}
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
    </View>
  );
}

// Premium-gated export - redirects non-subscribers to paywall
export default function ChefScreen() {
  return (
    <PremiumGate>
      <ChefScreenContent />
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A0F0A',
  },
  safeArea: {
    flex: 1,
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
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  permissionButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,53,0.2)',
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
    height: FRAME_SIZE * 0.75,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: ChefColors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  frameCenterIcon: {
    opacity: 0.5,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    gap: Spacing.sm,
  },
  analyzingText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  frameHint: {
    marginTop: Spacing.lg,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  frameSubhint: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 50,
    gap: Spacing.md,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: ChefColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
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
  // Results Screen Styles
  resultsScrollView: {
    flex: 1,
  },
  ingredientsSection: {
    paddingTop: Spacing.md,
  },
  ingredientsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  ingredientsSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  ingredientsScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  ingredientChip: {
    backgroundColor: ChefColors.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: ChefColors.primary + '40',
  },
  ingredientChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: ChefColors.primary,
  },
  recipesSection: {
    marginTop: Spacing.xl,
  },
  recipesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  recipesSectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  recipesSectionCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  recipesCarousel: {
    paddingHorizontal: Spacing.md,
  },
  recipeCard: {
    width: CARD_WIDTH,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recipeCardActive: {
    borderColor: ChefColors.primary + '50',
  },
  recipeCardGradient: {
    padding: Spacing.md,
  },
  recipeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  recipeEmoji: {
    fontSize: 40,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  difficultyText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  recipeName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  recipeStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  recipeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeStatText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  missingBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
  },
  viewRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: Spacing.sm,
  },
  viewRecipeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: ChefColors.primary,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  paginationDotActive: {
    backgroundColor: ChefColors.primary,
    width: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  retryButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    justifyContent: 'center',
  },
  modalEmoji: {
    fontSize: 24,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.md,
  },
  macroCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 4,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  infoBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  infoBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  missingSection: {
    backgroundColor: Colors.warning + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  missingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  missingSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
  missingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  missingItem: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  missingItemText: {
    fontSize: FontSize.sm,
    color: Colors.warning,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  ingredientsUsedList: {
    gap: Spacing.xs,
  },
  ingredientUsedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  ingredientUsedText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  progressSection: {
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  progressPercent: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: ChefColors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ChefColors.primary,
    borderRadius: 4,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  stepCardCompleted: {
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  stepCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepCheckboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  stepContent: {
    flex: 1,
  },
  stepNumber: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: ChefColors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  stepText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  stepTextCompleted: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  chefTipSection: {
    backgroundColor: ChefColors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: ChefColors.primary,
  },
  chefTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chefTipTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: ChefColors.primary,
  },
  chefTipText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
