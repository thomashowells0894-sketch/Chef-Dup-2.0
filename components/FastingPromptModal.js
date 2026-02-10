import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Timer, Play, Square, X } from 'lucide-react-native';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useFasting } from '../context/FastingContext';

const FASTING_COLOR = '#FF9500';

export default function FastingPromptModal() {
  const { pendingPrompt, acceptPrompt, dismissPrompt, fastDuration } = useFasting();

  if (!pendingPrompt) return null;

  const handleAccept = async () => {
    await hapticSuccess();
    acceptPrompt();
  };

  const handleDismiss = async () => {
    await hapticLight();
    dismissPrompt();
  };

  const isStartPrompt = pendingPrompt.type === 'START_FAST';

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={handleDismiss}>
            <X size={20} color={Colors.textSecondary} />
          </Pressable>

          {/* Icon */}
          <View style={[styles.iconContainer, isStartPrompt && styles.iconContainerStart]}>
            {isStartPrompt ? (
              <Timer size={40} color={FASTING_COLOR} />
            ) : (
              <Play size={40} color={Colors.success} fill={Colors.success} />
            )}
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>{pendingPrompt.message}</Text>
          <Text style={styles.description}>{pendingPrompt.description}</Text>

          {/* Protocol info for start */}
          {isStartPrompt && (
            <View style={styles.protocolBadge}>
              <Text style={styles.protocolText}>
                {fastDuration}:{24 - fastDuration} Protocol
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.dismissButton} onPress={handleDismiss}>
              <Text style={styles.dismissButtonText}>Not Now</Text>
            </Pressable>
            <Pressable
              style={[styles.acceptButton, isStartPrompt && styles.acceptButtonStart]}
              onPress={handleAccept}
            >
              {isStartPrompt ? (
                <Play size={18} color={Colors.background} fill={Colors.background} />
              ) : (
                <Square size={18} color={Colors.background} fill={Colors.background} />
              )}
              <Text style={styles.acceptButtonText}>
                {isStartPrompt ? 'Start Fast' : 'End Fast'}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainerStart: {
    backgroundColor: FASTING_COLOR + '20',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  protocolBadge: {
    backgroundColor: FASTING_COLOR + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  protocolText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: FASTING_COLOR,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  dismissButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
  },
  acceptButtonStart: {
    backgroundColor: FASTING_COLOR,
  },
  acceptButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
});
