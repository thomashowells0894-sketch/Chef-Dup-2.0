/**
 * ChallengeCard - Community challenge display with progress
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Clock, Zap, ChevronRight } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight, Shadows } from '../constants/theme';

function ChallengeCard({ challenge, onPress, onJoin, isJoined = false }) {
  const progress = challenge.percentComplete || 0;
  const daysLeft = challenge.endDate ? Math.max(0, Math.ceil((new Date(challenge.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']} style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{challenge.icon || '🏆'}</Text>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
            <Text style={styles.description} numberOfLines={1}>{challenge.description}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textTertiary} />
        </View>

        {/* Progress bar (only for joined challenges) */}
        {isJoined && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[Colors.primary, Colors.success]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.min(100, progress)}%` }]}
              />
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressText}>{challenge.progress || 0} / {challenge.goal} {challenge.unit}</Text>
              <Text style={[styles.progressPercent, { color: progress >= 100 ? Colors.success : Colors.primary }]}>{progress}%</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerStat}>
            <Users size={12} color={Colors.textTertiary} />
            <Text style={styles.footerText}>{challenge.participantCount || 0} joined</Text>
          </View>
          {daysLeft !== null && (
            <View style={styles.footerStat}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.footerText}>{daysLeft}d left</Text>
            </View>
          )}
          <View style={styles.footerStat}>
            <Zap size={12} color={Colors.gold} />
            <Text style={[styles.footerText, { color: Colors.gold }]}>+{challenge.rewardXP || 100} XP</Text>
          </View>

          {!isJoined && onJoin && (
            <TouchableOpacity style={styles.joinButton} onPress={() => onJoin(challenge.id)}>
              <Text style={styles.joinText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  icon: { fontSize: 28 },
  headerText: { flex: 1 },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  description: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
  progressSection: { marginBottom: Spacing.sm },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  progressPercent: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  footerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { color: Colors.textTertiary, fontSize: FontSize.xs },
  joinButton: { marginLeft: 'auto', backgroundColor: Colors.primary + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  joinText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});

export default memo(ChallengeCard);
