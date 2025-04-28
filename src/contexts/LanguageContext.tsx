
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Define supported languages
export type Language = "en" | "ar" | "fr";

// Context props
type LanguageContextProps = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

// Create the context with default values
const LanguageContext = createContext<LanguageContextProps>({
  language: "en",
  setLanguage: () => {},
  t: () => "",
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

  // Update document language and direction
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("language", language);
  }, [language]);

  // Translation function
  const t = (key: string): string => {
    const translation = translations[language];
    return key.split(".").reduce((obj, k) => obj?.[k] || key, translation as any);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook for using the language context
export const useLanguage = () => useContext(LanguageContext);
