
import { translations } from '../contexts/LanguageContext';

type TranslationKey = keyof typeof translations.en;

// Utility to check for missing translations
export const findMissingTranslations = () => {
  const englishKeys = Object.keys(translations.en) as TranslationKey[];
  const arabicKeys = Object.keys(translations.ar) as TranslationKey[];
  
  const missingInArabic = englishKeys.filter(key => !arabicKeys.includes(key));
  const missingInEnglish = arabicKeys.filter(key => !englishKeys.includes(key));
  
  return {
    missingInArabic,
    missingInEnglish,
    totalEnglishKeys: englishKeys.length,
    totalArabicKeys: arabicKeys.length,
    completionPercentage: Math.round((arabicKeys.length / englishKeys.length) * 100)
  };
};

// Utility to validate translation structure
export const validateTranslations = () => {
  const results = findMissingTranslations();
  
  if (results.missingInArabic.length > 0) {
    console.warn('Missing Arabic translations:', results.missingInArabic);
  }
  
  if (results.missingInEnglish.length > 0) {
    console.warn('Missing English translations:', results.missingInEnglish);
  }
  
  console.log(`Translation completion: ${results.completionPercentage}%`);
  console.log(`English keys: ${results.totalEnglishKeys}, Arabic keys: ${results.totalArabicKeys}`);
  
  return results;
};

// Utility to test RTL layout
export const testRTLLayout = () => {
  const isRTL = document.documentElement.dir === 'rtl';
  const hasRTLClass = document.body.classList.contains('rtl');
  
  console.log('RTL Layout Test:', {
    documentDirection: document.documentElement.dir,
    bodyHasRTLClass: hasRTLClass,
    isRTLActive: isRTL,
    language: document.documentElement.lang
  });
  
  // Test common RTL issues
  const elementsToTest = [
    'input',
    'textarea',
    'select',
    '[role="dialog"]',
    '.dropdown-menu',
    '.tooltip'
  ];
  
  elementsToTest.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`${selector}: ${elements.length} elements found`);
    }
  });
  
  return {
    isRTL,
    hasRTLClass,
    elementsFound: elementsToTest.map(selector => ({
      selector,
      count: document.querySelectorAll(selector).length
    }))
  };
};

// Development helper to add translation key debug info
export const addTranslationDebugInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    // Add data attributes to help identify translation keys
    const addDebugAttribute = (element: Element, key: string) => {
      element.setAttribute('data-translation-key', key);
    };
    
    // This would be used with a custom t() function that tracks usage
    return addDebugAttribute;
  }
  return () => {};
};

// Export for console usage during development
if (process.env.NODE_ENV === 'development') {
  (window as any).translationUtils = {
    findMissingTranslations,
    validateTranslations,
    testRTLLayout,
    addTranslationDebugInfo
  };
}
