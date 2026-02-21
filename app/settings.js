import React, { useState, useEffect } from 'react';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Save, AlertCircle, Dumbbell, Utensils, Bell, Droplets, Timer, Flame, Download, FileText, Heart, Sun, Moon, Monitor, RotateCcw } from 'lucide-react-native';
import { useHealthKit } from '../hooks/useHealthKit';
import { getHealthPlatformName } from '../services/healthService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../context/NotificationContext';
import { useMeals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';
import { useGamification } from '../context/GamificationContext';
import { useTheme } from '../context/ThemeContext';
import { exportFoodDiaryCSV, exportWeeklySummaryPDF } from '../services/exportData';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { sanitizeText } from '../lib/validation';
import useTour from '../hooks/useTour';

function SettingsScreenInner() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { settings: notifSettings, updateSettings: updateNotifSettings, hasPermission } = useNotifications();
  const { dayData, weeklyData, weeklyStats, goals } = useMeals();
  const { profile } = useProfile();
  const { currentStreak } = useGamification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const { isConnected: healthConnected, steps: healthSteps, lastSynced: healthLastSynced, connect: healthConnect, disconnect: healthDisconnect } = useHealthKit();
  const { preference: themePreference, setTheme } = useTheme();
  const { resetTours } = useTour();

  const handleReplayTour = async () => {
    await resetTours();
    router.replace('/(tabs)');
  };

  const [injuries, setInjuries] = useState('');
  const [equipment, setEquipment] = useState('');
  const [diet, setDiet] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setInjuries(data.injuries || '');
      setEquipment(data.equipment || '');
      setDiet(data.dietary_preferences || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        injuries: sanitizeText(injuries, 500),
        equipment: sanitizeText(equipment, 500),
        dietary_preferences: sanitizeText(diet, 500),
      })
      .eq('user_id', user.id)
      .select();

    setSaving(false);
    if (!error) {
      Alert.alert('Success', 'AI Context Updated!');
    } else {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      await exportFoodDiaryCSV(dayData, { start, end });
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export your food diary. Please try again.');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      await exportWeeklySummaryPDF(
        {
          dailyData: weeklyData,
          stats: weeklyStats,
          streak: currentStreak,
          goals,
        },
        profile
      );
    } catch (error) {
      Alert.alert('Export Failed', 'Could not generate your weekly report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={Colors.text} size={FontSize.xl} />
        </Pressable>
        <Text style={styles.title}>AI Context</Text>
        <Pressable onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.primary} /> : <Save color={Colors.primary} size={FontSize.xl} />}
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Appearance — placed first so users can switch theme immediately */}
        <Text style={styles.sectionHeader}>Appearance</Text>
        <Text style={styles.description}>
          Choose your preferred appearance.
        </Text>

        <View style={styles.themeSelector}>
          {[
            { key: 'system', label: 'System', Icon: Monitor },
            { key: 'dark', label: 'Dark', Icon: Moon },
            { key: 'light', label: 'Light', Icon: Sun },
          ].map(({ key, label, Icon }) => {
            const isActive = themePreference === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.themeOption,
                  isActive && styles.themeOptionActive,
                ]}
                onPress={() => setTheme(key)}
              >
                <Icon
                  size={FontSize.lg}
                  color={isActive ? Colors.primary : Colors.textTertiary}
                />
                <Text
                  style={[
                    styles.themeOptionLabel,
                    isActive && styles.themeOptionLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>Train the AI</Text>
        <Text style={styles.description}>
          The AI Trainer will use this information to customize your workouts and meal plans.
        </Text>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <AlertCircle size={FontSize.md} color={Colors.error} />
            <Text style={styles.label}>Injuries & Limitations</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bad knees, Lower back pain..."
            placeholderTextColor={Colors.textTertiary}
            value={injuries}
            onChangeText={setInjuries}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Dumbbell size={FontSize.md} color={Colors.primary} />
            <Text style={styles.label}>Available Equipment</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dumbbells only, Full Gym, Bands..."
            placeholderTextColor={Colors.textTertiary}
            value={equipment}
            onChangeText={setEquipment}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Utensils size={FontSize.md} color={Colors.success} />
            <Text style={styles.label}>Dietary Restrictions</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vegan, Keto, No Dairy..."
            placeholderTextColor={Colors.textTertiary}
            value={diet}
            onChangeText={setDiet}
            multiline
            maxLength={500}
          />
        </View>

        {/* Notification Settings */}
        <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>Notifications</Text>
        <Text style={styles.description}>
          {hasPermission
            ? 'Choose which reminders help you stay on track.'
            : 'Enable notifications in your device settings to get reminders.'}
        </Text>

        <View style={styles.toggleGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.secondarySoft }]}>
                <Flame size={FontSize.md} color={Colors.secondary} />
              </View>
              <View>
                <Text style={styles.toggleLabel}>Meal Reminders</Text>
                <Text style={styles.toggleHint}>Breakfast, lunch & dinner</Text>
              </View>
            </View>
            <Switch
              value={notifSettings.mealReminders}
              onValueChange={(v) => updateNotifSettings({ mealReminders: v })}
              trackColor={{ false: Colors.inputBorder, true: Colors.primaryGlow }}
              thumbColor={notifSettings.mealReminders ? Colors.primary : Colors.textTertiary}
              disabled={!hasPermission}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.primarySoft }]}>
                <Droplets size={FontSize.md} color={Colors.carbs} />
              </View>
              <View>
                <Text style={styles.toggleLabel}>Water Reminders</Text>
                <Text style={styles.toggleHint}>Every 2 hours, 8am-10pm</Text>
              </View>
            </View>
            <Switch
              value={notifSettings.waterReminders}
              onValueChange={(v) => updateNotifSettings({ waterReminders: v })}
              trackColor={{ false: Colors.inputBorder, true: Colors.primaryGlow }}
              thumbColor={notifSettings.waterReminders ? Colors.primary : Colors.textTertiary}
              disabled={!hasPermission}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.successSoft }]}>
                <Timer size={FontSize.md} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.toggleLabel}>Fasting Alerts</Text>
                <Text style={styles.toggleHint}>Know when your fast is done</Text>
              </View>
            </View>
            <Switch
              value={notifSettings.fastingAlerts}
              onValueChange={(v) => updateNotifSettings({ fastingAlerts: v })}
              trackColor={{ false: Colors.inputBorder, true: Colors.primaryGlow }}
              thumbColor={notifSettings.fastingAlerts ? Colors.primary : Colors.textTertiary}
              disabled={!hasPermission}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.goldSoft }]}>
                <Bell size={FontSize.md} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.toggleLabel}>Streak Warnings</Text>
                <Text style={styles.toggleHint}>Alert at 9pm if you haven't logged</Text>
              </View>
            </View>
            <Switch
              value={notifSettings.streakWarnings}
              onValueChange={(v) => updateNotifSettings({ streakWarnings: v })}
              trackColor={{ false: Colors.inputBorder, true: Colors.primaryGlow }}
              thumbColor={notifSettings.streakWarnings ? Colors.primary : Colors.textTertiary}
              disabled={!hasPermission}
            />
          </View>
        </View>

        {/* Health Integration */}
        <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>Health Integration</Text>
        <Text style={styles.description}>
          Connect {getHealthPlatformName()} to sync steps, weight, and activity data.
        </Text>

        <View style={styles.toggleGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.successSoft }]}>
                <Heart size={FontSize.md} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{getHealthPlatformName()}</Text>
                <Text style={styles.toggleHint}>
                  {healthConnected
                    ? `${healthSteps.toLocaleString()} steps${healthLastSynced ? ' \u2022 Synced ' + new Date(healthLastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                    : 'Tap to connect'}
                </Text>
              </View>
            </View>
            <Switch
              value={healthConnected}
              onValueChange={(v) => {
                if (v) {
                  healthConnect();
                } else {
                  Alert.alert(
                    'Disconnect Health',
                    `Are you sure you want to disconnect ${getHealthPlatformName()}? Your synced data will be cleared.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Disconnect', style: 'destructive', onPress: () => healthDisconnect() },
                    ]
                  );
                }
              }}
              trackColor={{ false: Colors.inputBorder, true: Colors.successGlow }}
              thumbColor={healthConnected ? Colors.success : Colors.textTertiary}
            />
          </View>
        </View>

        {/* Export Data */}
        <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>Export Data</Text>
        <Text style={styles.description}>
          Download your tracking data for personal records or sharing with your coach.
        </Text>

        <View style={styles.toggleGroup}>
          <Pressable
            style={styles.toggleRow}
            onPress={handleExportCSV}
            disabled={exportingCSV}
          >
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.primarySoft }]}>
                <Download size={FontSize.md} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.toggleLabel}>Export Food Diary (CSV)</Text>
                <Text style={styles.toggleHint}>Last 30 days of meals</Text>
              </View>
            </View>
            {exportingCSV && <ActivityIndicator size="small" color={Colors.primary} />}
          </Pressable>

          <Pressable
            style={styles.toggleRow}
            onPress={handleExportPDF}
            disabled={exportingPDF}
          >
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.successSoft }]}>
                <FileText size={FontSize.md} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.toggleLabel}>Export Weekly Report (PDF)</Text>
                <Text style={styles.toggleHint}>Stats, charts & macro breakdown</Text>
              </View>
            </View>
            {exportingPDF && <ActivityIndicator size="small" color={Colors.success} />}
          </Pressable>
        </View>

        {/* Replay Feature Tour */}
        <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>App Tour</Text>
        <Text style={styles.description}>
          Revisit the guided tour to rediscover all FuelIQ features.
        </Text>

        <View style={styles.toggleGroup}>
          <Pressable style={styles.toggleRow} onPress={handleReplayTour}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: Colors.primarySoft }]}>
                <RotateCcw size={FontSize.md} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.toggleLabel}>Replay Feature Tour</Text>
                <Text style={styles.toggleHint}>Show the welcome walkthrough again</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Pressable style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  content: { padding: Spacing.lg },
  sectionHeader: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  description: { color: Colors.textSecondary, marginBottom: Spacing.xl },
  inputGroup: { marginBottom: Spacing.lg },
  labelRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'center' },
  label: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  input: { backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, minHeight: 60, borderWidth: 1, borderColor: Colors.inputBorder },
  toggleGroup: { gap: Spacing.xs, marginBottom: Spacing.sm },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, flex: 1 },
  toggleIcon: { width: 34, height: 34, borderRadius: BorderRadius.xs, justifyContent: 'center', alignItems: 'center' },
  toggleLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  toggleHint: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 1 },
  themeSelector: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  themeOption: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  themeOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  themeOptionLabel: { color: Colors.textTertiary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  themeOptionLabelActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  logoutBtn: { marginTop: Spacing.xxl, padding: Spacing.md, alignItems: 'center' },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});

export default function SettingsScreen(props) {
  return (
    <ScreenErrorBoundary screenName="SettingsScreen">
      <SettingsScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}
