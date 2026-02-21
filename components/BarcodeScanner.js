import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Camera, FlashlightOff, Flashlight } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

export default function BarcodeScanner({ visible, onClose, onBarcodeScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const lastScannedRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      lastScannedRef.current = null;
    }
  }, [visible]);

  const handleBarcodeScanned = ({ type, data }) => {
    // Prevent duplicate scans
    if (scanned || lastScannedRef.current === data) return;

    lastScannedRef.current = data;
    setScanned(true);
    onBarcodeScanned(data);
  };

  const resetScanner = () => {
    setScanned(false);
    lastScannedRef.current = null;
  };

  // Permission not determined yet
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Checking camera permissions...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIcon}>
              <Camera size={48} color={Colors.textSecondary} />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              FuelIQ needs camera access to scan barcodes on food products.
            </Text>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code128',
              'code39',
              'code93',
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.overlayTop} />

          {/* Middle row with scan area */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Scanning line animation */}
              {!scanned && (
                <View style={styles.scanLine} />
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>

          {/* Bottom overlay */}
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              {scanned ? 'Processing...' : 'Align barcode within the frame'}
            </Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <Pressable style={styles.torchButton} onPress={() => setTorch(!torch)}>
            {torch ? (
              <Flashlight size={24} color={Colors.warning} />
            ) : (
              <FlashlightOff size={24} color={Colors.text} />
            )}
          </Pressable>
        </View>

        {/* Scanning indicator */}
        {scanned && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.scanningText}>Looking up product...</Text>
          </View>
        )}

        {/* Retry button (shown after scan) */}
        {scanned && (
          <Pressable style={styles.retryButton} onPress={resetScanner}>
            <Text style={styles.retryButtonText}>Scan Again</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  permissionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  cancelButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.6,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  instructionText: {
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  torchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: SCAN_AREA_SIZE * 0.4,
  },
  scanningText: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  retryButton: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
});
