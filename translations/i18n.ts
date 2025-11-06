import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en from './en';
import fi from './fi';
import sv from './sv';

const i18n = new I18n({
  en,
  fi,
  sv
});

// Set defaults first
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Get device language and set locale
const getDeviceLanguage = () => {
  try {
    const locales = getLocales();
    
    // Get the first locale's language code
    if (locales && locales.length > 0) {
      const languageCode = locales[0].languageCode;
      
      if (languageCode) {
        const normalizedCode = languageCode.toLowerCase();
        
        // Check if we have translations for this language
        const supportedLanguages = Object.keys(i18n.translations);
        
        if (supportedLanguages.includes(normalizedCode)) {
          console.log(`Setting locale to device language: ${normalizedCode}`);
          return normalizedCode;
        }
      }
    }
    
    console.log('Device language not supported, defaulting to English');
    return 'en';
  } catch (error) {
    console.warn('Failed to detect device language, defaulting to English:', error);
    return 'en';
  }
};

i18n.locale = getDeviceLanguage();

export default i18n;