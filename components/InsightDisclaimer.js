import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Info } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

export default function InsightDisclaimer({ type = 'correlation', style }) {
  const [expanded, setExpanded] = React.useState(false);

  const messages = {
    correlation: {
      short: 'Correlation, not causation',
      long: 'This insight shows a statistical relationship in your data. It does not mean one thing caused the other. Many factors affect your health outcomes.',
    },
    prediction: {
      short: 'Estimate based on trends',
      long: 'This projection is based on your recent data trends and may not account for all variables. Actual results may vary significantly.',
    },
    benchmark: {
      short: 'Anonymous comparison',
      long: 'Benchmarks are based on anonymized, aggregated data from users with similar profiles. Individual circumstances vary widely.',
    },
  };

  const msg = messages[type] || messages.correlation;

  return (
    <Pressable onPress={() => setExpanded(!expanded)} style={[styles.container, style]}>
      <View style={styles.header}>
        <Info size={12} color={Colors.textTertiary} />
        <Text style={styles.shortText}>{msg.short}</Text>
      </View>
      {expanded && (
        <Text style={styles.longText}>{msg.long}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shortText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  longText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: FontSize.xs * 1.6,
    marginTop: Spacing.xs,
    paddingLeft: 16,
  },
});
