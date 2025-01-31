import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './en';
import fi from './fi';
import sv from './sv';

const i18n = new I18n({
  en,
  fi,
  sv
});

try {
  // Get device locale, strip region code, fallback to 'en'
  const locale = (Localization.locale?.split('-')[0] || 'en').toLowerCase();
  
  if (Object.keys(i18n.translations).includes(locale)) {
    i18n.locale = locale;
  } else {
    i18n.locale = 'en';
  }
} catch (error) {
  console.warn('Locale detection failed, defaulting to en:', error);
  i18n.locale = 'en';
}

// Ensure fallbacks
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

export default i18n;