const UNIT_ALIASES = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
};

const UNIT_META = {
  g: { selectorLabel: 'Grams', shortLabel: 'g' },
  ml: { selectorLabel: 'Milliliters', shortLabel: 'ml' },
  oz: { selectorLabel: 'Ounces', shortLabel: 'oz' },
  lb: { selectorLabel: 'Pounds', shortLabel: 'lb' },
  kg: { selectorLabel: 'Kilograms', shortLabel: 'kg' },
};

export const DEFAULT_SERVING_QUICK_AMOUNTS = [
  { amount: '0.5', label: '½' },
  { amount: '1', label: '1' },
  { amount: '1.5', label: '1½' },
  { amount: '2', label: '2' },
];

function formatNumeric(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (Math.abs(value) >= 100) {
    return String(Math.round(value));
  }

  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function normalizeMeasureUnit(unit) {
  if (!unit) {
    return null;
  }

  const normalized = String(unit).trim().toLowerCase().replace(/\./g, '');
  return UNIT_ALIASES[normalized] || null;
}

function inferMeasureUnit(serving) {
  if (typeof serving !== 'string') {
    return null;
  }

  const match = serving
    .trim()
    .toLowerCase()
    .match(/\d+(?:\.\d+)?\s*(g|grams?|ml|milliliters?|oz|ounces?|lb|lbs|pounds?|kg|kilograms?)/i);

  return normalizeMeasureUnit(match?.[1]);
}

function roundMeasureAmount(value, unitKey) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  let step = 1;
  if (unitKey === 'g' || unitKey === 'ml') {
    step = value >= 100 ? 10 : value >= 20 ? 5 : 1;
  } else if (unitKey === 'oz') {
    step = 0.25;
  } else if (unitKey === 'lb' || unitKey === 'kg') {
    step = 0.1;
  }

  return Math.max(step, Math.round(value / step) * step);
}

export function getFoodMeasurementOption(food) {
  if (!food) {
    return null;
  }

  const baseAmount = Number(food.servingSize);
  const unitKey = normalizeMeasureUnit(food.servingUnit) || inferMeasureUnit(food.serving);

  if (!Number.isFinite(baseAmount) || baseAmount <= 0 || !unitKey) {
    return null;
  }

  return {
    ...UNIT_META[unitKey],
    unitKey,
    baseAmount,
  };
}

export function calculateFoodDetailValues(baseValues, quantity, unit, measurementOption) {
  const qty = parseFloat(String(quantity)) || 0;
  const multiplier = (
    unit === 'measure' && measurementOption?.baseAmount
      ? qty / measurementOption.baseAmount
      : qty
  );

  return {
    calories: Math.round((baseValues.calories || 0) * multiplier),
    protein: Math.round((baseValues.protein || 0) * multiplier * 10) / 10,
    carbs: Math.round((baseValues.carbs || 0) * multiplier * 10) / 10,
    fat: Math.round((baseValues.fat || 0) * multiplier * 10) / 10,
    quantity: qty,
    multiplier,
  };
}

export function convertFoodDetailQuantity(quantity, fromUnit, toUnit, measurementOption) {
  const qty = parseFloat(String(quantity)) || 1;

  if (!measurementOption || fromUnit === toUnit) {
    return formatNumeric(qty);
  }

  if (fromUnit === 'serving' && toUnit === 'measure') {
    return formatNumeric(qty * measurementOption.baseAmount);
  }

  if (fromUnit === 'measure' && toUnit === 'serving') {
    return formatNumeric(qty / measurementOption.baseAmount);
  }

  return formatNumeric(qty);
}

export function buildMeasureQuickAmounts(measurementOption) {
  if (!measurementOption) {
    return [];
  }

  return [0.5, 1, 1.5, 2].map((multiplier) => {
    const value = roundMeasureAmount(measurementOption.baseAmount * multiplier, measurementOption.unitKey);
    return {
      amount: formatNumeric(value),
      label: `${formatNumeric(value)}${measurementOption.shortLabel}`,
    };
  });
}

