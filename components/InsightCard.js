/**
 * InsightCard - AI-powered insight display with action items
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lightbulb, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight } from '../constants/theme';

const TYPE_CONFIG = {
  success: { icon: CheckCircle, color: Colors.success, bgColor: 'rgba(0, 230, 118, 0.08)', borderColor: 'rgba(0, 230, 118, 0.2)' },
  warning: { icon: AlertTriangle, color: Colors.warning, bgColor: 'rgba(255, 179, 0, 0.08)', borderColor: 'rgba(255, 179, 0, 0.2)' },
  tip: { icon: Lightbulb, color: Colors.primary, bgColor: 'rgba(0, 212, 255, 0.08)', borderColor: 'rgba(0, 212, 255, 0.2)' },
  info: { icon: Lightbulb, color: '#BF5AF2', bgColor: 'rgba(191, 90, 242, 0.08)', borderColor: 'rgba(191, 90, 242, 0.2)' },
};

function InsightCard({ type = 'tip', emoji, title, body, actionLabel, onAction }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.tip;
  const Icon = config.icon;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
      <View style={styles.header}>
        <View style={styles.iconRow}>
          {emoji ? (
            <Text style={styles.emoji}>{emoji}</Text>
          ) : (
            <Icon size={18} color={config.color} />
          )}
          <Text style={[styles.title, { color: config.color }]}>{title}</Text>
        </View>
      </View>

      {body && <Text style={styles.body}>{body}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.7}>
          <Text style={[styles.actionText, { color: config.color }]}>{actionLabel}</Text>
          <ArrowRight size={14} color={config.color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  header: { marginBottom: Spacing.xs },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  emoji: { fontSize: 18 },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, flex: 1 },
  body: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xs },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  actionText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});

export default memo(InsightCard);
