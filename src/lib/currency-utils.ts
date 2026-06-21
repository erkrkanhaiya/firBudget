import type { Currency } from '@/types';

function getLocaleForCurrency(currency: Currency): string {
  return currency === 'INR' ? 'en-IN' : 'en-US';
}

export function formatCurrencyAmount(
  amount: number,
  currency: Currency,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options ?? {};
  return new Intl.NumberFormat(getLocaleForCurrency(currency), {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function formatCurrencyDisplay(
  amount: number,
  symbol: string,
  currency: Currency
): string {
  return `${symbol}${formatCurrencyAmount(amount, currency)}`;
}
