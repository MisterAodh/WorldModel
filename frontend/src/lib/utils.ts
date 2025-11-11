import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return 'N/A';
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  return `${num.toFixed(2)}%`;
}

