import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  ShieldAlert,
  ArrowLeft,
  Plus,
  Check,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Zap,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';
import useAllergens, { COMMON_ALLERGENS } from '../hooks/useAllergens';

const SEVERITY_OPTIONS = [
  { value: 'mild', label: 'Mild', color: Colors.warning, bg: 'rgba(255, 179, 0, 0.15)' },
  { value: 'moderate', label: 'Moderate', color: Colors.secondary, bg: 'rgba(255, 107, 53, 0.15)' },
  { value: 'severe', label: 'Severe', color: Colors.error, bg: 'rgba(255, 82, 82, 0.15)' },
];

const SYMPTOM_OPTIONS = [
  'Bloating',
  'Cramps',
  'Hives',
  'Swelling',
  'Headache',
  'Nausea',
  'Diarrhea',
  'Breathing difficulty',
  'Other',
];

function getSeverityConfig(severity) {
  return SEVERITY_OPTIONS.find((s) => s.value === severity) || SEVERITY_OPTIONS[0];
}

function getReactionSeverityColor(level) {
  if (level >= 4) return Colors.error;
  if (level >= 3) return Colors.secondary;
  if (level >= 2) return Colors.warning;
  return Colors.textSecondary;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getHourFromDate(dateStr) {
  const d = new Date(dateStr);
  return d.getHours();
}

// Allergen Card Component
function AllergenCard({ allergen, onRemove, index }) {
  const config = getSeverityConfig(allergen.severity);

  const handleRemove = async () => {
    await hapticWarning();
    Alert.alert(
      'Remove Allergen',
      `Remove "${allergen.name}" from your allergens?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(allergen.id) },
      ]
    );
  };

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 60).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={[config.bg, 'rgba(255, 255, 255, 0.02)']}
        style={[styles.allergenCard, { borderColor: config.color + '30' }]}
      >
        <Text style={styles.allergenEmoji}>{allergen.emoji}</Text>
        <View style={styles.allergenInfo}>
          <Text style={styles.allergenName}>{allergen.name}</Text>
          <View style={[styles.severityBadge, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.severityBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          {allergen.notes ? (
            <Text style={styles.allergenNotes} numberOfLines={1}>{allergen.notes}</Text>
          ) : null}
        </View>
        <Pressable onPress={handleRemove} style={styles.removeButton}>
          <Trash2 size={16} color={Colors.textTertiary} />
        </Pressable>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// Reaction History Card
function ReactionCard({ reaction, index }) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = getReactionSeverityColor(reaction.severity);

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 50).springify().mass(0.5).damping(10)}>
      <Pressable onPress={() => setExpanded(!expanded)}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
          style={[styles.reactionCard, { borderColor: severityColor + '25' }]}
        >
          <View style={styles.reactionHeader}>
            <View style={styles.reactionHeaderLeft}>
              <View style={[styles.reactionSeverityDot, { backgroundColor: severityColor }]} />
              <View>
                <Text style={styles.reactionAllergen}>{reaction.allergen}</Text>
                <Text style={styles.reactionDate}>{formatDate(reaction.date)}</Text>
              </View>
            </View>
            <View style={styles.reactionHeaderRight}>
              <View style={[styles.reactionSeverityBadge, { backgroundColor: severityColor + '20' }]}>
                <Text style={[styles.reactionSeverityText, { color: severityColor }]}>
                  {reaction.severity}/5
                </Text>
              </View>
              {expanded ? (
                <ChevronUp size={16} color={Colors.textTertiary} />
              ) : (
                <ChevronDown size={16} color={Colors.textTertiary} />
              )}
            </View>
          </View>

          {reaction.food ? (
            <Text style={styles.reactionFood}>Triggered by: {reaction.food}</Text>
          ) : null}

          {expanded && (
            <View style={styles.reactionDetails}>
              {reaction.symptoms && reaction.symptoms.length > 0 && (
                <View style={styles.symptomsContainer}>
                  <Text style={styles.reactionDetailLabel}>Symptoms</Text>
                  <View style={styles.symptomTags}>
                    {reaction.symptoms.map((s, i) => (
                      <View key={i} style={styles.symptomTag}>
                        <Text style={styles.symptomTagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {reaction.notes ? (
                <View style={styles.reactionNotesContainer}>
                  <Text style={styles.reactionDetailLabel}>Notes</Text>
                  <Text style={styles.reactionNotesText}>{reaction.notes}</Text>
                </View>
              ) : null}
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </ReAnimated.View>
  );
}

// Insights Card Component
function InsightsCard({ reactions, allergens }) {
  const insights = useMemo(() => {
    if (reactions.length === 0) return null;

    // Most common trigger allergen
    const allergenCounts = {};
    reactions.forEach((r) => {
      allergenCounts[r.allergen] = (allergenCounts[r.allergen] || 0) + 1;
    });
    const topTrigger = Object.entries(allergenCounts).sort((a, b) => b[1] - a[1])[0];

    // Most reactive time of day
    const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    reactions.forEach((r) => {
      const h = getHourFromDate(r.date);
      if (h >= 5 && h < 12) hourCounts.morning++;
      else if (h >= 12 && h < 17) hourCounts.afternoon++;
      else if (h >= 17 && h < 21) hourCounts.evening++;
      else hourCounts.night++;
    });
    const topTime = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

    // Average severity
    const avgSeverity = reactions.reduce((sum, r) => sum + r.severity, 0) / reactions.length;

    // Recent trend (last 5 vs previous 5)
    let trend = 'stable';
    if (reactions.length >= 4) {
      const half = Math.floor(reactions.length / 2);
      const recentAvg = reactions.slice(0, half).reduce((s, r) => s + r.severity, 0) / half;
      const olderAvg = reactions.slice(half).reduce((s, r) => s + r.severity, 0) / (reactions.length - half);
      if (recentAvg > olderAvg + 0.3) trend = 'worsening';
      else if (recentAvg < olderAvg - 0.3) trend = 'improving';
    }

    return {
      topTrigger: topTrigger ? { name: topTrigger[0], count: topTrigger[1] } : null,
      topTime: topTime ? { period: topTime[0], count: topTime[1] } : null,
      avgSeverity: avgSeverity.toFixed(1),
      trend,
      totalReactions: reactions.length,
    };
  }, [reactions]);

  if (!insights) return null;

  const trendColor = insights.trend === 'improving' ? Colors.success : insights.trend === 'worsening' ? Colors.error : Colors.warning;
  const trendLabel = insights.trend === 'improving' ? 'Improving' : insights.trend === 'worsening' ? 'Worsening' : 'Stable';

  return (
    <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
      <LinearGradient
        colors={['rgba(0, 212, 255, 0.08)', 'rgba(0, 212, 255, 0.02)']}
        style={styles.insightsCard}
      >
        <View style={styles.insightsHeader}>
          <Zap size={18} color={Colors.primary} />
          <Text style={styles.insightsTitle}>Insights</Text>
          <View style={styles.insightsCountBadge}>
            <Text style={styles.insightsCountText}>{insights.totalReactions} reactions</Text>
          </View>
        </View>

        <View style={styles.insightsGrid}>
          {insights.topTrigger && (
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Top Trigger</Text>
              <Text style={styles.insightValue}>{insights.topTrigger.name}</Text>
              <Text style={styles.insightSub}>{insights.topTrigger.count} reactions</Text>
            </View>
          )}

          {insights.topTime && (
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Most Reactive</Text>
              <Text style={styles.insightValue}>
                {insights.topTime.period.charAt(0).toUpperCase() + insights.topTime.period.slice(1)}
              </Text>
              <Text style={styles.insightSub}>{insights.topTime.count} incidents</Text>
            </View>
          )}

          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Avg. Severity</Text>
            <Text style={[styles.insightValue, { color: getReactionSeverityColor(Math.round(parseFloat(insights.avgSeverity))) }]}>
              {insights.avgSeverity}/5
            </Text>
          </View>

          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Trend</Text>
            <Text style={[styles.insightValue, { color: trendColor }]}>{trendLabel}</Text>
          </View>
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
}

// Add Allergen Modal
function AddAllergenModal({ visible, onClose, onSave, existingNames }) {
  const [selectedCommon, setSelectedCommon] = useState(null);
  const [customName, setCustomName] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [notes, setNotes] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSelectedCommon(null);
      setCustomName('');
      setSeverity('mild');
      setNotes('');
      setShowCustom(false);
    }
  }, [visible]);

  const availableAllergens = useMemo(() => {
    const lowerExisting = existingNames.map((n) => n.toLowerCase());
    return COMMON_ALLERGENS.filter((c) => !lowerExisting.includes(c.name.toLowerCase()));
  }, [existingNames]);

  const handleSave = async () => {
    const name = showCustom ? customName.trim() : selectedCommon?.name;
    if (!name) {
      Alert.alert('Missing Name', 'Please select or enter an allergen name.');
      return;
    }
    if (existingNames.map((n) => n.toLowerCase()).includes(name.toLowerCase())) {
      Alert.alert('Already Added', 'This allergen is already in your list.');
      return;
    }
    await hapticSuccess();
    onSave({
      name,
      emoji: showCustom ? '\u26A0\uFE0F' : (selectedCommon?.emoji || '\u26A0\uFE0F'),
      severity,
      notes,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={Gradients.card}
              style={styles.modalGradient}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Allergen</Text>
                <Pressable onPress={onClose} style={styles.modalCloseButton}>
                  <X size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Toggle: Common vs Custom */}
                <View style={styles.toggleRow}>
                  <Pressable
                    style={[styles.toggleButton, !showCustom && styles.toggleButtonActive]}
                    onPress={() => { hapticLight(); setShowCustom(false); }}
                  >
                    <Text style={[styles.toggleButtonText, !showCustom && styles.toggleButtonTextActive]}>
                      Common
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.toggleButton, showCustom && styles.toggleButtonActive]}
                    onPress={() => { hapticLight(); setShowCustom(true); }}
                  >
                    <Text style={[styles.toggleButtonText, showCustom && styles.toggleButtonTextActive]}>
                      Custom
                    </Text>
                  </Pressable>
                </View>

                {/* Common Allergens Grid */}
                {!showCustom && (
                  <>
                    <Text style={styles.fieldLabel}>Select Allergen</Text>
                    <View style={styles.allergenGrid}>
                      {availableAllergens.map((item) => (
                        <Pressable
                          key={item.name}
                          style={[
                            styles.allergenGridItem,
                            selectedCommon?.name === item.name && styles.allergenGridItemSelected,
                          ]}
                          onPress={() => {
                            hapticLight();
                            setSelectedCommon(item);
                          }}
                        >
                          <Text style={styles.allergenGridEmoji}>{item.emoji}</Text>
                          <Text
                            style={[
                              styles.allergenGridName,
                              selectedCommon?.name === item.name && styles.allergenGridNameSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      ))}
                      {availableAllergens.length === 0 && (
                        <Text style={styles.noMoreText}>All common allergens have been added.</Text>
                      )}
                    </View>
                  </>
                )}

                {/* Custom Name Input */}
                {showCustom && (
                  <>
                    <Text style={styles.fieldLabel}>Allergen Name</Text>
                    <View style={styles.textInputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={customName}
                        onChangeText={setCustomName}
                        placeholder="e.g. Mustard, Celery..."
                        placeholderTextColor={Colors.textTertiary}
                        maxLength={40}
                      />
                    </View>
                  </>
                )}

                {/* Severity Selector */}
                <Text style={styles.fieldLabel}>Severity</Text>
                <View style={styles.severityRow}>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.severityOption,
                        severity === opt.value && { backgroundColor: opt.bg, borderColor: opt.color + '50' },
                      ]}
                      onPress={() => {
                        hapticLight();
                        setSeverity(opt.value);
                      }}
                    >
                      <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
                      <Text
                        style={[
                          styles.severityOptionText,
                          severity === opt.value && { color: opt.color },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Notes */}
                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Any additional details..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    maxLength={200}
                  />
                </View>
              </ScrollView>

              {/* Save Button */}
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={['#FF5252', '#FF1744']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <ShieldAlert size={20} color={Colors.text} />
                  <Text style={styles.saveButtonText}>Add Allergen</Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Log Reaction Modal
function LogReactionModal({ visible, onClose, onSave, allergenNames }) {
  const [selectedAllergen, setSelectedAllergen] = useState('');
  const [food, setFood] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [severity, setSeverity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showAllergenPicker, setShowAllergenPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSelectedAllergen(allergenNames.length > 0 ? allergenNames[0] : '');
      setFood('');
      setSymptoms([]);
      setSeverity(1);
      setNotes('');
      setShowAllergenPicker(false);
    }
  }, [visible, allergenNames]);

  const toggleSymptom = (symptom) => {
    hapticLight();
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSave = async () => {
    if (!selectedAllergen) {
      Alert.alert('Missing Allergen', 'Please select which allergen triggered the reaction.');
      return;
    }
    if (symptoms.length === 0) {
      Alert.alert('Missing Symptoms', 'Please select at least one symptom.');
      return;
    }
    await hapticSuccess();
    onSave({
      allergen: selectedAllergen,
      food: food.trim(),
      symptoms,
      severity,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={Gradients.card}
              style={styles.modalGradient}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log Reaction</Text>
                <Pressable onPress={onClose} style={styles.modalCloseButton}>
                  <X size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Allergen Picker */}
                <Text style={styles.fieldLabel}>Allergen</Text>
                <Pressable
                  style={styles.pickerButton}
                  onPress={() => setShowAllergenPicker(!showAllergenPicker)}
                >
                  <Text style={styles.pickerButtonText}>
                    {selectedAllergen || 'Select allergen...'}
                  </Text>
                  <ChevronDown
                    size={16}
                    color={Colors.textSecondary}
                    style={{ transform: [{ rotate: showAllergenPicker ? '180deg' : '0deg' }] }}
                  />
                </Pressable>
                {showAllergenPicker && (
                  <View style={styles.pickerDropdown}>
                    {allergenNames.map((name) => (
                      <Pressable
                        key={name}
                        style={[
                          styles.pickerOption,
                          selectedAllergen === name && styles.pickerOptionSelected,
                        ]}
                        onPress={() => {
                          hapticLight();
                          setSelectedAllergen(name);
                          setShowAllergenPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            selectedAllergen === name && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {name}
                        </Text>
                        {selectedAllergen === name && <Check size={16} color={Colors.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Food Input */}
                <Text style={styles.fieldLabel}>Food that triggered it</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={food}
                    onChangeText={setFood}
                    placeholder="e.g. Caesar salad, pizza..."
                    placeholderTextColor={Colors.textTertiary}
                    maxLength={100}
                  />
                </View>

                {/* Symptoms */}
                <Text style={styles.fieldLabel}>Symptoms</Text>
                <View style={styles.symptomGrid}>
                  {SYMPTOM_OPTIONS.map((symptom) => (
                    <Pressable
                      key={symptom}
                      style={[
                        styles.symptomChip,
                        symptoms.includes(symptom) && styles.symptomChipSelected,
                      ]}
                      onPress={() => toggleSymptom(symptom)}
                    >
                      {symptoms.includes(symptom) && (
                        <Check size={12} color={Colors.primary} strokeWidth={3} />
                      )}
                      <Text
                        style={[
                          styles.symptomChipText,
                          symptoms.includes(symptom) && styles.symptomChipTextSelected,
                        ]}
                      >
                        {symptom}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Severity Scale 1-5 */}
                <Text style={styles.fieldLabel}>Severity (1-5)</Text>
                <View style={styles.severityScaleRow}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Pressable
                      key={level}
                      style={[
                        styles.severityScaleItem,
                        severity >= level && {
                          backgroundColor: getReactionSeverityColor(level) + '30',
                          borderColor: getReactionSeverityColor(level) + '60',
                        },
                      ]}
                      onPress={() => {
                        hapticLight();
                        setSeverity(level);
                      }}
                    >
                      <Text
                        style={[
                          styles.severityScaleText,
                          severity >= level && { color: getReactionSeverityColor(level) },
                        ]}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.severityLabels}>
                  <Text style={styles.severityLabelText}>Mild</Text>
                  <Text style={styles.severityLabelText}>Severe</Text>
                </View>

                {/* Notes */}
                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="How long did it last? What helped?"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    maxLength={300}
                  />
                </View>
              </ScrollView>

              {/* Save Button */}
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={['#FF6B35', '#FF8F5A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <AlertTriangle size={20} color={Colors.background} />
                  <Text style={[styles.saveButtonText, { color: Colors.background }]}>Log Reaction</Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Main Allergens Screen
export default function AllergensScreen() {
  const {
    allergens,
    reactions,
    isLoading,
    addAllergen,
    removeAllergen,
    logReaction,
    getRecentReactions,
    getAllergenNames,
  } = useAllergens();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [reactionModalVisible, setReactionModalVisible] = useState(false);

  const allergenNames = useMemo(() => getAllergenNames(), [getAllergenNames]);
  const recentReactions = useMemo(() => getRecentReactions(20), [getRecentReactions]);

  const handleAddAllergen = useCallback(
    async (data) => {
      await addAllergen(data);
    },
    [addAllergen]
  );

  const handleRemoveAllergen = useCallback(
    async (id) => {
      await removeAllergen(id);
    },
    [removeAllergen]
  );

  const handleLogReaction = useCallback(
    async (data) => {
      await logReaction(data);
    },
    [logReaction]
  );

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading allergens...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
          style={styles.header}
        >
          <Pressable
            style={styles.backButton}
            onPress={async () => {
              await hapticLight();
              router.back();
            }}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <ShieldAlert size={22} color="#FF6B9D" />
          <Text style={styles.title}>Allergens</Text>
        </ReAnimated.View>

        {/* My Allergens Section */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>My Allergens</Text>
        </ReAnimated.View>

        {allergens.length === 0 ? (
          <ReAnimated.View entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{'\uD83D\uDEE1\uFE0F'}</Text>
              <Text style={styles.emptyTitle}>No Allergens Added</Text>
              <Text style={styles.emptySubtitle}>
                Add your food allergens and sensitivities to track reactions and stay safe
              </Text>
            </View>
          </ReAnimated.View>
        ) : (
          allergens.map((allergen, index) => (
            <AllergenCard
              key={allergen.id}
              allergen={allergen}
              onRemove={handleRemoveAllergen}
              index={index + 1}
            />
          ))
        )}

        {/* Add Allergen Button */}
        <ReAnimated.View
          entering={FadeInDown.delay(
            Math.min((allergens.length + 2) * 60, 500)
          ).springify().mass(0.5).damping(10)}
        >
          <Pressable
            style={styles.addButton}
            onPress={async () => {
              await hapticLight();
              setAddModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['rgba(255, 82, 82, 0.12)', 'rgba(255, 82, 82, 0.04)']}
              style={styles.addButtonGradient}
            >
              <View style={styles.addButtonIcon}>
                <Plus size={20} color="#FF6B9D" />
              </View>
              <Text style={[styles.addButtonText, { color: '#FF6B9D' }]}>Add Allergen</Text>
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>

        {/* Insights */}
        {reactions.length > 0 && (
          <InsightsCard reactions={reactions} allergens={allergens} />
        )}

        {/* Log Reaction Section */}
        <ReAnimated.View
          entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}
        >
          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Log a Reaction</Text>
          <Pressable
            style={[styles.addButton, { borderColor: Colors.secondary + '30' }]}
            onPress={async () => {
              if (allergens.length === 0) {
                Alert.alert(
                  'No Allergens',
                  'Add at least one allergen before logging a reaction.'
                );
                return;
              }
              await hapticLight();
              setReactionModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['rgba(255, 107, 53, 0.12)', 'rgba(255, 107, 53, 0.04)']}
              style={styles.addButtonGradient}
            >
              <View style={[styles.addButtonIcon, { backgroundColor: Colors.secondarySoft }]}>
                <AlertTriangle size={18} color={Colors.secondary} />
              </View>
              <Text style={[styles.addButtonText, { color: Colors.secondary }]}>
                Log New Reaction
              </Text>
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>

        {/* Reaction History */}
        {recentReactions.length > 0 && (
          <ReAnimated.View
            entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}
          >
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
              Reaction History
            </Text>
          </ReAnimated.View>
        )}

        {recentReactions.map((reaction, index) => (
          <ReactionCard
            key={reaction.id}
            reaction={reaction}
            index={index}
          />
        ))}

        {recentReactions.length === 0 && allergens.length > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(450).springify().mass(0.5).damping(10)}>
            <View style={styles.emptyReactionsState}>
              <Text style={styles.emptyReactionsText}>
                No reactions logged yet. Tap "Log New Reaction" when you experience one.
              </Text>
            </View>
          </ReAnimated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modals */}
      <AddAllergenModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddAllergen}
        existingNames={allergenNames}
      />

      <LogReactionModal
        visible={reactionModalVisible}
        onClose={() => setReactionModalVisible(false)}
        onSave={handleLogReaction}
        allergenNames={allergenNames}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Section
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Allergen Card
  allergenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  allergenEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  allergenInfo: {
    flex: 1,
  },
  allergenName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  severityBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  allergenNotes: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },

  // Reaction Card
  reactionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  reactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  reactionSeverityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reactionAllergen: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  reactionDate: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  reactionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reactionSeverityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  reactionSeverityText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  reactionFood: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  reactionDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  symptomsContainer: {
    marginBottom: Spacing.sm,
  },
  reactionDetailLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  symptomTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  symptomTag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  symptomTagText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  reactionNotesContainer: {
    marginTop: Spacing.sm,
  },
  reactionNotesText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  // Insights Card
  insightsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  insightsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  insightsCountBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  insightsCountText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  insightItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  insightLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  insightValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  insightSub: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  emptyReactionsState: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyReactionsText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  // Add Button
  addButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF6B9D30',
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  addButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  bottomSpacer: {
    height: 100,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  modalGradient: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 450,
    paddingHorizontal: Spacing.lg,
  },
  modalScrollContent: {
    paddingBottom: Spacing.md,
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary + '50',
  },
  toggleButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  toggleButtonTextActive: {
    color: Colors.primary,
  },

  // Allergen Grid
  allergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  allergenGridItem: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  allergenGridItemSelected: {
    borderColor: '#FF6B9D',
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
  },
  allergenGridEmoji: {
    fontSize: 26,
    marginBottom: Spacing.xs,
  },
  allergenGridName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  allergenGridNameSelected: {
    color: '#FF6B9D',
  },
  noMoreText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    width: '100%',
  },

  // Form Fields
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.sm + 2,
  },

  // Severity Row
  severityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  severityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  // Severity Scale
  severityScaleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  severityScaleItem: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  severityScaleText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  severityLabelText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Symptom Grid
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  symptomChipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary + '50',
  },
  symptomChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  symptomChipTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },

  // Picker
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerButtonText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerDropdown: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primarySoft,
  },
  pickerOptionText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Save Button
  saveButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glowError,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
});
