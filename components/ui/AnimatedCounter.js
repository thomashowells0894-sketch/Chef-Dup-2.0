import React, { useEffect } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * AnimatedCounter
 *
 * Smoothly animates between numeric values using a rolling counter effect.
 * Built on react-native-reanimated for performant, UI-thread animations.
 */
function AnimatedCounter({
  value,
  duration = 600,
  style,
  prefix,
  suffix,
  decimals = 0,
  formatNumber = false,
  accessibilityLabel,
}) {
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, animatedValue]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';

    const factor = Math.pow(10, decimals);
    const rounded = Math.round(animatedValue.value * factor) / factor;

    let numericString = rounded.toFixed(decimals);

    if (formatNumber) {
      const parts = numericString.split('.');
      let integerPart = parts[0];
      const isNegative = integerPart.startsWith('-');

      if (isNegative) {
        integerPart = integerPart.slice(1);
      }

      let formatted = '';
      const len = integerPart.length;
      for (let i = 0; i < len; i++) {
        if (i > 0 && (len - i) % 3 === 0) {
          formatted += ',';
        }
        formatted += integerPart[i];
      }

      if (isNegative) {
        formatted = '-' + formatted;
      }

      numericString = parts.length > 1 ? formatted + '.' + parts[1] : formatted;
    }

    let text = numericString;

    if (prefix) {
      text = prefix + text;
    }

    if (suffix) {
      text = text + suffix;
    }

    return { text };
  });

  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      editable={false}
      defaultValue="0"
      underlineColorAndroid="transparent"
      style={[styles.text, style]}
      accessibilityRole="text"
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: '#FFFFFF',
    padding: 0,
  },
});

export { AnimatedCounter };
export default AnimatedCounter;
