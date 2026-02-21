import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert } from 'react-native';
import { format } from 'date-fns';

interface FoodEntry {
  name?: string;
  serving?: string;
  servingSize?: number | string;
  servingUnit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface DayMeals {
  breakfast?: FoodEntry[];
  lunch?: FoodEntry[];
  dinner?: FoodEntry[];
  snacks?: FoodEntry[];
}

interface DayRecord {
  meals?: DayMeals;
  totals?: Record<string, number>;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface DailyDataEntry {
  date?: string;
  day?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  goal?: number;
}

interface WeeklyStats {
  avgCalories?: number;
  avgProtein?: number;
  daysTracked?: number;
  totalCalories?: number;
  totalProtein?: number;
}

interface Goals {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface WeekData {
  dailyData: DailyDataEntry[];
  stats?: WeeklyStats;
  streak?: number;
  goals?: Goals;
}

interface UserProfile {
  weight?: number;
  weightUnit?: string;
  [key: string]: unknown;
}

/**
 * Export food diary data as a CSV file and open the share dialog.
 *
 * @param dayData - The dayData object from MealContext keyed by date string.
 *                  Each value has { meals: { breakfast:[], lunch:[], dinner:[], snacks:[] }, totals }
 * @param dateRange - Start and end dates for the export range.
 * @returns true on success, false on failure.
 */
export async function exportFoodDiaryCSV(dayData: Record<string, DayRecord>, dateRange: DateRange): Promise<boolean> {
  try {
    if (!dayData || Object.keys(dayData).length === 0) {
      Alert.alert('No Data', 'There is no food diary data to export.');
      return false;
    }

    const { start, end } = dateRange;
    const csvHeader: string = 'Date,Meal,Food Name,Calories,Protein (g),Carbs (g),Fat (g),Serving\n';
    let csvRows: string = '';

    // Iterate through each day in the date range
    const current: Date = new Date(start);
    const endDate: Date = new Date(end);
    while (current <= endDate) {
      const dateKey: string = format(current, 'yyyy-MM-dd');
      const day: DayRecord | undefined = dayData[dateKey];

      if (day && day.meals) {
        const mealTypes: (keyof DayMeals)[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
        for (const mealType of mealTypes) {
          const items: FoodEntry[] = day.meals[mealType] || [];
          for (const item of items) {
            // Escape fields that might contain commas or quotes
            const foodName: string = escapeCSV(item.name || 'Unknown');
            const serving: string = escapeCSV(item.serving || item.servingSize ? `${item.servingSize || ''} ${item.servingUnit || ''}`.trim() : '1 serving');
            const mealLabel: string = mealType.charAt(0).toUpperCase() + mealType.slice(1);

            csvRows += `${dateKey},${mealLabel},${foodName},${item.calories || 0},${item.protein || 0},${item.carbs || 0},${item.fat || 0},${serving}\n`;
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    if (!csvRows) {
      Alert.alert('No Data', 'No food entries found in the selected date range.');
      return false;
    }

    const csvContent: string = csvHeader + csvRows;
    const startLabel: string = format(start, 'yyyy-MM-dd');
    const endLabel: string = format(end, 'yyyy-MM-dd');
    const fileName: string = `FuelIQ_FoodDiary_${startLabel}_to_${endLabel}.csv`;
    const filePath: string = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isSharingAvailable: boolean = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return false;
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Food Diary',
      UTI: 'public.comma-separated-values-text',
    });

    return true;
  } catch (error: unknown) {
    console.error('CSV export error:', error);
    Alert.alert('Export Failed', 'An error occurred while exporting your food diary. Please try again.');
    return false;
  }
}

/**
 * Export a weekly summary report as a PDF file and open the share dialog.
 *
 * @param weekData - Object containing dailyData, stats, streak, and goals
 * @param profile - The user profile from ProfileContext.
 * @returns true on success, false on failure.
 */
export async function exportWeeklySummaryPDF(weekData: WeekData, profile: UserProfile | null): Promise<boolean> {
  try {
    if (!weekData || !weekData.dailyData || weekData.dailyData.length === 0) {
      Alert.alert('No Data', 'There is no weekly data to export.');
      return false;
    }

    const { dailyData, stats, streak, goals } = weekData;

    // Determine date range from the daily data
    const dates: string[] = dailyData.map((d) => d.date).filter(Boolean) as string[];
    const dateRangeLabel: string = dates.length > 0
      ? `${formatDisplayDate(dates[0])} - ${formatDisplayDate(dates[dates.length - 1])}`
      : 'This Week';

    // Calculate macro averages for the pie chart
    const daysWithData: DailyDataEntry[] = dailyData.filter((d) => d.calories > 0);
    const avgProtein: number = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + (d.protein || 0), 0) / daysWithData.length)
      : 0;
    const avgCarbs: number = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + (d.carbs || 0), 0) / daysWithData.length)
      : 0;
    const avgFat: number = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + (d.fat || 0), 0) / daysWithData.length)
      : 0;

