import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  ArrowLeft,
  Pill,
  TrendingUp,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Syringe,
  Heart,
  Utensils,
  Droplets,
  Brain,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import AnimatedProgressRing from '../components/AnimatedProgressRing';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';
import { hapticLight, hapticSuccess } from '../lib/haptics';

const STORAGE_KEY = '@vibefit_glp1';

const GLP1_MEDICATIONS = [
  { id: 'semaglutide_025', name: 'Semaglutide', brand: 'Ozempic / Wegovy', dose: '0.25mg', week: '1-4', color: '#00D4FF' },
  { id: 'semaglutide_05', name: 'Semaglutide', brand: 'Ozempic / Wegovy', dose: '0.5mg', week: '5-8', color: '#448AFF' },
  { id: 'semaglutide_1', name: 'Semaglutide', brand: 'Ozempic / Wegovy', dose: '1.0mg', week: '9-12', color: '#7B61FF' },
  { id: 'semaglutide_17', name: 'Semaglutide', brand: 'Wegovy', dose: '1.7mg', week: '13-16', color: '#BF5AF2' },
  { id: 'semaglutide_24', name: 'Semaglutide', brand: 'Wegovy', dose: '2.4mg', week: '17+', color: '#FF6B9D' },
  { id: 'tirzepatide_25', name: 'Tirzepatide', brand: 'Mounjaro / Zepbound', dose: '2.5mg', week: '1-4', color: '#00E676' },
  { id: 'tirzepatide_5', name: 'Tirzepatide', brand: 'Mounjaro / Zepbound', dose: '5mg', week: '5-8', color: '#00C853' },
  { id: 'tirzepatide_75', name: 'Tirzepatide', brand: 'Mounjaro / Zepbound', dose: '7.5mg', week: '9-12', color: '#FFB300' },
  { id: 'tirzepatide_10', name: 'Tirzepatide', brand: 'Mounjaro / Zepbound', dose: '10mg', week: '13-16', color: '#FF8F00' },
  { id: 'tirzepatide_125', name: 'Tirzepatide', brand: 'Mounjaro / Zepbound', dose: '12.5mg', week: '17-20', color: '#FF6B35' },
  { id: 'tirzepatide_15', name: 'Tirzepatide', brand: 'Mounjaro / Zepbound', dose: '15mg', week: '21+', color: '#FF453A' },
  { id: 'liraglutide', name: 'Liraglutide', brand: 'Saxenda', dose: '3.0mg', week: 'Maintenance', color: '#64D2FF' },
];

const SIDE_EFFECTS = [
  { id: 'nausea', label: 'Nausea', emoji: '🤢' },
  { id: 'vomiting', label: 'Vomiting', emoji: '🤮' },
  { id: 'diarrhea', label: 'Diarrhea', emoji: '💧' },
  { id: 'constipation', label: 'Constipation', emoji: '🧱' },
  { id: 'headache', label: 'Headache', emoji: '🤕' },
  { id: 'fatigue', label: 'Fatigue', emoji: '😴' },
  { id: 'dizziness', label: 'Dizziness', emoji: '💫' },
  { id: 'appetite_loss', label: 'Low Appetite', emoji: '🍽️' },
  { id: 'bloating', label: 'Bloating', emoji: '🎈' },
  { id: 'injection_site', label: 'Injection Pain', emoji: '💉' },
];

const NUTRITION_TIPS = [
  { icon: Heart, title: 'Prioritize Protein', desc: 'Aim for 1.2–1.6g per kg body weight (80–120g/day) to preserve muscle mass during rapid weight loss.', color: Colors.error },
  { icon: Utensils, title: 'Eat Slowly', desc: 'Small, frequent meals reduce nausea. Stop eating when comfortable — not full.', color: Colors.warning },
  { icon: Droplets, title: 'Stay Hydrated', desc: 'Drink 2–3L water daily. Dehydration worsens nausea and headaches.', color: Colors.primary },
  { icon: Brain, title: 'Nutrient Density', desc: 'With reduced appetite, every calorie counts. Choose nutrient-dense whole foods over processed.', color: Colors.success },
];

