/**
 * ShareCardModal - Premium social sharing modal for FuelIQ
 *
 * Renders a preview of the share card in a full-screen modal, then lets
 * the user share an image via the native share sheet or save to device.
 *
 * Uses react-native-view-shot to capture the rendered card as a PNG,
 * then expo-sharing to open the system share sheet.
 *
 * Props:
 *   visible    - boolean, controls modal visibility
 *   onClose    - callback when the modal should close
 *   type       - 'daily-summary' | 'streak' | 'workout-complete' | 'weight-milestone' | 'achievement'
 *   data       - object with type-specific fields
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ReAnimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { X, Share2, Download, Image as ImageIcon } from 'lucide-react-native';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import {
  ShareCardContent,
  shareCard,
  saveCardImage,
  SHARE_CARD_WIDTH,
} from '../services/shareCardService';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Card type display names
const CARD_TYPE_LABELS = {
  'daily-summary': 'Daily Summary',
  'streak': 'Streak',
  'workout-complete': 'Workout Complete',
  'weight-milestone': 'Weight Milestone',
  'achievement': 'Achievement',
};

export default function ShareCardModal({ visible, onClose, type = 'daily-summary', data = {} }) {
  const cardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Share to native share sheet ---
  const handleShare = useCallback(async () => {
    if (isSharing || !cardRef.current) return;

    setIsSharing(true);
    try {
      await hapticSuccess();
      // Small delay to ensure the view is fully rendered
      await new Promise((r) => setTimeout(r, 150));

      const result = await shareCard(cardRef, type, data);

      if (result.success) {
        // Optionally close after successful share
        // onClose?.();
      } else {
        Alert.alert(
          'Sharing Unavailable',
          'Could not share on this device. Try again later.'
        );
      }
    } catch (error) {
      if (__DEV__) console.error('Share error:', error);
      Alert.alert('Error', 'Something went wrong while sharing.');
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, type, data]);

  // --- Save image to device ---
  const handleSave = useCallback(async () => {
    if (isSaving || !cardRef.current) return;

    setIsSaving(true);
    try {
      await hapticLight();
      await new Promise((r) => setTimeout(r, 150));

      const result = await saveCardImage(cardRef);

      if (result.success) {
        await hapticSuccess();
        Alert.alert('Saved!', 'Your share card has been saved.');
      } else {
        Alert.alert('Error', 'Could not save the image.');
      }
    } catch (error) {
      if (__DEV__) console.error('Save error:', error);
      Alert.alert('Error', 'Something went wrong while saving.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  // --- Close with haptic ---
  const handleClose = useCallback(async () => {
    await hapticLight();
    onClose?.();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Blurred overlay */}
      <View style={styles.overlay} accessibilityViewIsModal={true} accessibilityLabel="Share achievement card">
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
        )}

        {/* Close button */}
        <ReAnimated.View entering={FadeInDown.delay(100).springify()} style={styles.closeContainer}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={22} color={Colors.text} strokeWidth={2.5} />
          </Pressable>
        </ReAnimated.View>

        {/* Card type label */}
        <ReAnimated.View entering={FadeInDown.delay(50).springify()} style={styles.typeLabelContainer}>
          <Text style={styles.typeLabel}>
            {CARD_TYPE_LABELS[type] || 'Share Card'}
          </Text>
        </ReAnimated.View>

        {/* Card preview -- scrollable if card is tall */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <ReAnimated.View entering={FadeInUp.delay(100).springify().damping(14)}>
            {/* This View is captured as an image */}
            <View
              ref={cardRef}
              collapsable={false}
              style={styles.cardCapture}
            >
              <ShareCardContent type={type} data={data} />
            </View>
          </ReAnimated.View>
        </ScrollView>

        {/* Action buttons */}
        <ReAnimated.View entering={FadeInUp.delay(200).springify()} style={styles.actionsRow}>
          {/* Save button */}
          <Pressable
            style={[styles.secondaryButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <>
                <Download size={18} color={Colors.text} strokeWidth={2.5} />
                <Text style={styles.secondaryButtonText}>Save</Text>
              </>
            )}
          </Pressable>

          {/* Share button (primary) */}
          <Pressable
            style={[styles.primaryButton, isSharing && styles.disabledButton]}
            onPress={handleShare}
            disabled={isSharing}
          >
            <LinearGradient
              colors={['#00D4FF', '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Share2 size={18} color="#000" strokeWidth={2.5} />
                  <Text style={styles.primaryButtonText}>Share</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>
      </View>
    </Modal>
  );
}

// ================================================================
//  Styles
// ================================================================
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Close button
  closeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: Spacing.lg,
    zIndex: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Type label
  typeLabelContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 68 : 48,
    left: Spacing.lg,
    zIndex: 20,
  },
  typeLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // Scrollable card area
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 110 : 90,
    paddingBottom: 120,
    minHeight: SCREEN_HEIGHT - 100,
  },

  // Capture wrapper - must not clip for view-shot
  cardCapture: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    // Shadow for the preview card
    ...Shadows.cardElevated,
  },

  // Action buttons row
  actionsRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    zIndex: 20,
  },

  // Secondary (Save) button
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // Primary (Share) button
  primaryButton: {
    flex: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.glowPrimary,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
  },
  primaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#000',
  },

  // Disabled state
  disabledButton: {
    opacity: 0.5,
  },
});
