import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import pt from '../locales/pt.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import zh from '../locales/zh.json';
import ar from '../locales/ar.json';
import hi from '../locales/hi.json';
import it from '../locales/it.json';
import nl from '../locales/nl.json';
import sv from '../locales/sv.json';
import pl from '../locales/pl.json';
import tr from '../locales/tr.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  ja: { translation: ja },
  ko: { translation: ko },
  zh: { translation: zh },
  ar: { translation: ar },
  hi: { translation: hi },
  it: { translation: it },
  nl: { translation: nl },
  sv: { translation: sv },
  pl: { translation: pl },
  tr: { translation: tr },
};

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

i18next.use(initReactI18next).init({
  resources,
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

// Enable RTL for Arabic
i18next.on('languageChanged', (lng) => {
  const isRTL = lng === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    I18nManager.allowRTL(isRTL);
  }
});

/**
 * Helper function for translating keys outside of React components.
 * Inside components, prefer the useTranslation() hook from react-i18next.
 */
export function t(key: string, options?: object): string {
  return i18next.t(key, options as any) as string;
}

export default i18next;
