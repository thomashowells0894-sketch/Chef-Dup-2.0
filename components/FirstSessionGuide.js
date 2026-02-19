import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Camera, Mic, Search, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticLight } from '../lib/haptics';

export default function FirstSessionGuide({ hasLoggedFirstFood, onDismiss }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (hasLoggedFirstFood || dismissed) return null;

  const handleAction = useCallback((action) => {
    hapticLight();
    switch (action) {
      case 'search':
        router.push({ pathname: '/(tabs)/add', params: { meal: 'breakfast' } });
        break;
      case 'camera':
        router.push({ pathname: '/(tabs)/add', params: { meal: 'breakfast', openCamera: 'true' } });
        break;
      case 'voice':
        router.push({ pathname: '/(tabs)/add', params: { meal: 'breakfast', openVoice: 'true' } });
        break;
    }
  }, [router]);

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(300)} exiting={FadeOutUp.duration(300)}>
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(0, 212, 255, 0.12)', 'rgba(168, 85, 247, 0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.header}>
            <Sparkles size={20} color={Colors.primary} />
            <Text style={styles.title}>Log your first meal!</Text>
          </View>
          <Text style={styles.subtitle}>
            Users who log their first meal in the first session are 4x more likely to reach their goals
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={() => handleAction('search')}>
              <Search size={18} color={Colors.primary} />
              <Text style={styles.actionText}>Search</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => handleAction('camera')}>
              <Camera size={18} color={Colors.secondary} />
              <Text style={styles.actionText}>Snap a photo</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => handleAction('voice')}>
              <Mic size={18} color={Colors.success} />
              <Text style={styles.actionText}>Say it</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </Pressable>
          </View>

          <Pressable onPress={() => { setDismissed(true); onDismiss?.(); }} style={styles.skipButton}>
            <Text style={styles.skipText}>I'll do this later</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.15)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: FontSize.sm * 1.5, marginBottom: Spacing.md },
  actions: { gap: Spacing.sm },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  skipButton: { alignItems: 'center', marginTop: Spacing.md },
  skipText: { fontSize: FontSize.sm, color: Colors.textTertiary },
});