    // Total macro calories for pie chart proportions
    const proteinCals: number = avgProtein * 4;
    const carbsCals: number = avgCarbs * 4;
    const fatCals: number = avgFat * 9;
    const totalMacroCals: number = proteinCals + carbsCals + fatCals || 1;
    const proteinPct: number = Math.round((proteinCals / totalMacroCals) * 100);
    const carbsPct: number = Math.round((carbsCals / totalMacroCals) * 100);
    const fatPct: number = 100 - proteinPct - carbsPct;

    // Weight trend info
    const weightInfo: string = profile?.weight
      ? `<div class="stat-card">
           <div class="stat-value">${profile.weight} ${profile.weightUnit || 'lbs'}</div>
           <div class="stat-label">Current Weight</div>
         </div>`
      : '';

    // Build daily breakdown rows
    const dailyRows: string = dailyData.map((d) => {
      const cals: number = d.calories || 0;
      const goalVal: number = d.goal || goals?.calories || 2000;
      const diff: number = cals - goalVal;
      const diffClass: string = diff <= 0 ? 'positive' : 'negative';
      const diffLabel: string = diff <= 0 ? `${Math.abs(diff)} under` : `${diff} over`;
      return `
        <tr>
          <td>${formatDisplayDate(d.date) || d.day || '-'}</td>
          <td class="number">${cals.toLocaleString()}</td>
          <td class="number">${d.protein || 0}g</td>
          <td class="number ${diffClass}">${diffLabel}</td>
        </tr>`;
    }).join('');

    const html: string = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #FFFFFF;
      color: #1A1A2E;
      padding: 40px 32px;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #E8E8F0;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 800;
      color: #0A0A0C;
      letter-spacing: -0.5px;
    }
    .header .accent {
      color: #00A3CC;
    }
    .header .date-range {
      font-size: 14px;
      color: #6B6B73;
      margin-top: 6px;
    }
    .header .generated {
      font-size: 11px;
      color: #A0A0A8;
      margin-top: 4px;
    }

