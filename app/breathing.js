import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Square,
  Wind,
  Waves,
  Zap,
  Play,
  Pause,
  StopCircle,
  Flame,
  Clock,
  Activity,
  Award,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { useBreathing } from '../hooks/useBreathing';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Breathing techniques configuration
const TECHNIQUES = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal rhythm for calm focus',
    pattern: '4-4-4-4',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 4 },
      { name: 'Exhale', duration: 4 },
      { name: 'Hold', duration: 4 },
    ],
    icon: Square,
    color: '#00D4FF',
  },
  {
    id: '478',
    name: '4-7-8 Relaxation',
    description: 'Deep relaxation technique',
    pattern: '4-7-8',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 7 },
      { name: 'Exhale', duration: 8 },
    ],
    icon: Wind,
    color: '#A78BFA',
  },
  {
    id: 'deep',
    name: 'Deep Breathing',
    description: 'Simple and calming',
    pattern: '5-5',
    phases: [
      { name: 'Inhale', duration: 5 },
      { name: 'Exhale', duration: 5 },
    ],
    icon: Waves,
    color: '#00E676',
  },
  {
    id: 'energize',
    name: 'Energize',
    description: 'Quick energy boost',
    pattern: '2-1-2',
    phases: [
      { name: 'Inhale', duration: 2 },
      { name: 'Hold', duration: 1 },
      { name: 'Exhale', duration: 2 },
    ],
    icon: Zap,
    color: '#FF6B35',
  },
];

const DURATION_OPTIONS = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

// Circle size
const CIRCLE_SIZE = 200;

