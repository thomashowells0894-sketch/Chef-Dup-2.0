import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Watch,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  Link2,
  Unlink,
  Sparkles,
  Info,
  Heart,
  Footprints,
  Moon,
  Activity,
  Scale,
  Zap,
  Brain,
  Clock,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows, Gradients, Glass } from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { connectProvider, disconnectProvider, getConnections, syncProvider } from '../services/wearableIntegrations';

// ============================================================
// Wearable Provider Configuration
// ============================================================
const WEARABLE_PROVIDERS = [
  {
    id: 'fitbit',
    name: 'Fitbit',
    color: '#00B0B9',
    dataTypes: ['Steps', 'Heart Rate', 'Sleep', 'Weight'],
    description: 'Sync activity, heart rate, sleep stages, and weight data from your Fitbit device.',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    color: '#000000',
    dotBorder: true,
    dataTypes: ['Steps', 'Heart Rate', 'Sleep', 'Activities'],
    description: 'Import training data, heart rate, sleep analysis, and step count from Garmin Connect.',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    color: '#FF0000',
    dataTypes: ['Recovery', 'Strain', 'HRV', 'Sleep'],
    description: 'Access recovery scores, strain data, HRV trends, and sleep performance from WHOOP.',
  },
  {
    id: 'withings',
    name: 'Withings',
    color: '#00C4B3',
    dataTypes: ['Weight', 'Body Comp', 'Blood Pressure', 'Sleep'],
    description: 'Sync weight, body composition, blood pressure readings, and sleep data from Withings.',
  },
];

