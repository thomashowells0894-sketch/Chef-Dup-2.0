import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Flame, TrendingDown } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Mock Data for Visualization
const weightData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [{ data: [180, 179.5, 179.2, 178.8, 179.0, 178.5, 178.2] }]
};

const calorieData = {
  labels: ["M", "T", "W", "T", "F", "S", "S"],
  datasets: [{ data: [2100, 2400, 1950, 2050, 2200, 2600, 1900] }]
};

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0a0a12']} style={styles.gradient} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Your 7-Day Performance</Text>
          </View>

          {/* Weight Chart */}
          <View style={styles.card}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <TrendingDown size={20} color="#00D4FF" />
                <Text style={styles.cardTitle}>Weight Trend</Text>
              </View>
              <LineChart
                data={weightData}
                width={SCREEN_WIDTH - 64}
                height={180}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 212, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#00D4FF" }
                }}
                bezier
                style={styles.chart}
              />
            </LinearGradient>
          </View>

          {/* Calorie Chart */}
          <View style={styles.card}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <Flame size={20} color="#FF9F43" />
                <Text style={styles.cardTitle}>Calorie Consistency</Text>
              </View>
              <BarChart
                data={calorieData}
                width={SCREEN_WIDTH - 64}
                height={180}
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 159, 67, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                style={styles.chart}
              />
            </LinearGradient>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>85%</Text>
              <Text style={styles.statLabel}>Consistency</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>-1.8</Text>
              <Text style={styles.statLabel}>Lbs Lost</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>12</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { ...StyleSheet.absoluteFillObject },
  scroll: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  card: { marginBottom: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardGradient: { padding: 20 },
  cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  chart: { paddingRight: 0, paddingLeft: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statVal: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 4 }
});
