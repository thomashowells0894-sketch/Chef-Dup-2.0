import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
} from 'react-native';
import {
  Square,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

// Voice Recording Overlay Modal with animated waveform
const WAVE_BAR_COUNT = 12;
function VoiceRecordingModal({ visible, onStop }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: WAVE_BAR_COUNT }, () => new Animated.Value(0.3))
  ).current;
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!visible) {
      setSeconds(0);
      return;
    }

    // Pulse animation for red dot
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Staggered waveform bar animations — each bar bounces at different speed/phase
    const waveLoops = waveAnims.map((anim, i) => {
      const speed = 300 + (i % 3) * 150; // 300ms, 450ms, 600ms cycle
      const delay = i * 80; // stagger start
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 0.5 + Math.random() * 0.5, duration: speed, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15 + Math.random() * 0.25, duration: speed, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });

    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => {
      pulse.stop();
      waveLoops.forEach(l => l.stop());
      clearInterval(interval);
    };
  }, [visible]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStop}>
      <View style={styles.voiceOverlay}>
        <View style={styles.voiceRecordingCard} accessibilityViewIsModal={true} accessibilityLabel="Voice recording">
          <Animated.View style={[styles.voicePulseDot, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.voiceRedDot} />
          </Animated.View>
          <Text style={styles.voiceListeningText}>Listening...</Text>
          <Text style={styles.voiceTimerText}>{formatTime(seconds)}</Text>

          {/* Animated waveform bars */}
          <View style={styles.voiceWaveform}>
            {waveAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.voiceWaveBar,
                  {
                    transform: [{ scaleY: anim }],
                    opacity: Animated.add(0.4, Animated.multiply(anim, 0.6)),
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.voiceHintText}>Describe what you ate</Text>

          <Pressable style={styles.voiceStopButton} onPress={onStop}>
            <Square size={20} color={Colors.text} fill={Colors.text} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  voiceRecordingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '85%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  voicePulseDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  voiceRedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
  },
  voiceListeningText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  voiceTimerText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 48,
    marginBottom: Spacing.lg,
  },
  voiceWaveBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  voiceHintText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
  },
  voiceStopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});

export default VoiceRecordingModal;
