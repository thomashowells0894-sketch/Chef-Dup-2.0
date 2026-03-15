import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { File as ExpoFile } from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clipboard as ClipboardIcon,
  Upload,
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import { useMeals } from '../context/MealContext';
import { trackEvent } from '../lib/analytics';
import { parseMyFitnessPalCsv } from '../services/importMyFitnessPal';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

function getParamValue(param) {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}

function formatDateLabel(dateKey) {
  if (!dateKey) {
    return '';
  }

  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPickerCancelledError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('cancelled') || message.includes('canceled');
}

function getFileNameFromUri(uri) {
  if (!uri || typeof uri !== 'string') {
    return 'Selected CSV';
  }

  const segments = uri.split('/');
  const rawName = segments[segments.length - 1] || 'Selected CSV';

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function pickWebCsvFile() {
  const documentRef = globalThis.document;
  const windowRef = globalThis.window;

  if (Platform.OS !== 'web' || !documentRef || !windowRef) {
    throw new Error('Web file picking is unavailable on this device.');
  }

  return new Promise((resolve, reject) => {
    const input = documentRef.createElement('input');
    let settled = false;

    const cleanup = () => {
      input.removeEventListener('change', handleChange);
      input.removeEventListener('cancel', handleCancel);
      windowRef.removeEventListener('focus', handleFocus);
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    const finish = (callback) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    const handleCancel = () => {
      finish(() => reject(new Error('cancelled')));
    };

    const handleFocus = () => {
      windowRef.setTimeout(() => {
        if (!settled) {
          finish(() => reject(new Error('cancelled')));
        }
      }, 250);
    };

    const handleChange = async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(() => reject(new Error('cancelled')));
        return;
      }

      try {
        const text = await file.text();
        finish(() => resolve({
          text,
          name: file.name || 'Selected CSV',
          type: file.type || 'text/csv',
          size: file.size || 0,
        }));
      } catch (error) {
        finish(() => reject(error instanceof Error ? error : new Error('Could not read that CSV file.')));
      }
    };

    input.type = 'file';
    input.accept = '.csv,text/csv,text/plain';
    input.style.display = 'none';
    input.addEventListener('change', handleChange);
    input.addEventListener('cancel', handleCancel);
    windowRef.addEventListener('focus', handleFocus);
    documentRef.body.appendChild(input);
    input.click();
  });
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ImportMyFitnessPalScreenInner() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { importFoodDiary } = useMeals();
  const source = getParamValue(params.source) || 'settings';

  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [importInputMethod, setImportInputMethod] = useState('manual');
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExit = useCallback(() => {
    if (source === 'onboarding_completion') {
      router.replace({
        pathname: '/(tabs)/add',
        params: {
          focus: 'browse',
          source: 'onboarding_complete',
        },
      });
      return;
    }

    router.back();
  }, [router, source]);

  const handleOpenFoodLog = useCallback(() => {
    router.replace({
      pathname: '/(tabs)/add',
      params: {
        focus: 'recent',
        source: 'mfp_import_complete',
        importSource: source,
      },
    });
  }, [router, source]);

  const handleTextChange = useCallback((value) => {
    setCsvText(value);
    setPreview(null);
    setSelectedFileName('');
    setImportInputMethod('manual');
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    setIsPasting(true);
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (!clipboardText || !clipboardText.trim()) {
        Alert.alert('Clipboard Empty', 'Copy a MyFitnessPal CSV export first.');
        return;
      }

      setCsvText(clipboardText);
      setPreview(null);
      setSelectedFileName('');
      setImportInputMethod('clipboard');
    } catch (_error) {
      Alert.alert('Paste Failed', 'Could not read from the clipboard.');
    } finally {
      setIsPasting(false);
    }
  }, []);

  const previewCsvText = useCallback(async (text, inputMethod = importInputMethod) => {
    if (!text.trim()) {
      Alert.alert('Add CSV First', 'Choose a MyFitnessPal CSV file or paste the export text first.');
      return;
    }

    setIsPreviewing(true);
    try {
      const parsed = parseMyFitnessPalCsv(text);
      setPreview(parsed);
      trackEvent('conversion', 'mfp_import_previewed', {
        value: parsed.summary.entryCount,
        metadata: {
          source,
          inputMethod,
          dayCount: parsed.summary.dayCount,
          mealCount: parsed.summary.mealCount,
          skippedCount: parsed.summary.skippedCount,
        },
      });
      return parsed;
    } catch (error) {
      Alert.alert('Preview Failed', error instanceof Error ? error.message : 'Could not parse that CSV.');
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }, [importInputMethod, source]);

  const handlePreview = useCallback(async () => {
    await previewCsvText(csvText, importInputMethod);
  }, [csvText, importInputMethod, previewCsvText]);

  const handlePickFile = useCallback(async () => {
    setIsPickingFile(true);
    trackEvent('conversion', 'mfp_import_picker_opened', {
      metadata: {
        source,
      },
    });

    try {
      const pickedFile = Platform.OS === 'web'
        ? await pickWebCsvFile()
        : await (async () => {
          const pickedFileResult = await ExpoFile.pickFileAsync(undefined, 'text/*');
          const nativeFile = Array.isArray(pickedFileResult) ? pickedFileResult[0] : pickedFileResult;

          if (!nativeFile) {
            return null;
          }

          return {
            text: await nativeFile.text(),
            name: getFileNameFromUri(nativeFile.uri),
            type: nativeFile.type || 'unknown',
            size: nativeFile.size || 0,
          };
        })();

      if (!pickedFile) {
        return;
      }

      const fileText = pickedFile.text;
      if (!fileText || !fileText.trim()) {
        Alert.alert('Empty File', 'That file did not contain any CSV text to import.');
        return;
      }

      setSelectedFileName(pickedFile.name);
      setImportInputMethod('file');
      setCsvText(fileText);
      setPreview(null);

      trackEvent('conversion', 'mfp_import_file_selected', {
        metadata: {
          source,
          mimeType: pickedFile.type || 'unknown',
          size: pickedFile.size || 0,
        },
      });

      await previewCsvText(fileText, 'file');
    } catch (error) {
      if (isPickerCancelledError(error)) {
        return;
      }

      Alert.alert(
        'File Pick Failed',
        error instanceof Error ? error.message : 'Could not open that CSV file.'
      );
    } finally {
      setIsPickingFile(false);
    }
  }, [previewCsvText, source]);

  const handleImport = useCallback(async () => {
    let parsed = preview;

    if (!parsed) {
      try {
        parsed = parseMyFitnessPalCsv(csvText);
        setPreview(parsed);
      } catch (error) {
        Alert.alert('Import Failed', error instanceof Error ? error.message : 'Could not parse that CSV.');
        return;
      }
    }

    setIsImporting(true);
    trackEvent('conversion', 'mfp_import_started', {
      value: parsed.summary.entryCount,
      metadata: {
        source,
        inputMethod: importInputMethod,
        dayCount: parsed.summary.dayCount,
        mealCount: parsed.summary.mealCount,
        skippedCount: parsed.summary.skippedCount,
      },
    });

    try {
      const result = await importFoodDiary(parsed.entries);

      trackEvent('conversion', 'mfp_import_completed', {
        value: result.importedCount,
        metadata: {
          source,
          inputMethod: importInputMethod,
          detectedEntries: parsed.summary.entryCount,
          dayCount: result.dateCount,
          skippedCount: result.skippedCount,
        },
      });

      const successButtons = [
        {
          text: result.importedCount > 0 ? 'Open Food Log' : 'View Recent Meals',
          onPress: handleOpenFoodLog,
        },
      ];

      if (source === 'settings') {
        successButtons.unshift({
          text: 'Later',
          style: 'cancel',
          onPress: handleExit,
        });
      }

      Alert.alert(
        result.importedCount > 0 ? 'Import Complete' : 'Nothing New Imported',
        result.importedCount > 0
          ? `Imported ${result.importedCount} meal entries across ${result.dateCount} day${result.dateCount === 1 ? '' : 's'}. Your recent meals are ready to log again.`
          : 'Those meal entries already exist in your FuelIQ diary. Your recent meals and frequent foods were refreshed, so you can jump straight into logging.',
        successButtons
      );
    } catch (error) {
      trackEvent('error', 'mfp_import_failed', {
        metadata: {
          source,
          inputMethod: importInputMethod,
          detectedEntries: parsed.summary.entryCount,
          message: error instanceof Error ? error.message : 'unknown_error',
        },
      });

      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Could not import that diary export.'
      );
    } finally {
      setIsImporting(false);
    }
  }, [csvText, handleExit, handleOpenFoodLog, importFoodDiary, importInputMethod, preview, source]);

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={handleExit} style={styles.backBtn}>
            <ChevronLeft color={Colors.text} size={FontSize.xl} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Import MyFitnessPal</Text>
            <Text style={styles.subtitle}>Bring over a food diary CSV export.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Info size={FontSize.lg} color={Colors.warning} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>First pass scope</Text>
              <Text style={styles.infoText}>
                Choose a MyFitnessPal diary CSV from Files or paste it in manually. This import currently brings over food diary meals, calories, and macros. Recipes and weight history are not included yet.
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.filePickerButton, (isPickingFile || isImporting) && styles.disabledButton]}
            onPress={handlePickFile}
            disabled={isPickingFile || isImporting}
          >
            {isPickingFile ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <>
                <Upload size={FontSize.lg} color={Colors.text} />
                <View style={styles.filePickerCopy}>
                  <Text style={styles.filePickerTitle}>Choose CSV file</Text>
                  <Text style={styles.filePickerHint}>
                    Open the MyFitnessPal export from Files, Downloads, or cloud storage.
                  </Text>
                </View>
              </>
            )}
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.secondaryButton, isPasting && styles.disabledButton]}
              onPress={handlePasteFromClipboard}
              disabled={isPasting || isImporting || isPickingFile}
            >
              {isPasting ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <ClipboardIcon size={FontSize.md} color={Colors.text} />
                  <Text style={styles.secondaryButtonText}>Paste CSV</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, isPreviewing && styles.disabledButton]}
              onPress={handlePreview}
              disabled={isPreviewing || isImporting || isPickingFile}
            >
              {isPreviewing ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Upload size={FontSize.md} color={Colors.text} />
                  <Text style={styles.secondaryButtonText}>
                    {preview ? 'Refresh Preview' : 'Preview Import'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>CSV text</Text>
            <Text style={styles.inputHint}>
              Picking a file loads it here automatically. Expected columns include Date, Meal, Food Name, Calories, Protein, Carbs, Fat, and Serving.
            </Text>
            {selectedFileName ? (
              <View style={styles.fileChip}>
                <Text style={styles.fileChipLabel}>Loaded file</Text>
                <Text style={styles.fileChipName} numberOfLines={1}>
                  {selectedFileName}
                </Text>
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              value={csvText}
              onChangeText={handleTextChange}
              placeholder="Choose or paste your MyFitnessPal diary CSV here..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {preview ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View>
                  <Text style={styles.previewTitle}>Import Preview</Text>
                  <Text style={styles.previewRange}>
                    {formatDateLabel(preview.summary.startDate)} to {formatDateLabel(preview.summary.endDate)}
                  </Text>
                </View>
                <View style={styles.previewBadge}>
                  <CheckCircle2 size={FontSize.md} color={Colors.success} />
                  <Text style={styles.previewBadgeText}>Ready</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <StatCard label="Entries" value={String(preview.summary.entryCount)} />
                <StatCard label="Days" value={String(preview.summary.dayCount)} />
                <StatCard label="Meals" value={String(preview.summary.mealCount)} />
                <StatCard label="Foods" value={String(preview.summary.uniqueFoodCount)} />
              </View>

              {preview.summary.skippedCount > 0 ? (
                <Text style={styles.previewFootnote}>
                  {preview.summary.skippedCount} row{preview.summary.skippedCount === 1 ? '' : 's'} will be skipped because they look like totals or empty lines.
                </Text>
              ) : null}
            </View>
          ) : null}

          <Pressable
            style={[
              styles.primaryButton,
              (!csvText.trim() || isImporting) && styles.disabledPrimaryButton,
            ]}
            onPress={handleImport}
            disabled={!csvText.trim() || isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <>
                <Upload size={FontSize.md} color={Colors.background} />
                <Text style={styles.primaryButtonText}>
                  {preview ? 'Import Diary' : 'Parse and Import'}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.warningSoft,
    borderWidth: 1,
    borderColor: Colors.warningGlow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceGlass,
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  infoText: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  filePickerCopy: {
    flex: 1,
    gap: 2,
  },
  filePickerTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  filePickerHint: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  disabledButton: {
    opacity: 0.6,
  },
  inputCard: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  inputHint: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  fileChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginBottom: Spacing.md,
    maxWidth: '100%',
  },
  fileChipLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fileChipName: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  input: {
    minHeight: 220,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  previewCard: {
    backgroundColor: Colors.successSoft,
    borderWidth: 1,
    borderColor: Colors.successGlow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  previewTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  previewRange: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceGlass,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  previewBadgeText: {
    color: Colors.success,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  statValue: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  previewFootnote: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    marginBottom: Spacing.xl,
  },
  disabledPrimaryButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});

export default function ImportMyFitnessPalScreen(props) {
  return (
    <ScreenErrorBoundary screenName="ImportMyFitnessPalScreen">
      <ImportMyFitnessPalScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}
