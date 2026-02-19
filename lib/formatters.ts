import i18next from 'i18next';

const getLocale = (): string => {
  const lng = i18next.language || 'en';
  const localeMap: Record<string, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    pt: 'pt-BR',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    ar: 'ar-SA',
    hi: 'hi-IN',
  };
  return localeMap[lng] || 'en-US';
};

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCalories(value: number): string {
  return `${formatNumber(Math.round(value))} ${i18next.t('units.kcal')}`;
}

export function formatWeight(value: number, unit: 'kg' | 'lbs' = 'kg'): string {
  const formatted = formatNumber(value, 1);
  const unitLabel = i18next.t(`units.${unit}`);
  return `${formatted} ${unitLabel}`;
}

export function formatDate(date: Date, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'numeric', day: 'numeric' } as Intl.DateTimeFormatOptions,
    medium: { month: 'short', day: 'numeric', year: 'numeric' } as Intl.DateTimeFormatOptions,
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } as Intl.DateTimeFormatOptions,
  }[style];

  return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}${i18next.t('time.minuteShort')}`;
  if (mins === 0) return `${hrs}${i18next.t('time.hourShort')}`;
  return `${hrs}${i18next.t('time.hourShort')} ${mins}${i18next.t('time.minuteShort')}`;
}

export function formatPercentage(value: number, decimals = 0): string {
  return new Intl.NumberFormat(getLocale(), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}
