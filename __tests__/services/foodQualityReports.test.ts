import AsyncStorage from '@react-native-async-storage/async-storage';

const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({
  insert: mockInsert,
}));
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock('../../lib/sentry', () => ({
  Sentry: {
    captureException: (...args: unknown[]) => mockCaptureException(...args),
    captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  },
}));

import { submitFoodQualityReport } from '../../services/foodQualityReports';

describe('food quality reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mockInsert.mockResolvedValue({ error: null });
  });

  it('stores a queued report locally when no reporter id is available', async () => {
    const result = await submitFoodQualityReport({
      reason: 'incorrect_nutrition',
      name: 'Protein Bar',
      barcode: '1234567890123',
      calories: 220,
      protein: 20,
      carbs: 18,
      fat: 7,
      sourceLabel: 'Open Food Facts',
      reportedBy: null,
    });

    expect(result).toEqual({ success: true, queued: true });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'food_quality_report',
      expect.objectContaining({ level: 'warning' })
    );

    const [, savedPayload] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    expect(JSON.parse(savedPayload)).toEqual([
      expect.objectContaining({
        name: 'Protein Bar',
        deliveryStatus: 'queued',
        sourceLabel: 'Open Food Facts',
      }),
    ]);
  });

  it('marks the report submitted when the remote insert succeeds', async () => {
    const result = await submitFoodQualityReport({
      reason: 'incorrect_nutrition',
      name: 'Greek Yogurt',
      brand: 'FuelIQ',
      serving: '170 g',
      calories: 150,
      protein: 15,
      carbs: 12,
      fat: 4,
      source: 'usda',
      sourceLabel: 'USDA',
      reportedBy: 'user-123',
    });

    expect(result).toEqual({ success: true, queued: false });
    expect(mockFrom).toHaveBeenCalledWith('food_quality_reports');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Greek Yogurt',
        brand: 'FuelIQ',
        serving: '170 g',
        source: 'usda',
        source_label: 'USDA',
        reporter_id: 'user-123',
      })
    );

    const lastSavedPayload = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)[1];
    expect(JSON.parse(lastSavedPayload)).toEqual([
      expect.objectContaining({
        name: 'Greek Yogurt',
        deliveryStatus: 'submitted',
      }),
    ]);
  });
});
