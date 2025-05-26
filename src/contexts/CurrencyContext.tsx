
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Currency } from '@/types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  getCurrencySymbol: () => string;
  isCurrencyInitialized: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>('USD'); // Default to USD
  const [isCurrencyInitialized, setIsCurrencyInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    const storedCurrency = localStorage.getItem("balancebeam-currency") as Currency | null;
    let initialCurrency: Currency = 'USD'; // Default to USD

    if (storedCurrency && (storedCurrency === "USD" || storedCurrency === "INR")) {
      initialCurrency = storedCurrency;
    }
    
    setCurrencyState(initialCurrency);
    setIsCurrencyInitialized(true);
  }, []);

  const setCurrency = useCallback((curr: Currency) => {
    setCurrencyState(curr);
    if (typeof window !== 'undefined') {
        localStorage.setItem("balancebeam-currency", curr);
    }
  }, []);

  const getCurrencySymbol = useCallback((): string => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'INR':
        return '₹';
      default:
        return '$';
    }
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, getCurrencySymbol, isCurrencyInitialized }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
