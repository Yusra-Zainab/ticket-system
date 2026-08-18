import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function sanitizeRichText(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

export const brandColors = {
  gradientStart: '#0284C7',
  gradientMiddle: '#06B6D4',
  gradientEnd: '#22D3EE',
  blue: '#0284C7',
  lightBlue: '#06B6D4',
  cyan: '#22D3EE',
};

export const typography = {
  heading: 'Satoshi',
  body: 'Geist',
  sizes: {
    display2xl: 'text-display-2xl',
    displayXl: 'text-display-xl',
    displayLg: 'text-display-lg',
    displayMd: 'text-display-md',
    displaySm: 'text-display-sm',
    display2sm: 'text-display-2sm',
    displayXs: 'text-display-xs',
  },
  weights: {
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
};