export default function BreathingScreen() {
  const router = useRouter();
  const {
    sessions,
    isLoading,
    addSession,
    getTodaySessions,
    getTotalMinutes,
    getStreak,
  } = useBreathing();

  // Selection state
  const [selectedTechnique, setSelectedTechnique] = useState(TECHNIQUES[0]);
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[1]); // 3 min default

  // Session state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseSecondsRemaining, setPhaseSecondsRemaining] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  // Refs for interval management
  const intervalRef = useRef(null);
  const phaseIndexRef = useRef(0);
  const phaseSecondsRef = useRef(0);
  const totalElapsedRef = useRef(0);
  const isPausedRef = useRef(false);

  // Animated values for the breathing circle
  const circleScale = useSharedValue(1);
  const circleOpacity = useSharedValue(0.6);
  const phaseTextOpacity = useSharedValue(1);

  // Stats
  const todaySessions = useMemo(() => getTodaySessions(), [getTodaySessions]);
  const todayCount = todaySessions.length;
  const totalMinutes = useMemo(() => getTotalMinutes(), [getTotalMinutes]);
  const streak = useMemo(() => getStreak(), [getStreak]);
  const todayMinutes = useMemo(() => {
    const totalSec = todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    return Math.round(totalSec / 60);
  }, [todaySessions]);

  // Total time remaining
  const totalTimeRemaining = selectedDuration.seconds - totalElapsed;

  // Current phase
  const currentPhase = selectedTechnique.phases[currentPhaseIndex] || selectedTechnique.phases[0];

  // Animate the breathing circle based on phase
  const animatePhase = useCallback((phase, duration) => {
    // Fade the phase text
    phaseTextOpacity.value = withTiming(0, { duration: 150 }, () => {
      phaseTextOpacity.value = withTiming(1, { duration: 150 });
    });

    const timingConfig = {
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
    };

    if (phase === 'Inhale') {
      circleScale.value = withTiming(1.5, timingConfig);
      circleOpacity.value = withTiming(1, timingConfig);
    } else if (phase === 'Exhale') {
      circleScale.value = withTiming(1.0, timingConfig);
      circleOpacity.value = withTiming(0.6, timingConfig);
    }
    // Hold phases keep current scale
  }, [circleScale, circleOpacity, phaseTextOpacity]);

  // Animated styles
  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const circleGlowStyle = useAnimatedStyle(() => ({
    opacity: circleOpacity.value,
  }));

  const phaseTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: phaseTextOpacity.value,
  }));

  // Start a new session
  const startSession = useCallback(async () => {
    await hapticLight();
    setIsActive(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setShowCompletion(false);
    setTotalElapsed(0);
    totalElapsedRef.current = 0;

    const firstPhase = selectedTechnique.phases[0];
    setCurrentPhaseIndex(0);
    phaseIndexRef.current = 0;
    setPhaseSecondsRemaining(firstPhase.duration);
    phaseSecondsRef.current = firstPhase.duration;

    // Trigger initial animation
    animatePhase(firstPhase.name, firstPhase.duration);

    // Start interval
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;

      totalElapsedRef.current += 1;
      setTotalElapsed(totalElapsedRef.current);

      // Check if session is complete
      if (totalElapsedRef.current >= selectedDuration.seconds) {
        clearInterval(intervalRef.current);
        return; // Session completion handled by effect
      }

      phaseSecondsRef.current -= 1;
      setPhaseSecondsRemaining(phaseSecondsRef.current);

      if (phaseSecondsRef.current <= 0) {
        // Move to next phase
        const nextIndex = (phaseIndexRef.current + 1) % selectedTechnique.phases.length;
        phaseIndexRef.current = nextIndex;
        setCurrentPhaseIndex(nextIndex);

        const nextPhase = selectedTechnique.phases[nextIndex];
        phaseSecondsRef.current = nextPhase.duration;
        setPhaseSecondsRemaining(nextPhase.duration);

        // Trigger animation for next phase
        animatePhase(nextPhase.name, nextPhase.duration);
      }
    }, 1000);
  }, [selectedTechnique, selectedDuration, animatePhase]);

  // Handle session completion
  useEffect(() => {
    if (isActive && !isPaused && totalElapsed >= selectedDuration.seconds) {
      completeSession();
    }
  }, [totalElapsed, isActive, isPaused, selectedDuration.seconds]);

  const completeSession = useCallback(async () => {
    clearInterval(intervalRef.current);
    setIsActive(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setShowCompletion(true);
    await hapticSuccess();

    // Reset circle
    circleScale.value = withTiming(1, { duration: 500 });
    circleOpacity.value = withTiming(0.6, { duration: 500 });

    // Log the session
    addSession(selectedTechnique.id, selectedDuration.seconds);
  }, [selectedTechnique, selectedDuration, addSession, circleScale, circleOpacity]);

  // Pause / Resume
  const togglePause = useCallback(async () => {
    await hapticLight();
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    isPausedRef.current = newPaused;

    if (!newPaused) {
      // Resuming - re-animate current phase
      const phase = selectedTechnique.phases[phaseIndexRef.current];
      animatePhase(phase.name, phaseSecondsRef.current);
    }
  }, [isPaused, selectedTechnique, animatePhase]);

  // Stop session
  const stopSession = useCallback(async () => {
    await hapticLight();
    clearInterval(intervalRef.current);
    setIsActive(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setCurrentPhaseIndex(0);
    phaseIndexRef.current = 0;
    setPhaseSecondsRemaining(0);
    phaseSecondsRef.current = 0;
    setTotalElapsed(0);
    totalElapsedRef.current = 0;

    // Reset circle
    circleScale.value = withTiming(1, { duration: 400 });
    circleOpacity.value = withTiming(0.6, { duration: 400 });
  }, [circleScale, circleOpacity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
    };
  }, []);

  // Format time mm:ss
  const formatTime = (seconds) => {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify().damping(12)} style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Breathe</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.todayBadge, { backgroundColor: selectedTechnique.color + '20' }]}>
            <Text style={[styles.todayBadgeText, { color: selectedTechnique.color }]}>
              {todayCount} today
            </Text>
          </View>
        </View>
      </ReAnimated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Technique Selector */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().damping(12)}>
          <Text style={styles.sectionTitle}>Technique</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.techniquesRow}
          >
            {TECHNIQUES.map((technique) => {
              const Icon = technique.icon;
              const isSelected = selectedTechnique.id === technique.id;
              return (
                <Pressable
                  key={technique.id}
                  style={[
                    styles.techniqueCard,
                    isSelected && { borderColor: technique.color + '60' },
                  ]}
                  onPress={async () => {
                    if (isActive) return;
                    await hapticLight();
                    setSelectedTechnique(technique);
                  }}
                  disabled={isActive}
                >
                  <LinearGradient
                    colors={
                      isSelected
                        ? [technique.color + '20', technique.color + '08']
                        : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
                    }
                    style={styles.techniqueCardGradient}
                  >
                    <View style={[styles.techniqueIconContainer, { backgroundColor: technique.color + '20' }]}>
                      <Icon size={20} color={technique.color} />
                    </View>
                    <Text style={[styles.techniqueName, isSelected && { color: technique.color }]}>
                      {technique.name}
                    </Text>
                    <Text style={styles.techniqueDescription}>{technique.description}</Text>
                    <View style={[styles.patternBadge, { backgroundColor: technique.color + '15' }]}>
                      <Text style={[styles.patternBadgeText, { color: technique.color }]}>
                        {technique.pattern}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>
        </ReAnimated.View>

        {/* Duration Selector */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().damping(12)}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((option) => {
              const isSelected = selectedDuration.seconds === option.seconds;
              return (
                <Pressable
                  key={option.seconds}
                  style={[
                    styles.durationPill,
                    isSelected && {
                      backgroundColor: selectedTechnique.color + '25',
                      borderColor: selectedTechnique.color + '50',
                    },
                  ]}
                  onPress={async () => {
                    if (isActive) return;
                    await hapticLight();
                    setSelectedDuration(option);
                  }}
                  disabled={isActive}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      isSelected && { color: selectedTechnique.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ReAnimated.View>

        {/* Animated Breathing Circle */}
        <ReAnimated.View entering={FadeInDown.delay(240).springify().damping(12)} style={styles.circleContainer}>
          {/* Outer glow ring */}
          <ReAnimated.View style={[styles.circleGlowOuter, circleAnimatedStyle, circleGlowStyle]}>
            <LinearGradient
              colors={[selectedTechnique.color + '30', selectedTechnique.color + '05']}
              style={styles.circleGlowGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </ReAnimated.View>

          {/* Main circle */}
          <ReAnimated.View style={[styles.circleOuter, circleAnimatedStyle]}>
            <LinearGradient
              colors={[selectedTechnique.color + '40', selectedTechnique.color + '15']}
              style={styles.circleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.circleInner, { shadowColor: selectedTechnique.color }]}>
                {/* Phase label */}
                <ReAnimated.View style={phaseTextAnimatedStyle}>
                  <Text style={[styles.phaseText, { color: selectedTechnique.color }]}>
                    {isActive ? currentPhase.name : 'Ready'}
                  </Text>
                </ReAnimated.View>

                {/* Phase seconds */}
                {isActive && (
                  <Text style={styles.phaseSeconds}>
                    {phaseSecondsRemaining}s
                  </Text>
                )}

                {/* Idle instruction */}
                {!isActive && !showCompletion && (
                  <Text style={styles.idleText}>Tap Start</Text>
                )}

                {/* Completion text */}
                {showCompletion && (
                  <View style={styles.completionInner}>
                    <Award size={28} color={Colors.gold} />
                    <Text style={styles.completionText}>Complete!</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </ReAnimated.View>

          {/* Session timer below circle */}
          {isActive && (
            <View style={styles.sessionTimerContainer}>
              <Text style={styles.sessionTimerLabel}>Remaining</Text>
              <Text style={[styles.sessionTimerText, { color: selectedTechnique.color }]}>
                {formatTime(totalTimeRemaining)}
              </Text>
            </View>
          )}

          {/* Completion celebration */}
          {showCompletion && (
            <View style={styles.completionBadgeContainer}>
              <View style={[styles.completionBadge, { backgroundColor: Colors.goldSoft }]}>
                <Text style={styles.completionBadgeText}>
                  +{Math.round(selectedDuration.seconds / 60) * 15} XP
                </Text>
              </View>
            </View>
          )}
        </ReAnimated.View>

        {/* Controls */}
        <ReAnimated.View entering={FadeInDown.delay(320).springify().damping(12)} style={styles.controlsRow}>
          {!isActive && !showCompletion && (
            <Pressable style={styles.startButton} onPress={startSession}>
              <LinearGradient
                colors={[selectedTechnique.color, selectedTechnique.color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                <Play size={24} color="#000" fill="#000" />
                <Text style={styles.startButtonText}>Start</Text>
              </LinearGradient>
            </Pressable>
          )}

          {isActive && (
            <>
              <Pressable style={styles.pauseButton} onPress={togglePause}>
                <LinearGradient
                  colors={[selectedTechnique.color, selectedTechnique.color + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pauseButtonGradient}
                >
                  {isPaused ? (
                    <>
                      <Play size={22} color="#000" fill="#000" />
                      <Text style={styles.pauseButtonText}>Resume</Text>
                    </>
                  ) : (
                    <>
                      <Pause size={22} color="#000" />
                      <Text style={styles.pauseButtonText}>Pause</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.stopButton} onPress={stopSession}>
                <View style={styles.stopButtonInner}>
                  <StopCircle size={20} color={Colors.textSecondary} />
                  <Text style={styles.stopButtonText}>Stop</Text>
                </View>
              </Pressable>
            </>
          )}

          {showCompletion && (
            <Pressable
              style={styles.startButton}
              onPress={async () => {
                await hapticLight();
                setShowCompletion(false);
              }}
            >
              <LinearGradient
                colors={[selectedTechnique.color, selectedTechnique.color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                <Play size={24} color="#000" fill="#000" />
                <Text style={styles.startButtonText}>Again</Text>
              </LinearGradient>
            </Pressable>
          )}
        </ReAnimated.View>

        {/* Session Stats Card */}
        <ReAnimated.View entering={FadeInDown.delay(400).springify().damping(12)}>
          <Text style={styles.sectionTitle}>Today's Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: selectedTechnique.color + '20' }]}>
                <Activity size={18} color={selectedTechnique.color} />
              </View>
              <Text style={styles.statValue}>{todayCount}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: Colors.primarySoft }]}>
                <Clock size={18} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{todayMinutes}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: Colors.warningSoft }]}>
                <Flame size={18} color={Colors.warning} />
              </View>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: Colors.successSoft }]}>
                <Award size={18} color={Colors.success} />
              </View>
              <Text style={styles.statValue}>{totalMinutes}</Text>
              <Text style={styles.statLabel}>All Time</Text>
            </View>
          </View>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Header
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  todayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  todayBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Section title
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Techniques
  techniquesRow: {
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  techniqueCard: {
    width: 150,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  techniqueCardGradient: {
    padding: Spacing.md,
    minHeight: 140,
  },
  techniqueIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  techniqueName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  techniqueDescription: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  patternBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  patternBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  durationPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  durationPillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  // Breathing Circle
  circleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    minHeight: 320,
    justifyContent: 'center',
  },
  circleGlowOuter: {
    position: 'absolute',
    width: CIRCLE_SIZE + 60,
    height: CIRCLE_SIZE + 60,
    borderRadius: (CIRCLE_SIZE + 60) / 2,
    overflow: 'hidden',
  },
  circleGlowGradient: {
    flex: 1,
    borderRadius: (CIRCLE_SIZE + 60) / 2,
  },
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
  },
  circleGradient: {
    flex: 1,
    borderRadius: CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  circleInner: {
    flex: 1,
    width: '100%',
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  phaseText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  phaseSeconds: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.heavy,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  idleText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  completionInner: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completionText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },

  // Session timer
  sessionTimerContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  sessionTimerLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionTimerText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },

  // Completion badge
  completionBadgeContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  completionBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  completionBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  startButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  startButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#000',
  },
  pauseButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  pauseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  pauseButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#000',
  },
  stopButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  stopButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stopButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 120,
  },
});
