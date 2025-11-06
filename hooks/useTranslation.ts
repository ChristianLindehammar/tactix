import { useCallback, useState, useEffect } from 'react';
import i18n from '../translations/i18n';

export const useTranslation = () => {
  // Force re-render when locale changes (for future locale switching feature)
  const [locale, setLocale] = useState(i18n.locale);

  const t = useCallback((key: string, options?: object) => {
    const translation = i18n.t(key, options);
    
    // Log missing translations in development
    if (__DEV__ && translation === key) {
      console.warn(`Missing translation for key: "${key}" in locale: "${i18n.locale}"`);
    }
    
    return translation;
  }, [locale]);

  const changeLanguage = useCallback((newLocale: string) => {
    const supportedLanguages = Object.keys(i18n.translations);
    
    if (supportedLanguages.includes(newLocale)) {
      i18n.locale = newLocale;
      setLocale(newLocale);
      console.log(`Language changed to: ${newLocale}`);
    } else {
      console.warn(`Language "${newLocale}" not supported. Available: ${supportedLanguages.join(', ')}`);
    }
  }, []);

  const getCurrentLocale = useCallback(() => {
    return i18n.locale;
  }, [locale]);

  const getAvailableLocales = useCallback(() => {
    return Object.keys(i18n.translations);
  }, []);

  return { 
    t, 
    locale,
    changeLanguage,
    getCurrentLocale,
    getAvailableLocales
  };
};