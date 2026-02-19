import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Dimensions, TextInput, Modal, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ArrowLeft, Camera, Plus, CalendarDays, Scale, X, Check } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../context/ProfileContext';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { safeJSONParse, isValidArray } from '../lib/validation';

const STORAGE_KEY = '@vibefit_progress_photos';
const MAX_PHOTOS = 100;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProgressPhotosScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [photos, setPhotos] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [weightModal, setWeightModal] = useState(false);
  const [pendingUri, setPendingUri] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = safeJSONParse(stored, []);
        if (isValidArray(parsed)) {
          setPhotos(parsed);
        }
      }
    } catch (e) {
      /* silent */
    }
  }, []);

  const savePhotos = useCallback(async (updated) => {
    setPhotos(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      /* silent */
    }
  }, []);

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [photos]
  );

  const handleAddPhoto = useCallback(async () => {
    await hapticLight();
    Alert.alert('Add Progress Photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Camera access is required to take photos.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
            aspect: [3, 4],
          });
          if (!result.canceled && result.assets?.[0]) {
            setPendingUri(result.assets[0].uri);
            setWeightInput(profile.weight ? String(profile.weight) : '');
            setNoteInput('');
            setWeightModal(true);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Gallery access is required to choose photos.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsEditing: true,
            aspect: [3, 4],
          });
          if (!result.canceled && result.assets?.[0]) {
            setPendingUri(result.assets[0].uri);
            setWeightInput(profile.weight ? String(profile.weight) : '');
            setNoteInput('');
            setWeightModal(true);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [profile.weight]);

  const handleSavePhoto = useCallback(async () => {
    if (!pendingUri) return;
    const newPhoto = {
      id: Date.now().toString(),
      uri: pendingUri,
      date: new Date().toISOString(),
      weight: weightInput ? parseFloat(weightInput) : null,
      note: noteInput.trim() || '',
    };
    const updated = [...photos, newPhoto].slice(-MAX_PHOTOS);
    await savePhotos(updated);
    await hapticSuccess();
    setPendingUri(null);
    setWeightModal(false);
    setWeightInput('');
    setNoteInput('');
  }, [pendingUri, weightInput, noteInput, photos, savePhotos]);

  const handleDeletePhoto = useCallback(
    (photoId) => {
      Alert.alert('Delete Photo', 'Are you sure you want to delete this progress photo?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = photos.filter((p) => p.id !== photoId);
            await savePhotos(updated);
            setSelectedPhotos((prev) => prev.filter((id) => id !== photoId));
          },
        },
      ]);
    },
    [photos, savePhotos]
  );

  const handleToggleSelect = useCallback(
    (photoId) => {
      hapticLight();
      setSelectedPhotos((prev) => {
        if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
        if (prev.length >= 2) return [prev[1], photoId];
        return [...prev, photoId];
      });
    },
    []
  );

  const handleExitCompare = useCallback(() => {
    setCompareMode(false);
    setSelectedPhotos([]);
  }, []);

  const comparePhotos = useMemo(() => {
    if (selectedPhotos.length !== 2) return [];
    return selectedPhotos
      .map((id) => photos.find((p) => p.id === id))
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedPhotos, photos]);

  return (
    <ScreenWrapper>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Progress Photos</Text>
        <Pressable style={styles.addButton} onPress={handleAddPhoto}>
          <Plus size={22} color={Colors.background} />
        </Pressable>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compare Mode Side-by-Side */}
        {compareMode && comparePhotos.length === 2 && (
          <Animated.View entering={FadeInUp.springify().mass(0.5).damping(10)} style={styles.compareContainer}>
            <View style={styles.comparePair}>
              {comparePhotos.map((photo) => (
                <View key={photo.id} style={styles.compareItem}>
                  <Image source={{ uri: photo.uri }} style={styles.compareImage} contentFit="cover" />
                  <Text style={styles.compareDate}>{formatDate(photo.date)}</Text>
                  {photo.weight && (
                    <Text style={styles.compareWeight}>{photo.weight} lbs</Text>
                  )}
                </View>
              ))}
            </View>
            <Pressable style={styles.doneButton} onPress={handleExitCompare}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </Animated.View>
        )}

        {compareMode && selectedPhotos.length < 2 && (
          <Animated.View entering={FadeInUp.springify().mass(0.5).damping(10)} style={styles.selectHint}>
            <Text style={styles.selectHintText}>
              Select {2 - selectedPhotos.length} photo{selectedPhotos.length === 0 ? 's' : ''} to compare
            </Text>
          </Animated.View>
        )}

        {/* Compare Button */}
        {!compareMode && sortedPhotos.length >= 2 && (
          <Animated.View entering={FadeInDown.delay(50).springify().mass(0.5).damping(10)}>
            <Pressable
              style={styles.compareButton}
              onPress={() => {
                hapticLight();
                setCompareMode(true);
                setSelectedPhotos([]);
              }}
            >
              <CalendarDays size={18} color={Colors.primary} />
              <Text style={styles.compareButtonText}>Compare Photos</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Empty State */}
        {sortedPhotos.length === 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)} style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Camera size={48} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Progress Photos Yet</Text>
            <Text style={styles.emptySubtitle}>
              Take your first progress photo to start tracking your transformation
            </Text>
            <Pressable style={styles.emptyButton} onPress={handleAddPhoto}>
              <Plus size={18} color={Colors.background} />
              <Text style={styles.emptyButtonText}>Add Photo</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Photo Timeline */}
        {sortedPhotos.map((photo, index) => (
          <Animated.View
            key={photo.id}
            entering={FadeInDown.delay(100 + index * 60).springify().mass(0.5).damping(10)}
          >
            <Pressable
              style={[
                styles.photoCard,
                compareMode && selectedPhotos.includes(photo.id) && styles.photoCardSelected,
              ]}
              onLongPress={() => !compareMode && handleDeletePhoto(photo.id)}
              onPress={() => compareMode && handleToggleSelect(photo.id)}
            >
              <View style={styles.photoImageWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />
                {photo.weight && (
                  <View style={styles.weightBadge}>
                    <Scale size={12} color={Colors.text} />
                    <Text style={styles.weightBadgeText}>{photo.weight} lbs</Text>
                  </View>
                )}
                {compareMode && selectedPhotos.includes(photo.id) && (
                  <View style={styles.selectedOverlay}>
                    <Check size={28} color={Colors.text} />
                  </View>
                )}
              </View>
              <View style={styles.photoMeta}>
                <View style={styles.photoDateRow}>
                  <CalendarDays size={14} color={Colors.textSecondary} />
                  <Text style={styles.photoDate}>{formatDate(photo.date)}</Text>
                </View>
                {photo.note ? <Text style={styles.photoNote}>{photo.note}</Text> : null}
              </View>
            </Pressable>
          </Animated.View>
        ))}

        {compareMode && (
          <Pressable style={styles.cancelCompareButton} onPress={handleExitCompare}>
            <Text style={styles.cancelCompareText}>Cancel Compare</Text>
          </Pressable>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Weight / Note Modal */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['rgba(30,30,36,1)', 'rgba(22,22,26,1)']} style={styles.modalGradient}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Photo Details</Text>
                <Pressable onPress={() => { setWeightModal(false); setPendingUri(null); }}>
                  <X size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={styles.modalLabel}>Weight (optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="e.g. 175"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.modalLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputNote]}
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="e.g. End of cut, feeling lean"
                placeholderTextColor={Colors.textTertiary}
                multiline
                maxLength={120}
              />
              <Pressable style={styles.modalSaveButton} onPress={handleSavePhoto}>
                <Check size={20} color={Colors.background} />
                <Text style={styles.modalSaveText}>Save Photo</Text>
              </Pressable>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.button,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  // Compare button
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  compareButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  // Compare mode
  compareContainer: { marginBottom: Spacing.lg },
  comparePair: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  compareItem: {
    flex: 1,
    alignItems: 'center',
  },
  compareImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
  },
  compareDate: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  compareWeight: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  selectHint: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  selectHintText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
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
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.button,
  },
  emptyButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  // Photo cards
  photoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  photoImageWrapper: {
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  weightBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  weightBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 212, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoMeta: {
    padding: Spacing.md,
  },
  photoDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoDate: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  photoNote: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  cancelCompareButton: {
    alignItems: 'center',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelCompareText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  bottomSpacer: { height: 80 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalInputNote: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalSaveText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
});
