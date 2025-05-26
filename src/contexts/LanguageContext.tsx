
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type Language = "en" | "hi"; // English and Hindi

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translate: (translations: Record<string, string> | Record<Language, string>) => string; // Allow general string keys for partial translations
  isLanguageInitialized: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en"); // Default to English
  const [isLanguageInitialized, setIsLanguageInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    const storedLanguage = localStorage.getItem("HisabKaro-language") as Language | null;
    let initialLanguage: Language = "en"; // Default to English

    if (storedLanguage && (storedLanguage === "en" || storedLanguage === "hi")) {
      initialLanguage = storedLanguage;
    }
    // No need to check window.navigator.language for this basic setup
    
    setLanguageState(initialLanguage);
    setIsLanguageInitialized(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
        localStorage.setItem("HisabKaro-language", lang);
    }
  }, []);

  const translate = useCallback((translations: Record<string, string> | Record<Language, string>): string => {
    const langTypedTranslations = translations as Record<Language, string>;
    if (langTypedTranslations[language]) {
      return langTypedTranslations[language];
    }
    if (langTypedTranslations["en"]) {
      return langTypedTranslations["en"]; // Fallback to English
    }
    // Fallback for untranslated simple strings or if only 'en' is provided
    if (typeof translations === 'string') return translations; 
    return Object.values(translations)[0] || ""; // Fallback to the first available translation or empty string
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, isLanguageInitialized }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
