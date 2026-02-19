import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * AdaptiveBlur Component
 * Wraps expo-blur's BlurView with an Android fallback.
 * On iOS it uses BlurView; on Android it renders a multi-layer
 * gradient that approximates the blur effect.
 */
export function AdaptiveBlur({
  intensity = 80,
  tint = 'dark',
  style,
  children,
}) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFill, style]}
      >
        {children}
      </BlurView>
    );
  }

  // Android fallback: multi-layer gradient approximation for frosted glass effect
  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      {/* Layer 1: Base dark gradient (primary depth) */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.75)',
          'rgba(8,8,18,0.72)',
          'rgba(0,0,0,0.75)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 2: Secondary overlay gradient (color shift for depth) */}
      <LinearGradient
        colors={[
          'rgba(15,10,30,0.35)',
          'rgba(5,5,15,0.18)',
          'rgba(20,15,40,0.30)',
        ]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 3: Noise-like texture using subtle repeating pattern */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.02)',
          'rgba(200,200,220,0.04)',
          'rgba(255,255,255,0.01)',
          'rgba(210,210,230,0.03)',
          'rgba(255,255,255,0.02)',
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 4: Subtle light refraction */}
      <View style={styles.lightRefraction} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  lightRefraction: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

export default AdaptiveBlur;
