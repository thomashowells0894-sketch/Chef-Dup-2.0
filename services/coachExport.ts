import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

declare const __DEV__: boolean;

interface CoachExportData {
  period: { start: string; end: string };
  summary: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    adherenceRate: number;
    daysLogged: number;
    totalDays: number;
  };
  dailyLogs: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    notes: string;
  }>;
  weightHistory: Array<{
    date: string;
    weight: number;
    unit: string;
  }>;
  insights: string[];
}

export async function generateCoachReport(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<CoachExportData | null> {
  try {
    // Fetch food logs
    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    // Fetch weight entries
    const { data: weights } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (!foodLogs) return null;

    // Aggregate daily totals
    const dailyMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number; count: number }>();

    for (const log of foodLogs) {
      const existing = dailyMap.get(log.date) || { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      existing.calories += log.calories || 0;
      existing.protein += log.protein || 0;
      existing.carbs += log.carbs || 0;
      existing.fat += log.fat || 0;
      existing.count += 1;
      dailyMap.set(log.date, existing);
    }

    const dailyLogs = Array.from(dailyMap.entries()).map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      water: 0,
      notes: '',
    }));

    const daysLogged = dailyLogs.length;
    const totalDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      period: { start: startDate, end: endDate },
      summary: {
        avgCalories: Math.round(avg(dailyLogs.map(d => d.calories))),
        avgProtein: Math.round(avg(dailyLogs.map(d => d.protein))),
        avgCarbs: Math.round(avg(dailyLogs.map(d => d.carbs))),
        avgFat: Math.round(avg(dailyLogs.map(d => d.fat))),
        adherenceRate: Math.round((daysLogged / totalDays) * 100),
        daysLogged,
        totalDays,
      },
      dailyLogs,
      weightHistory: (weights || []).map(w => ({
        date: w.date,
        weight: w.weight,
        unit: w.unit || 'lbs',
      })),
      insights: [],
    };
  } catch (err) {
    if (__DEV__) console.error('[CoachExport] Error:', err);
    return null;
  }
}

export async function exportCoachReportAsCSV(data: CoachExportData): Promise<string | null> {
  try {
    const lines = [
      'Date,Calories,Protein (g),Carbs (g),Fat (g)',
      ...data.dailyLogs.map(d =>
        `${d.date},${d.calories},${d.protein},${d.carbs},${d.fat}`
      ),
    ];

    const csvContent = lines.join('\n');
    const filePath = `${FileSystem.documentDirectory}fueliq-coach-report.csv`;
    await FileSystem.writeAsStringAsync(filePath, csvContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Coach Report',
      });
    }

    return filePath;
  } catch (err) {
    if (__DEV__) console.error('[CoachExport] CSV error:', err);
    return null;
  }
}