    .stats-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }
    .stat-card {
      flex: 1;
      min-width: 100px;
      background: #F4F7FA;
      border-radius: 12px;
      padding: 16px 12px;
      text-align: center;
      border: 1px solid #E8E8F0;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0A0A0C;
    }
    .stat-value.primary { color: #00A3CC; }
    .stat-value.success { color: #00C853; }
    .stat-value.warning { color: #FFA000; }
    .stat-label {
      font-size: 11px;
      color: #6B6B73;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1A1A2E;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E8E8F0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 13px;
    }
    thead th {
      background: #F4F7FA;
      color: #6B6B73;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 2px solid #E8E8F0;
    }
    thead th.number { text-align: right; }
    tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid #F0F0F5;
      color: #1A1A2E;
    }
    tbody td.number { text-align: right; font-variant-numeric: tabular-nums; }
    tbody td.positive { color: #00C853; font-weight: 600; }
    tbody td.negative { color: #FF5252; font-weight: 600; }
    tbody tr:last-child td { border-bottom: none; }

    .macro-section {
      margin-bottom: 28px;
    }
    .macro-chart {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .pie-container {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }
    .pie {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: conic-gradient(
        #FF6B9D 0deg ${proteinPct * 3.6}deg,
        #64D2FF ${proteinPct * 3.6}deg ${(proteinPct + carbsPct) * 3.6}deg,
        #FFD93D ${(proteinPct + carbsPct) * 3.6}deg 360deg
      );
    }
    .pie-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 64px;
      height: 64px;
      background: #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: #6B6B73;
    }
    .macro-legend {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 6px;
    }
    .legend-dot.protein { background: #FF6B9D; }
    .legend-dot.carbs { background: #64D2FF; }
    .legend-dot.fat { background: #FFD93D; }
    .legend-text {
      font-size: 13px;
      color: #1A1A2E;
    }
    .legend-value {
      font-weight: 700;
    }
    .legend-pct {
      color: #6B6B73;
      font-size: 12px;
      margin-left: 4px;
    }

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E8E8F0;
      text-align: center;
      font-size: 11px;
      color: #A0A0A8;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Fuel<span class="accent">IQ</span> Weekly Report</h1>
    <div class="date-range">${dateRangeLabel}</div>
    <div class="generated">Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value primary">${(stats?.avgCalories || 0).toLocaleString()}</div>
      <div class="stat-label">Avg Calories</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${avgProtein}g</div>
      <div class="stat-label">Avg Protein</div>
    </div>
    <div class="stat-card">
      <div class="stat-value success">${stats?.daysTracked || 0}</div>
      <div class="stat-label">Days Tracked</div>
    </div>
    <div class="stat-card">
      <div class="stat-value warning">${streak || 0}</div>
      <div class="stat-label">Day Streak</div>
    </div>
    ${weightInfo}
  </div>

  <div class="section-title">Daily Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th class="number">Calories</th>
        <th class="number">Protein</th>
        <th class="number">vs Goal</th>
      </tr>
    </thead>
    <tbody>
      ${dailyRows}
    </tbody>
  </table>

  <div class="macro-section">
    <div class="section-title">Average Macro Split</div>
    <div class="macro-chart">
      <div class="pie-container">
        <div class="pie"></div>
        <div class="pie-center">Macros</div>
      </div>
      <div class="macro-legend">
        <div class="legend-item">
          <div class="legend-dot protein"></div>
          <span class="legend-text">
            <span class="legend-value">${avgProtein}g</span> Protein
            <span class="legend-pct">(${proteinPct}%)</span>
          </span>
        </div>
        <div class="legend-item">
          <div class="legend-dot carbs"></div>
          <span class="legend-text">
            <span class="legend-value">${avgCarbs}g</span> Carbs
            <span class="legend-pct">(${carbsPct}%)</span>
          </span>
        </div>
        <div class="legend-item">
          <div class="legend-dot fat"></div>
          <span class="legend-text">
            <span class="legend-value">${avgFat}g</span> Fat
            <span class="legend-pct">(${fatPct}%)</span>
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    FuelIQ &mdash; Your AI-powered fitness companion
  </div>
</body>
</html>`;

    const { uri } = await Print.printToFileAsync({ html });

    const isSharingAvailable: boolean = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return false;
    }

    // Move to a friendlier filename
    const startDate: string = dates[0] || format(new Date(), 'yyyy-MM-dd');
    const endDate: string = dates[dates.length - 1] || format(new Date(), 'yyyy-MM-dd');
    const pdfFileName: string = `FuelIQ_WeeklyReport_${startDate}_to_${endDate}.pdf`;
    const newUri: string = `${FileSystem.cacheDirectory}${pdfFileName}`;

    await FileSystem.moveAsync({ from: uri, to: newUri });

    await Sharing.shareAsync(newUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Weekly Report',
      UTI: 'com.adobe.pdf',
    });

    return true;
  } catch (error: unknown) {
    console.error('PDF export error:', error);
    Alert.alert('Export Failed', 'An error occurred while generating your report. Please try again.');
    return false;
  }
}

// --- Helpers ---

function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const str: string = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const parts: string[] = dateStr.split('-');
    const date: Date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return format(date, 'MMM d');
  } catch {
    return dateStr;
  }
}
