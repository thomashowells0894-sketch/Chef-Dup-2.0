/**
 * HealthSyncStatus - Connection status indicator for health data integration
 *
 * Shows:
 * - Connected/disconnected state with colored dot
 * - Last sync time
 * - Data source (Apple Health / Google Fit / Simulated)
 * - Tap to re-sync or configure
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { RefreshCw, Wifi, WifiOff, Smartphone } from 'lucide-react-native';
import {
  getSyncStatus,
  getHealthPlatformName,
  getLastSyncTime,
  getDataSource,
  isNativeHealthAvailable,
} from '../services/healthService';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';
import { hapticLight } from '../lib/haptics';

export default function HealthSyncStatus({ onSync, onConfigure, compact = false, style }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await getSyncStatus();
        setSyncStatus(status);
        const lastSync = await getLastSyncTime();
        setLastSyncTime(lastSync);
      } catch {
        // Ignore
      }
    }
    loadStatus();

    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = syncStatus?.isConnected ?? false;
  const dataSource = syncStatus?.dataSource ?? 'simulated';
  const isNative = syncStatus?.isNativeAvailable ?? false;

  const sourceName = useMemo(() => {
    if (dataSource === 'apple_health') return 'Apple Health';
    if (dataSource === 'google_fit') return 'Google Fit';
    return 'Simulated';
  }, [dataSource]);

  const lastSyncText = useMemo(() => {
    if (!lastSyncTime) return null;
    const date = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [lastSyncTime]);

  const statusColor = isConnected
    ? (dataSource === 'simulated' ? Colors.warning : Colors.success)
    : Colors.error;

  const handlePress = useCallback(async () => {
    await hapticLight();

    if (!isConnected && onConfigure) {
      onConfigure();
      return;
    }

    if (onSync) {
      setIsSyncing(true);
      try {
        await onSync();
        const status = await getSyncStatus();
        setSyncStatus(status);
        const lastSync = await getLastSyncTime();
        setLastSyncTime(lastSync);
      } catch {
        // Ignore errors
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isConnected, onSync, onConfigure]);

  // Compact variant: just a small dot + text
  if (compact) {
    return (
      <Pressable
        style={[styles.compactContainer, style]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Health data ${isConnected ? 'connected' : 'disconnected'}. Source: ${sourceName}. ${lastSyncText ? `Last synced ${lastSyncText}` : 'Not synced'}`}
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.compactText} numberOfLines={1}>
          {isConnected ? sourceName : 'Disconnected'}
        </Text>
        {isSyncing && (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.compactSpinner} />
        )}
      </Pressable>
    );
  }

  // Full variant
  return (
    <Pressable
      style={[styles.container, style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Health sync status: ${isConnected ? 'Connected' : 'Disconnected'}. Source: ${sourceName}. Tap to ${isConnected ? 'sync' : 'connect'}.`}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconWrap, { backgroundColor: statusColor + '20' }]}>
          {isConnected ? (
            <Wifi size={16} color={statusColor} />
          ) : (
            <WifiOff size={16} color={statusColor} />
          )}
        </View>

        <View style={styles.textSection}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>

          <Text style={styles.sourceText} numberOfLines={1}>
            {sourceName}
            {dataSource === 'simulated' && isConnected && (
              <Text style={styles.simulatedBadge}> (Simulated Data)</Text>
            )}
          </Text>

          {lastSyncText && (
            <Text style={styles.syncTimeText}>
              Synced {lastSyncText}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <View style={styles.syncButton}>
            <RefreshCw size={14} color={Colors.primary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Full variant
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textSection: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  sourceText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  simulatedBadge: {
    color: Colors.warning,
    fontWeight: FontWeight.medium,
  },
  syncTimeText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  rightSection: {
    marginLeft: Spacing.sm,
  },
  syncButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
  },
  compactText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  compactSpinner: {
    marginLeft: 4,
  },
});
