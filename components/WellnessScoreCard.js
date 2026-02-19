/**
 * WellnessScoreCard - Holistic wellness score display with radar chart
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight, Shadows, Gradients } from '../constants/theme';

function WellnessScoreCard({ score, dimensions, level, color, onPress }) {
  const radarData = useMemo(() => {
    if (!dimensions) return null;
    const keys = Object.keys(dimensions);
    const count = keys.length;
    const angleStep = (2 * Math.PI) / count;
    const size = 80;
    const center = 90;

    const points = keys.map((key, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const value = (dimensions[key].score / 100) * size;
      return {
        x: center + value * Math.cos(angle),
        y: center + value * Math.sin(angle),
        label: dimensions[key].label || key,
        score: dimensions[key].score,
      };
    });

    const maxPoints = keys.map((_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return { x: center + size * Math.cos(angle), y: center + size * Math.sin(angle) };
    });

    return { points, maxPoints, center, size };
  }, [dimensions]);

  const displayColor = color || Colors.primary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <LinearGradient colors={Gradients.card} style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Wellness Score</Text>
            <Text style={[styles.level, { color: displayColor }]}>{level || 'Getting Started'}</Text>
          </View>
          <View style={[styles.scoreBadge, { borderColor: displayColor + '40' }]}>
            <Text style={[styles.scoreText, { color: displayColor }]}>{score || 0}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>

        {radarData && (
          <View style={styles.radarContainer}>
            <Svg width={180} height={180}>
              {/* Background grid */}
              {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                <Polygon
                  key={i}
                  points={radarData.maxPoints.map(p => `${radarData.center + (p.x - radarData.center) * scale},${radarData.center + (p.y - radarData.center) * scale}`).join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
              ))}
              {/* Axis lines */}
              {radarData.maxPoints.map((p, i) => (
                <Line key={i} x1={radarData.center} y1={radarData.center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              ))}
              {/* Data polygon */}
              <Polygon
                points={radarData.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill={displayColor + '20'}
                stroke={displayColor}
                strokeWidth={2}
              />
              {/* Data points */}
              {radarData.points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3} fill={displayColor} />
              ))}
              {/* Labels */}
              {radarData.points.map((p, i) => {
                const angle = ((2 * Math.PI) / radarData.points.length) * i - Math.PI / 2;
                const labelRadius = radarData.size + 18;
                const lx = radarData.center + labelRadius * Math.cos(angle);
                const ly = radarData.center + labelRadius * Math.sin(angle);
                return (
                  <SvgText key={i} x={lx} y={ly} fontSize={8} fill={Colors.textTertiary} textAnchor="middle" alignmentBaseline="central">
                    {p.label}
                  </SvgText>
                );
              })}
            </Svg>
          </View>
        )}

        {/* Dimension bars */}
        {dimensions && (
          <View style={styles.dimensionList}>
            {Object.entries(dimensions).slice(0, 4).map(([key, dim]) => (
              <View key={key} style={styles.dimensionRow}>
                <Text style={styles.dimensionLabel}>{dim.label || key}</Text>
                <View style={styles.dimensionBarBg}>
                  <View style={[styles.dimensionBarFill, { width: `${dim.score}%`, backgroundColor: displayColor }]} />
                </View>
                <Text style={styles.dimensionScore}>{dim.score}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, ...Shadows.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  level: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 2 },
  scoreBadge: { borderWidth: 2, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, flexDirection: 'row', alignItems: 'baseline' },
  scoreText: { fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  scoreMax: { color: Colors.textTertiary, fontSize: FontSize.sm, marginLeft: 2 },
  radarContainer: { alignItems: 'center', marginVertical: Spacing.sm },
  dimensionList: { gap: Spacing.xs },
  dimensionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dimensionLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, width: 70 },
  dimensionBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  dimensionBarFill: { height: '100%', borderRadius: 2 },
  dimensionScore: { color: Colors.textTertiary, fontSize: FontSize.xs, width: 24, textAlign: 'right' },
});

export default memo(WellnessScoreCard);
