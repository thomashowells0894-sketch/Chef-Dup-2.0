import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Users, TrendingUp, Award } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const STATS = [
  { icon: Users, value: '50K+', label: 'Active users' },
  { icon: TrendingUp, value: '2.1M', label: 'Meals logged' },
  { icon: Award, value: '89%', label: 'Hit their goals' },
];

export default function SocialProofBanner({ style }) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)} style={style}>
      <View style={styles.container}>
        {STATS.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <View key={stat.label} style={styles.stat}>
              <Icon size={16} color={Colors.primary} />
              <Text style={styles.value}>{stat.value}</Text>
              <Text style={styles.label}>{stat.label}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stat: { alignItems: 'center', gap: 4 },
  value: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  label: { fontSize: FontSize.xs, color: Colors.textTertiary },
});
