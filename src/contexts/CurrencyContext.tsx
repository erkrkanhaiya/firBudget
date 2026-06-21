
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Currency } from '@/types';
import { formatCurrencyAmount, formatCurrencyDisplay } from '@/lib/currency-utils';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  getCurrencySymbol: () => string;
  formatAmount: (amount: number) => string;
  formatCurrency: (amount: number) => string;
  isCurrencyInitialized: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>('USD'); // Default to USD
  const [isCurrencyInitialized, setIsCurrencyInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    const storedCurrency = localStorage.getItem("HisabKaro-currency") as Currency | null;
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
        localStorage.setItem("HisabKaro-currency", curr);
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

  const formatAmount = useCallback(
    (amount: number) => formatCurrencyAmount(amount, currency),
    [currency]
  );

  const formatCurrency = useCallback(
    (amount: number) => formatCurrencyDisplay(amount, getCurrencySymbol(), currency),
    [currency, getCurrencySymbol]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, getCurrencySymbol, formatAmount, formatCurrency, isCurrencyInitialized }}>
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
