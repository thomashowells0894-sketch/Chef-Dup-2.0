import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Sentry } from '../lib/sentry';

const STORAGE_KEY = '@fueliq_food_quality_reports';
const MAX_LOCAL_REPORTS = 200;

export interface FoodQualityReportInput {
  reason: 'incorrect_nutrition';
  name: string;
  brand?: string | null;
  barcode?: string | null;
  serving?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  source?: string | null;
  sourceLabel?: string | null;
  reportedBy?: string | null;
}

interface StoredFoodQualityReport extends FoodQualityReportInput {
  id: string;
  createdAt: string;
  deliveryStatus: 'queued' | 'submitted';
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadReports(): Promise<StoredFoodQualityReport[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    Sentry.captureException(error);
    return [];
  }
}

async function saveReports(reports: StoredFoodQualityReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(reports.slice(-MAX_LOCAL_REPORTS)),
    );
  } catch (error) {
    Sentry.captureException(error);
  }
}

export async function submitFoodQualityReport(
  input: FoodQualityReportInput,
): Promise<{ success: boolean; queued: boolean }> {
  const report: StoredFoodQualityReport = {
    ...input,
    id: createId(),
    createdAt: new Date().toISOString(),
    deliveryStatus: 'queued',
  };

  const existing = await loadReports();
  existing.push(report);
  await saveReports(existing);

  const reportExtras: Record<string, unknown> = { ...report };
  Sentry.captureMessage('food_quality_report', {
    level: 'warning',
    extra: reportExtras,
  });

  try {
    if (input.reportedBy) {
      const { error } = await supabase
        .from('food_quality_reports')
        .insert({
          report_id: report.id,
          reason: report.reason,
          name: report.name,
          brand: report.brand || null,
          barcode: report.barcode || null,
          serving: report.serving || null,
          calories: report.calories ?? null,
          protein: report.protein ?? null,
          carbs: report.carbs ?? null,
          fat: report.fat ?? null,
          source: report.source || null,
          source_label: report.sourceLabel || null,
          reporter_id: report.reportedBy,
          created_at: report.createdAt,
        });

      if (!error) {
        report.deliveryStatus = 'submitted';
        await saveReports(existing);
        return { success: true, queued: false };
      }
    }
  } catch (error) {
    Sentry.captureException(error);
  }

  return { success: true, queued: true };
}
