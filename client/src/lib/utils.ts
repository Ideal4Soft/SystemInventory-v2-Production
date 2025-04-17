import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number to currency with locale
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "٠٫٠٠ ج.م";
  
  // Format using Intl.NumberFormat with Arabic locale and ensure consistent decimal separator
  const formatted = new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  // Add the currency suffix
  return `${formatted} ج.م`;
}

// Format date to local format
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return String(date);
  }
}

// Format datetime to local format
export function formatDateTime(date?: Date | string): string {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

// Generate a random string ID
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// Delay execution (for UI effects)
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Filter object by keys
export function filterObject(obj: Record<string, any>, keysToKeep: string[]): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => keysToKeep.includes(key))
  );
}

// Deep clone an object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Check if a value is empty (null, undefined, empty string, empty array, empty object)
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// Check if two objects are equal
export function isEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Convert Arabic numerals to English numerals
export function arabicToEnglishNumbers(str: string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  return str.split('').map(c => {
    const index = arabicNumbers.indexOf(c);
    return index !== -1 ? englishNumbers[index] : c;
  }).join('');
}

// Convert English numerals to Arabic numerals
export function englishToArabicNumbers(str: string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  return str.split('').map(c => {
    const index = englishNumbers.indexOf(c);
    return index !== -1 ? arabicNumbers[index] : c;
  }).join('');
}
