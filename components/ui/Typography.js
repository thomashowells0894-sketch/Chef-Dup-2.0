import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { FontSize, FontWeight, Colors } from '../../constants/theme';

export function H1({ children, style, ...props }) {
  return <Text style={[styles.h1, style]} {...props}>{children}</Text>;
}

export function H2({ children, style, ...props }) {
  return <Text style={[styles.h2, style]} {...props}>{children}</Text>;
}

export function H3({ children, style, ...props }) {
  return <Text style={[styles.h3, style]} {...props}>{children}</Text>;
}

export function Body({ children, style, color = 'primary', ...props }) {
  const colorStyle = color === 'secondary' ? styles.bodySecondary :
                     color === 'tertiary' ? styles.bodyTertiary : null;
  return <Text style={[styles.body, colorStyle, style]} {...props}>{children}</Text>;
}

export function Caption({ children, style, ...props }) {
  return <Text style={[styles.caption, style]} {...props}>{children}</Text>;
}

export function Label({ children, style, ...props }) {
  return <Text style={[styles.label, style]} {...props}>{children}</Text>;
}

export function Metric({ children, style, ...props }) {
  return <Text style={[styles.metric, style]} {...props}>{children}</Text>;
}

const styles = StyleSheet.create({
  h1: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  body: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    color: Colors.text,
    lineHeight: FontSize.md * 1.5,
  },
  bodySecondary: {
    color: Colors.textSecondary,
  },
  bodyTertiary: {
    color: Colors.textTertiary,
  },
  caption: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metric: {
    fontSize: FontSize.xxl + 4,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -1,
  },
});
