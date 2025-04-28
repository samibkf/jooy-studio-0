
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Define supported languages
export type Language = "en" | "ar" | "fr";

// Context props
type LanguageContextProps = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
};

// Create the context with default values
const LanguageContext = createContext<LanguageContextProps>({
  language: "en",
  setLanguage: () => {},
  t: () => "",
  isRTL: false,
});

// Translation files
import en from "../translations/en";
import ar from "../translations/ar";
import fr from "../translations/fr";

const translations = {
  en,
  ar,
  fr,
};

// Provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get stored language or default to English
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    return savedLanguage && ["en", "ar", "fr"].includes(savedLanguage)
      ? savedLanguage
      : "en";
  });
  
  // Determine if current language is RTL
  const isRTL = language === "ar";

  // Update document language and direction
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    localStorage.setItem("language", language);
  }, [language, isRTL]);

  // Translation function
  const t = (key: string): string => {
    const translation = translations[language];
    return key.split(".").reduce((obj, k) => obj?.[k] || key, translation as any);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook for using the language context
export const useLanguage = () => useContext(LanguageContext);