function SeverityPicker({ value, onChange }) {
  const levels = [1, 2, 3, 4, 5];
  return (
    <View style={styles.severityRow}>
      {levels.map((level) => (
        <Pressable
          key={level}
          onPress={() => { hapticLight(); onChange(level); }}
          style={[
            styles.severityDot,
            {
              backgroundColor: level <= value
                ? level <= 2 ? Colors.success : level <= 3 ? Colors.warning : Colors.error
                : Colors.surfaceElevated,
            },
          ]}
        >
          <Text style={[
            styles.severityDotText,
            level <= value && { color: '#fff' },
          ]}>
            {level}
          </Text>
        </Pressable>
      ))}
      <Text style={styles.severityLabel}>
        {value <= 2 ? 'Mild' : value <= 3 ? 'Moderate' : 'Severe'}
      </Text>
    </View>
  );
}

export default function GLP1SupportScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [data, setData] = useState({
    enabled: false,
    medicationId: null,
    startDate: null,
    doseHistory: [],
    sideEffectLogs: [],
    lastInjectionDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showMedPicker, setShowMedPicker] = useState(false);
  const [showSideEffects, setShowSideEffects] = useState(false);
  const [selectedEffects, setSelectedEffects] = useState([]);
  const [overallSeverity, setOverallSeverity] = useState(3);
  const [sideEffectNotes, setSideEffectNotes] = useState('');

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            setData(parsed);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (updated) => {
    setData(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage write failed
    }
  }, []);

  const currentMed = useMemo(() => {
    return GLP1_MEDICATIONS.find((m) => m.id === data.medicationId) || null;
  }, [data.medicationId]);

  const daysSinceStart = useMemo(() => {
    if (!data.startDate) return 0;
    const diff = Date.now() - new Date(data.startDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [data.startDate]);

  const weekNumber = useMemo(() => Math.ceil(daysSinceStart / 7) || 1, [daysSinceStart]);

  const daysSinceLastInjection = useMemo(() => {
    if (!data.lastInjectionDate) return null;
    const diff = Date.now() - new Date(data.lastInjectionDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [data.lastInjectionDate]);

  const recentSideEffects = useMemo(() => {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return (data.sideEffectLogs || []).filter(
      (log) => new Date(log.date).getTime() > twoWeeksAgo,
    );
  }, [data.sideEffectLogs]);

  const avgSeverity = useMemo(() => {
    if (recentSideEffects.length === 0) return 0;
    const total = recentSideEffects.reduce((sum, log) => sum + log.severity, 0);
    return Math.round((total / recentSideEffects.length) * 10) / 10;
  }, [recentSideEffects]);

  const handleSelectMedication = useCallback((med) => {
    hapticSuccess();
    const updated = {
      ...data,
      enabled: true,
      medicationId: med.id,
      startDate: data.startDate || new Date().toISOString(),
      doseHistory: [
        ...(data.doseHistory || []),
        { medicationId: med.id, dose: med.dose, date: new Date().toISOString() },
      ],
    };
    persist(updated);
    setShowMedPicker(false);
  }, [data, persist]);

  const handleLogInjection = useCallback(() => {
    hapticSuccess();
    const updated = {
      ...data,
      lastInjectionDate: new Date().toISOString(),
    };
    persist(updated);
  }, [data, persist]);

  const handleLogSideEffects = useCallback(() => {
    if (selectedEffects.length === 0) return;
    hapticSuccess();
    const log = {
      date: new Date().toISOString(),
      effects: selectedEffects,
      severity: overallSeverity,
      notes: sideEffectNotes,
    };
    const updated = {
      ...data,
      sideEffectLogs: [...(data.sideEffectLogs || []), log],
    };
    persist(updated);
    setShowSideEffects(false);
    setSelectedEffects([]);
    setOverallSeverity(3);
    setSideEffectNotes('');
    Alert.alert('Logged', 'Side effects recorded. This helps optimize your nutrition plan.');
  }, [data, persist, selectedEffects, overallSeverity, sideEffectNotes]);

  const handleDisable = useCallback(() => {
    Alert.alert(
      'Disable GLP-1 Tracking',
      'This will stop GLP-1 specific features. Your history will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => persist({ ...data, enabled: false }),
        },
      ],
    );
  }, [data, persist]);

  const proteinTarget = useMemo(() => {
    const weightKg = profile?.weight
      ? profile.weight_unit === 'lbs'
        ? profile.weight * 0.453592
        : profile.weight
      : 70;
    return Math.round(weightKg * 1.4); // 1.4g/kg — middle of 1.2-1.6 range
  }, [profile]);

  const toggleSideEffect = useCallback((effectId) => {
    hapticLight();
    setSelectedEffects((prev) =>
      prev.includes(effectId) ? prev.filter((e) => e !== effectId) : [...prev, effectId],
    );
  }, []);

  if (isLoading) return <ScreenWrapper><View /></ScreenWrapper>;

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>GLP-1 Support</Text>
          <View style={[styles.headerIcon, { backgroundColor: 'rgba(0, 212, 255, 0.15)' }]}>
            <Syringe size={20} color={Colors.primary} />
          </View>
        </Animated.View>

        {!data.enabled ? (
          /* Onboarding state */
          <Animated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
            <GlassCard style={styles.onboardCard}>
              <Text style={styles.onboardTitle}>GLP-1 Medication Support</Text>
              <Text style={styles.onboardDesc}>
                Taking Ozempic, Wegovy, Mounjaro, or Zepbound? VibeFit can optimize your nutrition for GLP-1 therapy — higher protein targets, easy-to-digest meal suggestions, side effect tracking, and dose titration monitoring.
              </Text>
              <Pressable
                style={styles.enableButton}
                onPress={() => setShowMedPicker(true)}
              >
                <Syringe size={18} color="#fff" />
                <Text style={styles.enableButtonText}>Enable GLP-1 Support</Text>
              </Pressable>
            </GlassCard>

            {/* Nutrition tips — always visible */}
            <Text style={styles.sectionTitle}>Nutrition on GLP-1</Text>
            {NUTRITION_TIPS.map((tip, i) => (
              <Animated.View key={tip.title} entering={FadeInDown.delay(160 + i * 60).springify().mass(0.5).damping(10)}>
                <GlassCard style={styles.tipCard}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.color + '22' }]}>
                    <tip.icon size={18} color={tip.color} />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDesc}>{tip.desc}</Text>
                  </View>
                </GlassCard>
              </Animated.View>
            ))}
          </Animated.View>
        ) : (
          /* Active GLP-1 tracking */
          <>
            {/* Current medication card */}
            <Animated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
              <GlassCard style={styles.medCard} variant="accent">
                <View style={styles.medHeader}>
                  <View>
                    <Text style={styles.medName}>{currentMed?.brand || 'GLP-1 Medication'}</Text>
                    <Text style={styles.medDose}>{currentMed?.dose || 'Select dose'}</Text>
                  </View>
                  <Pressable
                    style={styles.changeDoseBtn}
                    onPress={() => setShowMedPicker(true)}
                  >
                    <Text style={styles.changeDoseText}>Change Dose</Text>
                  </Pressable>
                </View>
                <View style={styles.medStatsRow}>
                  <View style={styles.medStat}>
                    <Text style={styles.medStatValue}>{weekNumber}</Text>
                    <Text style={styles.medStatLabel}>Week</Text>
                  </View>
                  <View style={styles.medStat}>
                    <Text style={styles.medStatValue}>{daysSinceStart}</Text>
                    <Text style={styles.medStatLabel}>Days</Text>
                  </View>
                  <View style={styles.medStat}>
                    <Text style={styles.medStatValue}>{(data.doseHistory || []).length}</Text>
                    <Text style={styles.medStatLabel}>Dose Changes</Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Injection tracker */}
            <Animated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}>
              <GlassCard style={styles.injectionCard}>
                <View style={styles.injectionRow}>
                  <View>
                    <Text style={styles.injectionTitle}>Last Injection</Text>
                    <Text style={styles.injectionSub}>
                      {daysSinceLastInjection !== null
                        ? daysSinceLastInjection === 0
                          ? 'Today'
                          : `${daysSinceLastInjection} day${daysSinceLastInjection !== 1 ? 's' : ''} ago`
                        : 'Not recorded'}
                    </Text>
                  </View>
                  <Pressable style={styles.logInjectionBtn} onPress={handleLogInjection}>
                    <Syringe size={16} color="#fff" />
                    <Text style={styles.logInjectionText}>Log Injection</Text>
                  </Pressable>
                </View>
                {daysSinceLastInjection !== null && daysSinceLastInjection >= 7 && (
                  <View style={styles.injectionWarning}>
                    <AlertCircle size={14} color={Colors.warning} />
                    <Text style={styles.injectionWarningText}>
                      It's been {daysSinceLastInjection} days — your weekly injection may be due.
                    </Text>
                  </View>
                )}
              </GlassCard>
            </Animated.View>

            {/* Protein target card */}
            <Animated.View entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}>
              <GlassCard style={styles.proteinCard} variant="success">
                <View style={styles.proteinRow}>
                  <AnimatedProgressRing
                    progress={75}
                    size={64}
                    strokeWidth={6}
                    color={Colors.success}
                    gradientEnd="#00C853"
                  >
                    <Text style={styles.proteinRingValue}>{proteinTarget}g</Text>
                  </AnimatedProgressRing>
                  <View style={styles.proteinInfo}>
                    <Text style={styles.proteinTitle}>Daily Protein Target</Text>
                    <Text style={styles.proteinDesc}>
                      GLP-1 adjusted: {proteinTarget}g/day (1.4g/kg) to preserve muscle during weight loss.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Side effect logging */}
            <Animated.View entering={FadeInDown.delay(320).springify().mass(0.5).damping(10)}>
              <Text style={styles.sectionTitle}>Side Effect Tracking</Text>

              {recentSideEffects.length > 0 && (
                <GlassCard style={styles.seSummaryCard}>
                  <View style={styles.seSummaryRow}>
                    <View style={styles.seStat}>
                      <Text style={styles.seStatValue}>{recentSideEffects.length}</Text>
                      <Text style={styles.seStatLabel}>Logs (14d)</Text>
                    </View>
                    <View style={styles.seStat}>
                      <Text style={[
                        styles.seStatValue,
                        { color: avgSeverity <= 2 ? Colors.success : avgSeverity <= 3 ? Colors.warning : Colors.error },
                      ]}>
                        {avgSeverity}
                      </Text>
                      <Text style={styles.seStatLabel}>Avg Severity</Text>
                    </View>
                    <View style={styles.seStat}>
                      <Text style={[
                        styles.seStatValue,
                        { color: avgSeverity <= 2 ? Colors.success : Colors.warning },
                      ]}>
                        {avgSeverity <= 2 ? 'Good' : avgSeverity <= 3 ? 'Moderate' : 'High'}
                      </Text>
                      <Text style={styles.seStatLabel}>Tolerance</Text>
                    </View>
                  </View>
                </GlassCard>
              )}

              {!showSideEffects ? (
                <Pressable
                  style={styles.logSideEffectBtn}
                  onPress={() => setShowSideEffects(true)}
                >
                  <AlertCircle size={18} color={Colors.warning} />
                  <Text style={styles.logSideEffectText}>Log Side Effects</Text>
                </Pressable>
              ) : (
                <GlassCard style={styles.seFormCard}>
                  <Text style={styles.seFormTitle}>How are you feeling?</Text>
                  <View style={styles.seGrid}>
                    {SIDE_EFFECTS.map((effect) => {
                      const selected = selectedEffects.includes(effect.id);
                      return (
                        <Pressable
                          key={effect.id}
                          style={[styles.seChip, selected && styles.seChipActive]}
                          onPress={() => toggleSideEffect(effect.id)}
                        >
                          <Text style={styles.seChipEmoji}>{effect.emoji}</Text>
                          <Text style={[styles.seChipLabel, selected && styles.seChipLabelActive]}>
                            {effect.label}
                          </Text>
                          {selected && <Check size={12} color={Colors.primary} />}
                        </Pressable>
                      );
                    })}
                  </View>

                  {selectedEffects.length > 0 && (
                    <>
                      <Text style={styles.seFormSubtitle}>Overall severity</Text>
                      <SeverityPicker value={overallSeverity} onChange={setOverallSeverity} />

                      <TextInput
                        style={styles.seNotesInput}
                        placeholder="Any additional notes..."
                        placeholderTextColor={Colors.textTertiary}
                        value={sideEffectNotes}
                        onChangeText={setSideEffectNotes}
                        multiline
                        maxLength={300}
                      />

                      <Pressable style={styles.seSubmitBtn} onPress={handleLogSideEffects}>
                        <Check size={18} color="#fff" />
                        <Text style={styles.seSubmitText}>Log Side Effects</Text>
                      </Pressable>
                    </>
                  )}

                  <Pressable
                    style={styles.seCancelBtn}
                    onPress={() => { setShowSideEffects(false); setSelectedEffects([]); }}
                  >
                    <Text style={styles.seCancelText}>Cancel</Text>
                  </Pressable>
                </GlassCard>
              )}
            </Animated.View>

            {/* Nutrition tips */}
            <Animated.View entering={FadeIn.delay(400)}>
              <Text style={styles.sectionTitle}>GLP-1 Nutrition Guide</Text>
              {NUTRITION_TIPS.map((tip) => (
                <GlassCard key={tip.title} style={styles.tipCard}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.color + '22' }]}>
                    <tip.icon size={18} color={tip.color} />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDesc}>{tip.desc}</Text>
                  </View>
                </GlassCard>
              ))}
            </Animated.View>

            {/* Disable */}
            <Animated.View entering={FadeIn.delay(500)}>
              <Pressable style={styles.disableBtn} onPress={handleDisable}>
                <Text style={styles.disableBtnText}>Disable GLP-1 Support</Text>
              </Pressable>
            </Animated.View>
          </>
        )}

        {/* Medication Picker Modal (inline) */}
        {showMedPicker && (
          <Animated.View entering={FadeInDown.springify().mass(0.5).damping(10)}>
            <GlassCard style={styles.medPickerCard}>
              <Text style={styles.medPickerTitle}>Select Your Medication & Dose</Text>
              <Text style={styles.medPickerSubtitle}>
                Choose your current dose. Update this when your doctor adjusts your titration.
              </Text>
              {GLP1_MEDICATIONS.map((med) => (
                <Pressable
                  key={med.id}
                  style={[
                    styles.medOption,
                    data.medicationId === med.id && styles.medOptionActive,
                  ]}
                  onPress={() => handleSelectMedication(med)}
                >
                  <View style={[styles.medDot, { backgroundColor: med.color }]} />
                  <View style={styles.medOptionInfo}>
                    <Text style={styles.medOptionName}>{med.brand}</Text>
                    <Text style={styles.medOptionDose}>
                      {med.dose} — Weeks {med.week}
                    </Text>
                  </View>
                  {data.medicationId === med.id && (
                    <Check size={18} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
              <Pressable
                style={styles.medPickerCancel}
                onPress={() => setShowMedPicker(false)}
              >
                <Text style={styles.medPickerCancelText}>Cancel</Text>
              </Pressable>
            </GlassCard>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // Onboard
  onboardCard: { marginBottom: Spacing.lg },
  onboardTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  onboardDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md + 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  enableButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  // Med card
  medCard: { marginBottom: Spacing.md },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  medName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  medDose: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  changeDoseBtn: {
    backgroundColor: Colors.surfaceGlassLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  changeDoseText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  medStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  medStat: { alignItems: 'center' },
  medStatValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  medStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Injection
  injectionCard: { marginBottom: Spacing.md },
  injectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  injectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  injectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logInjectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    borderRadius: BorderRadius.full,
  },
  logInjectionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  injectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warningSoft,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  injectionWarningText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
  },

  // Protein
  proteinCard: { marginBottom: Spacing.md },
  proteinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  proteinRingValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  proteinInfo: { flex: 1 },
  proteinTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  proteinDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Side effects summary
  seSummaryCard: { marginBottom: Spacing.sm },
  seSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  seStat: { alignItems: 'center' },
  seStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  seStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Log side effect button
  logSideEffectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningSoft,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.25)',
  },
  logSideEffectText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },

  // Side effect form
  seFormCard: { marginBottom: Spacing.md },
  seFormTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  seFormSubtitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  seGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  seChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  seChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.borderAccent,
  },
  seChipEmoji: { fontSize: 14 },
  seChipLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  seChipLabelActive: {
    color: Colors.primary,
  },

  // Severity
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  severityDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityDotText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
  },
  severityLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.xs,
  },

  seNotesInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    color: Colors.text,
    fontSize: FontSize.sm,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  seSubmitText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  seCancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  seCancelText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // Tips
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Med picker
  medPickerCard: { marginTop: Spacing.md },
  medPickerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  medPickerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  medOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  medOptionActive: {
    backgroundColor: Colors.primarySoft,
  },
  medDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  medOptionInfo: { flex: 1 },
  medOptionName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  medOptionDose: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  medPickerCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  medPickerCancelText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // Disable
  disableBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  disableBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  bottomSpacer: { height: 120 },
});
