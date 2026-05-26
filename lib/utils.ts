import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const monthLabel = (m: number) =>
  [
    'leden',
    'únor',
    'březen',
    'duben',
    'květen',
    'červen',
    'červenec',
    'srpen',
    'září',
    'říjen',
    'listopad',
    'prosinec',
  ][m - 1] ?? '';

export function periodStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
