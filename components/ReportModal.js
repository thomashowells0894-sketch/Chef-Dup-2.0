/**
 * ReportModal - Content reporting modal with reason selection
 * Glass card styling matching the FuelIQ premium theme
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticLight } from '../lib/haptics';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'inappropriate', label: 'Inappropriate' },
  { key: 'misinformation', label: 'Misinformation' },
  { key: 'self_harm', label: 'Self Harm' },
  { key: 'other', label: 'Other' },
];

export default function ReportModal({ visible, onClose, onSubmit }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription] = useState('');

  const handleSelectReason = useCallback(async (reason) => {
    await hapticLight();
    setSelectedReason(reason);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;
    await hapticLight();
    onSubmit?.({ reason: selectedReason, description: description.trim() || undefined });
    setSelectedReason(null);
    setDescription('');
  }, [selectedReason, description, onSubmit]);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setDescription('');
    onClose?.();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.container}>
        <View style={styles.card} accessibilityViewIsModal={true} accessibilityLabel="Report content">
          {/* Handle */}
          <View style={styles.handle} />

          {/* Title */}
          <Text style={styles.title}>Report Content</Text>
          <Text style={styles.subtitle}>
            Why are you reporting this content? Our team will review your report.
          </Text>

          {/* Reason pills */}
          <ScrollView
            horizontal={false}
            showsVerticalScrollIndicator={false}
            style={styles.reasonsContainer}
          >
            <View style={styles.reasonsGrid}>
              {REPORT_REASONS.map((reason) => {
                const isActive = selectedReason === reason.key;
                return (
                  <Pressable
                    key={reason.key}
                    style={[styles.reasonPill, isActive && styles.reasonPillActive]}
                    onPress={() => handleSelectReason(reason.key)}
                  >
                    <Text style={[styles.reasonText, isActive && styles.reasonTextActive]}>
                      {reason.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Description */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="Additional details (optional)"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedReason}
            >
              <Text style={[styles.submitText, !selectedReason && styles.submitTextDisabled]}>
                Submit Report
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
    backgroundColor: Colors.overlay,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderLight,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  reasonsContainer: {
    maxHeight: 120,
    marginBottom: Spacing.md,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reasonPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonPillActive: {
    backgroundColor: Colors.errorSoft,
    borderColor: Colors.error + '50',
  },
  reasonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  reasonTextActive: {
    color: Colors.error,
    fontWeight: FontWeight.semibold,
  },
  descriptionInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 80,
    maxHeight: 120,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.surfaceElevated,
  },
  submitText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  submitTextDisabled: {
    color: Colors.textMuted,
  },
});
