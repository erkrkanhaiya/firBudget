
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isThemeInitialized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyThemeClass = (theme: Theme) => {
  if (typeof window !== 'undefined') {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isThemeInitialized, setIsThemeInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    const storedTheme = localStorage.getItem("HisabKaro-theme") as Theme | null;
    const initialTheme: Theme = storedTheme ?? "dark";
    
    setTheme(initialTheme);
    applyThemeClass(initialTheme);
    setIsThemeInitialized(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      localStorage.setItem("HisabKaro-theme", newTheme);
      applyThemeClass(newTheme);
      return newTheme;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isThemeInitialized }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
