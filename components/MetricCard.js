/**
 * MetricCard - Premium metric display card with animation and trends
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight, Shadows } from '../constants/theme';

function MetricCard({ title, value, unit, subtitle, trend, trendValue, icon: Icon, iconColor, onPress, compact = false, accentColor }) {
  const color = accentColor || Colors.primary;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? Colors.success : trend === 'down' ? Colors.error : Colors.textTertiary;

  const content = (
    <LinearGradient
      colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <View style={styles.header}>
        {Icon && (
          <View style={[styles.iconContainer, { backgroundColor: (iconColor || color) + '20' }]}>
            <Icon size={compact ? 16 : 20} color={iconColor || color} />
          </View>
        )}
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>{title}</Text>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
          {value ?? '--'}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>

      {(subtitle || trendValue) && (
        <View style={styles.footer}>
          {trendValue && (
            <View style={styles.trendContainer}>
              <TrendIcon size={12} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
            </View>
          )}
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      )}
    </LinearGradient>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.touchable}>{content}</TouchableOpacity>;
  }
  return <View style={styles.touchable}>{content}</View>;
}

const styles = StyleSheet.create({
  touchable: { flex: 1 },
  card: { padding: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, ...Shadows.card, flex: 1 },
  cardCompact: { padding: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.xs },
  iconContainer: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1 },
  titleCompact: { fontSize: FontSize.xs },
  valueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  valueCompact: { fontSize: FontSize.xl },
  unit: { color: Colors.textTertiary, fontSize: FontSize.sm },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: Spacing.xs },
  trendContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  subtitle: { color: Colors.textTertiary, fontSize: FontSize.xs, flex: 1 },
});

export default memo(MetricCard);
