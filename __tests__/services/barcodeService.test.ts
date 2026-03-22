import {
  clearBarcodeCache as clearServiceBarcodeCache,
  lookupBarcode,
  rememberBarcodeCorrection,
} from '../../services/barcodeService';
import { clearBarcodeCache as clearFastBarcodeCache } from '../../lib/barcodeCache';

describe('barcodeService corrections', () => {
  beforeEach(async () => {
    await clearServiceBarcodeCache();
    await clearFastBarcodeCache();
  });

  it('returns remembered corrected barcode matches from cache before external lookup', async () => {
    await rememberBarcodeCorrection('50 12345 67890', {
      name: 'Greek Yogurt',
      brand: 'Fage',
      calories: 120,
      protein: 17,
      carbs: 6,
      fat: 0,
      serving: '170g',
      canonicalId: 'greek-yogurt',
      sourceLabel: 'Saved correction',
    });

    const result = await lookupBarcode('501234567890');

    expect(result).toMatchObject({
      found: true,
      source: 'user_corrected',
      wasCached: true,
      food: expect.objectContaining({
        name: 'Greek Yogurt',
        canonicalId: 'greek-yogurt',
        sourceLabel: 'Saved correction',
        serving: '170g',
      }),
    });
  });
});