// ============================================================
// Helper: Format last synced time
// ============================================================
function formatLastSynced(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================
// Data Type Tag Component
// ============================================================
function DataTypeTag({ label, color }) {
  return (
    <View style={[styles.dataTag, { backgroundColor: color + '15' }]}>
      <Text style={[styles.dataTagText, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================
// Health Platform Card (Apple Health / Google Health Connect)
// ============================================================
function HealthPlatformCard({ delay }) {
  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect';
  const platformColor = Platform.OS === 'ios' ? '#FF2D55' : '#4285F4';

  return (
    <ReAnimated.View entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}>
      <View style={styles.platformCard}>
        <LinearGradient
          colors={[platformColor + '15', platformColor + '05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.platformGradient}
        >
          <View style={styles.platformHeader}>
            <View style={styles.platformLeft}>
              <View style={[styles.platformIconWrap, { backgroundColor: platformColor + '20' }]}>
                {Platform.OS === 'ios' ? (
                  <Heart size={20} color={platformColor} fill={platformColor} />
                ) : (
                  <Heart size={20} color={platformColor} />
                )}
              </View>
              <View style={styles.platformInfo}>
                <Text style={styles.platformName}>{platformName}</Text>
                <Text style={styles.platformSubtitle}>Native health data platform</Text>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedBadgeText}>Connected</Text>
            </View>
          </View>
          <View style={styles.platformDataRow}>
            <DataTypeTag label="Steps" color={platformColor} />
            <DataTypeTag label="Heart Rate" color={platformColor} />
            <DataTypeTag label="Sleep" color={platformColor} />
            <DataTypeTag label="Workouts" color={platformColor} />
          </View>
          <View style={styles.platformFooter}>
            <Smartphone size={12} color={Colors.textTertiary} />
            <Text style={styles.platformFooterText}>
              Automatically synced via {Platform.OS === 'ios' ? 'HealthKit' : 'Health Connect API'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Wearable Device Card
// ============================================================
function WearableCard({ provider, isConnected, lastSynced, isSyncing, onConnect, onDisconnect, onSync, delay }) {
  const { id, name, color, dotBorder, dataTypes, description } = provider;
  const synced = formatLastSynced(lastSynced);

  const handlePress = useCallback(async () => {
    if (isConnected) {
      Alert.alert(
        `Disconnect ${name}`,
        `Are you sure you want to disconnect your ${name} account? You can reconnect at any time.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              await hapticLight();
              onDisconnect(id);
            },
          },
        ]
      );
    } else {
      await hapticLight();
      onConnect(id);
    }
  }, [isConnected, id, name, onConnect, onDisconnect]);

  const handleSync = useCallback(async () => {
    await hapticLight();
    onSync(id);
  }, [id, onSync]);

  return (
    <ReAnimated.View entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}>
      <View style={[styles.wearableCard, isConnected && { borderColor: color + '30' }]}>
        {/* Card Header */}
        <View style={styles.wearableHeader}>
          <View style={styles.wearableLeft}>
            <View
              style={[
                styles.providerDot,
                { backgroundColor: color },
                dotBorder && styles.providerDotBorder,
              ]}
            />
            <Text style={styles.wearableName}>{name}</Text>
          </View>
          {isConnected && (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.statusText}>Connected</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={styles.wearableDescription}>{description}</Text>

        {/* Data Type Tags */}
        <View style={styles.dataTagsRow}>
          {dataTypes.map((dt) => (
            <DataTypeTag key={dt} label={dt} color={color} />
          ))}
        </View>

        {/* Last Synced */}
        {isConnected && synced && (
          <View style={styles.lastSyncedRow}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={styles.lastSyncedText}>Last synced {synced}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.wearableActions}>
          {isConnected ? (
            <>
              {/* Sync Button */}
              <Pressable
                style={[styles.syncButton, { backgroundColor: color + '15' }]}
                onPress={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size={14} color={color} />
                ) : (
                  <RefreshCw size={14} color={color} />
                )}
                <Text style={[styles.syncButtonText, { color }]}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </Pressable>

              {/* Disconnect Button */}
              <Pressable style={styles.disconnectButton} onPress={handlePress}>
                <Unlink size={14} color={Colors.error} />
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.connectButtonWrap} onPress={handlePress}>
              <LinearGradient
                colors={[color, color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.connectButtonGradient}
              >
                <Link2 size={16} color="#FFFFFF" />
                <Text style={styles.connectButtonText}>Connect {name}</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// AI Enhancement Info Card
// ============================================================
function AIInfoCard({ delay }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}>
      <View style={styles.aiInfoCard}>
        <LinearGradient
          colors={Gradients.primarySoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiInfoGradient}
        >
          <View style={styles.aiInfoHeader}>
            <View style={styles.aiInfoIconWrap}>
              <Sparkles size={18} color={Colors.primary} />
            </View>
            <Text style={styles.aiInfoTitle}>AI-Enhanced Coaching</Text>
          </View>
          <Text style={styles.aiInfoBody}>
            Connecting your wearable devices allows our AI coach to analyze your recovery, strain,
            sleep quality, and activity patterns. The more data sources connected, the more
            personalized and accurate your recommendations become.
          </Text>
          <View style={styles.aiInfoBenefits}>
            <View style={styles.aiInfoBenefitRow}>
              <Brain size={14} color={Colors.primary} />
              <Text style={styles.aiInfoBenefitText}>Smarter workout intensity recommendations</Text>
            </View>
            <View style={styles.aiInfoBenefitRow}>
              <Activity size={14} color={Colors.primary} />
              <Text style={styles.aiInfoBenefitText}>Recovery-aware training adjustments</Text>
            </View>
            <View style={styles.aiInfoBenefitRow}>
              <Moon size={14} color={Colors.primary} />
              <Text style={styles.aiInfoBenefitText}>Sleep-optimized nutrition timing</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================
// Main Screen (Inner)
// ============================================================
function WearableConnectionsScreenInner() {
  const router = useRouter();
  const [connections, setConnections] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProviders, setSyncingProviders] = useState({});
  const [connectingProvider, setConnectingProvider] = useState(null);

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getConnections();
      setConnections(data || {});
    } catch (error) {
      // Silently handle - connections default to empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnect = useCallback(async (providerId) => {
    try {
      setConnectingProvider(providerId);
      const result = await connectProvider(providerId);
      if (result) {
        setConnections((prev) => ({
          ...prev,
          [providerId]: {
            connected: true,
            lastSynced: new Date().toISOString(),
          },
        }));
        await hapticSuccess();
        const providerName = WEARABLE_PROVIDERS.find((p) => p.id === providerId)?.name || providerId;
        Alert.alert('Connected', `${providerName} has been connected successfully. Your data will begin syncing shortly.`);
      }
    } catch (error) {
      Alert.alert('Connection Failed', 'Could not connect to this device. Please check your account and try again.');
    } finally {
      setConnectingProvider(null);
    }
  }, []);

  const handleDisconnect = useCallback(async (providerId) => {
    try {
      await disconnectProvider(providerId);
      setConnections((prev) => {
        const updated = { ...prev };
        delete updated[providerId];
        return updated;
      });
      await hapticLight();
    } catch (error) {
      Alert.alert('Error', 'Could not disconnect this device. Please try again.');
    }
  }, []);

  const handleSync = useCallback(async (providerId) => {
    try {
      setSyncingProviders((prev) => ({ ...prev, [providerId]: true }));
      await syncProvider(providerId);
      setConnections((prev) => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          lastSynced: new Date().toISOString(),
        },
      }));
      await hapticSuccess();
    } catch (error) {
      Alert.alert('Sync Failed', 'Could not sync data from this device. Please try again later.');
    } finally {
      setSyncingProviders((prev) => ({ ...prev, [providerId]: false }));
    }
  }, []);

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const connectedCount = Object.values(connections).filter((c) => c?.connected).length;

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Connected Devices</Text>
        </View>
        <View style={styles.headerRight}>
          <Watch size={22} color={Colors.primary} />
        </View>
      </ReAnimated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Summary */}
        <ReAnimated.View entering={FadeInDown.delay(50).springify().mass(0.5).damping(10)}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <Watch size={24} color={Colors.primary} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle}>
                {connectedCount + 1} {connectedCount + 1 === 1 ? 'Source' : 'Sources'} Connected
              </Text>
              <Text style={styles.summarySubtitle}>
                {connectedCount === 0
                  ? 'Connect a wearable to enhance your experience'
                  : 'Your health data is being synced and analyzed'}
              </Text>
            </View>
          </View>
        </ReAnimated.View>

        {/* Health Platform Section */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>Health Platform</Text>
        </ReAnimated.View>
        <HealthPlatformCard delay={120} />

        {/* Wearable Devices Section */}
        <ReAnimated.View entering={FadeInDown.delay(180).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>Wearable Devices</Text>
        </ReAnimated.View>

        {WEARABLE_PROVIDERS.map((provider, index) => {
          const conn = connections[provider.id];
          const isConnected = conn?.connected || false;
          const lastSynced = conn?.lastSynced || null;
          const isSyncing = syncingProviders[provider.id] || false;

          return (
            <WearableCard
              key={provider.id}
              provider={provider}
              isConnected={isConnected}
              lastSynced={lastSynced}
              isSyncing={isSyncing}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSync={handleSync}
              delay={220 + index * 60}
            />
          );
        })}

        {/* AI Enhancement Info Card */}
        <ReAnimated.View entering={FadeInDown.delay(480).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>Why Connect?</Text>
        </ReAnimated.View>
        <AIInfoCard delay={520} />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Section title
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Summary card
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glowPrimary,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summarySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  // Health Platform Card
  platformCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  platformGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  platformLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  platformIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformInfo: {
    gap: 2,
  },
  platformName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  platformSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  connectedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  platformDataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  platformFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  platformFooterText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    flex: 1,
  },

  // Data Type Tag
  dataTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  dataTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },

  // Wearable Card
  wearableCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  wearableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  wearableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  providerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  providerDotBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  wearableName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.success,
  },
  wearableDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  dataTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  lastSyncedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  lastSyncedText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Wearable Actions
  wearableActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  connectButtonWrap: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  connectButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
  },
  syncButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.errorSoft,
  },
  disconnectButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },

  // AI Info Card
  aiInfoCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  aiInfoGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  aiInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aiInfoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiInfoTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  aiInfoBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  aiInfoBenefits: {
    gap: Spacing.sm,
  },
  aiInfoBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  aiInfoBenefitText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
    flex: 1,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 120,
  },
});

// ============================================================
// Exported Screen with Error Boundary
// ============================================================
export default function WearableConnectionsScreen(props) {
  return (
    <ScreenErrorBoundary screenName="WearableConnectionsScreen">
      <WearableConnectionsScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}
