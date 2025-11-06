import { getLocales } from 'expo-localization';
import i18n from '../translations/i18n';

/**
 * Debug utility to check translation setup
 * Call this function to see what language is detected and active
 */
export const debugTranslations = () => {
  console.log('=== Translation Debug Info ===');
  
  try {
    const locales = getLocales();
    
    console.log('Device Locales:');
    locales.forEach((locale, index) => {
      console.log(`  ${index + 1}. Language: ${locale.languageCode}, Region: ${locale.regionCode}`);
    });
    
    console.log(`\nCurrent i18n locale: ${i18n.locale}`);
    console.log(`Default locale: ${i18n.defaultLocale}`);
    console.log(`Fallback enabled: ${i18n.enableFallback}`);
    
    console.log('\nAvailable translations:');
    Object.keys(i18n.translations).forEach(lang => {
      console.log(`  - ${lang}`);
    });
    
    // Test a translation
    const testKey = 'welcomeToCoachMate';
    const translation = i18n.t(testKey);
    console.log(`\nTest translation for "${testKey}": ${translation}`);
    
  } catch (error) {
    console.error('Error in debug translations:', error);
  }
  
  console.log('=== End Debug Info ===\n');
};

/**
 * Get a summary of the current translation state
 */
export const getTranslationState = () => {
  const locales = getLocales();
  
  return {
    deviceLanguage: locales[0]?.languageCode || 'unknown',
    activeLocale: i18n.locale,
    supportedLanguages: Object.keys(i18n.translations),
    isUsingFallback: i18n.locale !== locales[0]?.languageCode
  };
};
